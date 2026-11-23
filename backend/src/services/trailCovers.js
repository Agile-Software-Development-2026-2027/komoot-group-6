import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_COVER_BYTES } from '../config/gpx.config.js';

const DEFAULT_COVERS_DIR = fileURLToPath(new URL('../../data/trail-covers/', import.meta.url));
const LOCAL_REFERENCE = /^trail-covers\/((?:catalog|gpx)-[a-z0-9-]+\.(?:jpg|webp))$/;
const LEGACY_STORAGE_PATH = '/storage/v1/object/authenticated/trail-covers/';

function localFilename(reference) {
  return LOCAL_REFERENCE.exec(reference ?? '')?.[1] ?? null;
}

function legacyPath(reference) {
  if (!reference || !process.env.SUPABASE_URL) return null;
  const prefix = new URL(LEGACY_STORAGE_PATH, process.env.SUPABASE_URL).href;
  return reference.startsWith(prefix) ? reference.slice(prefix.length) : null;
}

export function isManagedTrailCover(reference) {
  return Boolean(localFilename(reference) || legacyPath(reference));
}

function coversDirectory() {
  return resolve(process.env.TRAIL_COVERS_DIR || DEFAULT_COVERS_DIR);
}

function uploadPrefix(trailId, uploaderId) {
  return 'gpx-' + trailId + '-' + uploaderId;
}

// Recognize the old title-based catalogue when image_url still uses an older format.
function catalogueFiles(name) {
  const slug = String(name ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? ['catalog-' + slug + '.jpg', 'catalog-' + slug + '.webp'] : [];
}

function coverCandidates(trail) {
  const filename = localFilename(trail.image_url);
  if (filename) return [filename];

  const path = legacyPath(trail.image_url);
  const legacyUpload = /^([0-9a-f-]+)\/([0-9a-f-]+)\/[0-9a-f-]+\.jpg$/i.exec(path ?? '');
  if (legacyUpload && legacyUpload[2] === trail.id) {
    return [uploadPrefix(trail.id, legacyUpload[1]) + '.jpg'];
  }

  if (trail.created_by) return [uploadPrefix(trail.id, trail.created_by) + '.jpg'];
  return catalogueFiles(trail.name);
}

function belongsToTrail(filename, trail) {
  if (filename.startsWith('catalog-')) return !trail.created_by;
  if (!trail.created_by) return false;
  const prefix = uploadPrefix(trail.id, trail.created_by);
  return filename === prefix + '.jpg' || filename.startsWith(prefix + '-');
}

// Pending files stay out of Git until PostgreSQL accepts the trail.
export async function stageTrailCover(trailId, uploaderId, bytes) {
  const filename = uploadPrefix(trailId, uploaderId) + '-' + randomUUID() + '.jpg';
  const folder = coversDirectory();
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, filename + '.pending'), bytes, { flag: 'wx' });
  return 'trail-covers/' + filename;
}

export async function publishTrailCover(reference) {
  const filename = localFilename(reference);
  if (!filename?.startsWith('gpx-')) return;
  const file = join(coversDirectory(), filename);
  try {
    await rename(file + '.pending', file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export function discardTrailCover(reference) {
  const filename = localFilename(reference);
  return rm(join(coversDirectory(), filename + '.pending'), { force: true });
}

async function existingFile(filename) {
  const file = join(coversDirectory(), filename);
  const paths = filename.startsWith('gpx-') ? [file, file + '.pending'] : [file];
  for (const path of paths) {
    try {
      const info = await lstat(path);
      if (info.isFile() && info.size <= MAX_COVER_BYTES) return path;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return null;
}

export async function hasTrailCover(trail) {
  for (const filename of coverCandidates(trail)) {
    if (await existingFile(filename)) return true;
  }
  return false;
}

// Only serve files associated with the row already authorized by the controller.
export async function readTrailCover(trail) {
  for (const filename of coverCandidates(trail)) {
    if (!belongsToTrail(filename, trail)) continue;
    const path = await existingFile(filename);
    if (path) return { bytes: await readFile(path), type: filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg' };
  }
  return null;
}
