import { supabaseAsUser } from '../config/supabase.js';
import { MAX_COVER_BYTES } from '../config/gpx.config.js';
import { UUID_RE } from '../middlewares/validateTrailQuery.js';
import { discardTrailCover, publishTrailCover, stageTrailCover } from '../services/trailCovers.js';
import { getTrailById, isMissingColumn, toTrailFeature } from '../services/trailsService.js';

const TRAIL_TYPES = ['hiking', 'alpine', 'via_ferrata', 'trail_running'];
const DIFFICULTIES = ['T', 'E', 'EE', 'EEA'];
const DUPLICATE_MESSAGE = 'A similar public trail already exists.';
const UPLOAD_COLUMNS = 'id, name, difficulty, length_m, is_public, created_at';

function textField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validJpeg(cover) {
  if (cover?.mimetype !== 'image/jpeg') return false;
  const bytes = cover.buffer;
  return bytes.length >= 5
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
}

function duplicateResponse(res, error) {
  return res.status(409).json({ error: DUPLICATE_MESSAGE, existingTrailId: error.details });
}

function findOwnedUpload(db, id, ownerId) {
  return db.from('trails')
    .select('id, image_url')
    .eq('id', id)
    .eq('created_by', ownerId)
    .eq('source', 'gpx')
    .maybeSingle();
}

async function sendExistingUpload(res, db, id) {
  const trail = await getTrailById(id, db);
  if (!trail) return res.status(404).json({ error: 'Trail not found' });
  return res.json({ ...trail, geometry: { type: 'Point', coordinates: trail.properties.startPoint } });
}

async function discardCover(path) {
  try {
    await discardTrailCover(path);
  } catch (error) {
    console.warn('Could not remove an unused trail cover:', error.message);
  }
}

export async function createUploadedTrail(req, res) {
  const { uploadId, trailType, difficulty, isPublic } = req.body;
  const cover = req.files?.cover?.[0];
  const name = textField(req.body.name);
  const description = textField(req.body.description);
  if (typeof uploadId !== 'string' || !UUID_RE.test(uploadId)) {
    return res.status(400).json({ error: 'Invalid upload id.' });
  }
  const trailId = uploadId.toLowerCase();
  if (!name || name.length > 100 || name.includes('\0')) {
    return res.status(400).json({ error: 'Enter a trail name of up to 100 characters.' });
  }
  if (!description || description.length > 2000 || description.includes('\0')) {
    return res.status(400).json({ error: 'Enter a description of up to 2,000 characters.' });
  }
  if (!TRAIL_TYPES.includes(trailType) || !DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ error: 'Select an activity and difficulty.' });
  }
  if (isPublic !== 'true' && isPublic !== 'false') {
    return res.status(400).json({ error: 'Choose public or private visibility.' });
  }
  if (cover?.size > MAX_COVER_BYTES) {
    return res.status(413).json({ error: 'The JPEG cover must be 512 KB or smaller.' });
  }
  if (!validJpeg(cover)) {
    return res.status(400).json({ error: 'Choose a valid JPEG cover photo up to 512 KB.' });
  }

  const ownerId = req.user.id;
  const db = supabaseAsUser(req.token);
  const trail = req.gpxTrail;
  const [lng, lat] = trail.startPoint;
  const row = {
    id: trailId,
    name,
    description,
    trail_type: trailType,
    difficulty,
    is_public: isPublic === 'true',
    start_point: `SRID=4326;POINT(${lng} ${lat})`,
    route_geojson: trail.geometry,
    length_m: trail.lengthM,
    ascent_m: trail.ascentM,
    descent_m: trail.descentM,
    max_elevation_m: trail.highestM,
    est_duration_min: trail.durationMin,
    source: 'gpx',
    created_by: ownerId,
  };

  const { data: existing, error: lookupError } = await findOwnedUpload(db, trailId, ownerId);
  if (isMissingColumn(lookupError)) {
    return res.status(503).json({ error: 'GPX uploads are waiting for the database migration.' });
  }
  if (lookupError) throw lookupError;
  if (existing) {
    await publishTrailCover(existing.image_url);
    return sendExistingUpload(res, db, trailId);
  }

  // Each attempt stages its own photo. The row selects which file is used.
  row.image_url = await stageTrailCover(trailId, ownerId, cover.buffer);
  const { data, error, status } = await db.from('trails')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  if (error) {
    const statementCanceled = error.code === '57014';
    // A gateway timeout can arrive after the database saved the trail.
    if (error.code?.startsWith('23') || error.code === '42501' || isMissingColumn(error) || statementCanceled) {
      await discardCover(row.image_url);
    }
    if (error.code === '23505' && error.message === DUPLICATE_MESSAGE) return duplicateResponse(res, error);
    if (error.code === '23514' && error.message?.includes('trails_image_url_https')) {
      return res.status(503).json({ error: 'Trail cover paths are waiting for the database migration.' });
    }
    if (status === 504 || statementCanceled) {
      console.warn('GPX save timed out:', error.message);
      return res.status(504).json({ error: 'The server took too long to confirm the save. Try again from this dialog.' });
    }
    throw error;
  }
  if (!data) {
    await discardCover(row.image_url);
    const { data: ownTrail, error: readError } = await findOwnedUpload(db, trailId, ownerId);
    if (readError) throw readError;
    if (!ownTrail) return res.status(409).json({ error: 'This upload id is already in use.' });
    await publishTrailCover(ownTrail.image_url);
    return sendExistingUpload(res, db, trailId);
  }

  await publishTrailCover(row.image_url);
  return res.status(201).json(toTrailFeature({ ...row, lng, lat }));
}

export async function listUploadedTrails(req, res) {
  const { data, error } = await supabaseAsUser(req.token).from('trails')
    .select(UPLOAD_COLUMNS)
    .eq('created_by', req.user.id)
    .eq('source', 'gpx')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return res.set('Cache-Control', 'no-store').json(data ?? []);
}

export async function changeTrailVisibility(req, res) {
  const isPublic = req.body?.isPublic;
  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: 'Choose public or private visibility.' });
  }
  const { data, error } = await supabaseAsUser(req.token).from('trails')
    .update({ is_public: isPublic })
    .eq('id', req.params.id)
    .eq('created_by', req.user.id)
    .eq('source', 'gpx')
    .select(UPLOAD_COLUMNS)
    .maybeSingle();
  if (error?.code === '23505' && error.message === DUPLICATE_MESSAGE) return duplicateResponse(res, error);
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Trail not found' });
  return res.json(data);
}
