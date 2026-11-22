export const TRAIL_COVERS_BUCKET = 'trail-covers';

const STORAGE_PATH = `/storage/v1/object/authenticated/${TRAIL_COVERS_BUCKET}/`;
const SIGNED_URL_SECONDS = 300;

export function trailCoverReference(path) {
  return new URL(STORAGE_PATH + path, process.env.SUPABASE_URL).href;
}

export function trailCoverPath(reference) {
  if (!reference || !process.env.SUPABASE_URL) return null;
  const prefix = trailCoverReference('');
  return reference.startsWith(prefix) ? reference.slice(prefix.length) : null;
}

// Keep the stable Storage reference in Postgres and sign it for the current reader.
// A single Storage call covers the whole nearby list.
export async function withSignedTrailCovers(db, rows) {
  const paths = [...new Set(rows.map(({ image_url }) => trailCoverPath(image_url)).filter(Boolean))];
  if (!paths.length) return rows;

  const { data, error } = await db.storage.from(TRAIL_COVERS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.warn('Could not sign trail covers:', error.message);
    return rows;
  }

  const signedByPath = new Map((data ?? []).map(({ path, signedUrl }) => [path, signedUrl]));
  return rows.map((row) => {
    const signedUrl = signedByPath.get(trailCoverPath(row.image_url));
    return signedUrl ? { ...row, image_url: signedUrl } : row;
  });
}
