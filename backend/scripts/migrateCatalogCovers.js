import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { MAX_COVER_BYTES } from '../src/config/gpx.config.js';
import { TRAIL_COVERS_BUCKET, trailCoverReference } from '../src/services/trailCovers.js';

const apply = process.argv.includes('--apply');
const key = apply ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
const coverDirectory = fileURLToPath(new URL('../../frontend/src/assets/trails/', import.meta.url));

function imageKey(name) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function photoFormat(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
}

async function readCatalog(db) {
  const { data, error } = await db.from('trails').select('id, name, image_url').is('created_by', null);
  if (error) throw error;

  const photos = (await readdir(coverDirectory)).filter((file) => /\.(jpe?g|webp)$/i.test(file));
  const photoByTitle = new Map(photos.map((file) => [imageKey(basename(file, extname(file))), file]));
  return Promise.all(data.map(async (trail) => {
    const file = photoByTitle.get(imageKey(trail.name));
    if (!file) throw new Error(`Missing catalogue photo for "${trail.name}".`);
    const bytes = await readFile(join(coverDirectory, file));
    const format = photoFormat(bytes);
    if (bytes.length > MAX_COVER_BYTES || !format) {
      throw new Error(`"${file}" must be a JPEG or WebP up to 512 KiB.`);
    }
    return { trail, path: `catalog/${trail.id}.${format.extension}`, contentType: format.contentType, bytes };
  }));
}

async function migrate(db, catalog) {
  const { data: settings, error: bucketError } = await db.storage.getBucket(TRAIL_COVERS_BUCKET);
  if (bucketError) throw bucketError;
  if (settings.public) throw new Error('The trail-covers bucket must be private.');
  const bucket = db.storage.from(TRAIL_COVERS_BUCKET);

  for (const { trail, path, bytes, contentType } of catalog) {
    const { error: uploadError } = await bucket.upload(path, bytes, { contentType });
    if (uploadError) {
      // Reruns may find the same file already uploaded. Preserve different files.
      const { data: stored, error: readError } = await bucket.download(path);
      if (readError) throw uploadError;
      if (!bytes.equals(Buffer.from(await stored.arrayBuffer()))) {
        throw new Error(`Storage already has a different photo for "${trail.name}".`);
      }
    }

    const reference = trailCoverReference(path);
    if (trail.image_url === reference) continue;
    const update = db.from('trails').update({ image_url: reference })
      .eq('id', trail.id).is('created_by', null);
    const unchanged = trail.image_url === null
      ? update.is('image_url', null)
      : update.eq('image_url', trail.image_url);
    const { data, error } = await unchanged.select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`"${trail.name}" changed during migration. Review it before retrying.`);
    console.log(`Migrated ${trail.name}`);
  }
}

try {
  if (!process.env.SUPABASE_URL || !key) {
    throw new Error(apply
      ? 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY locally to apply the migration.'
      : 'Set SUPABASE_URL and SUPABASE_ANON_KEY to check the catalogue.');
  }
  const db = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false } });
  const catalog = await readCatalog(db);
  console.log(`${catalog.length} catalogue covers, ${catalog.reduce((total, item) => total + item.bytes.length, 0)} bytes.`);
  if (apply) await migrate(db, catalog);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
