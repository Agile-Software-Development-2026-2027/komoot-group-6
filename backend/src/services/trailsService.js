import { supabase } from '../config/supabase.js';
import { hasTrailCover, isManagedTrailCover } from './trailCovers.js';

function toTrailProperties(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    trailType: row.trail_type,
    difficulty: row.difficulty ?? null,
    lengthM: row.length_m ?? null,
    ascentM: row.ascent_m ?? null,
    descentM: row.descent_m ?? null,
    maxElevationM: row.max_elevation_m ?? null,
    estDurationMin: row.est_duration_min ?? null,
    startPoint: [row.lng, row.lat],
    ...(row.image_url && !isManagedTrailCover(row.image_url) ? { imageUrl: row.image_url } : {}),
  };
}

// A trail as a GeoJSON Feature whose geometry is the START POINT.
// Used for lists and map markers (also by the "nearby" search).
export function toTrailFeature(row) {
  return {
    type: 'Feature',
    id: row.id,
    geometry: { type: 'Point', coordinates: [row.lng, row.lat] },
    properties: toTrailProperties(row),
  };
}

// A trail as a GeoJSON Feature whose geometry is the whole ROUTE.
// Falls back to the start point if the trail has no route.
export function toTrailDetailFeature(row) {
  return {
    ...toTrailFeature(row),
    geometry: row.route ?? { type: 'Point', coordinates: [row.lng, row.lat] },
  };
}

// Many rows -> one GeoJSON FeatureCollection of start points
export function toTrailCollection(rows) {
  return { type: 'FeatureCollection', features: rows.map(toTrailFeature) };
}

async function withLocalCover(feature, trail) {
  if (await hasTrailCover(trail)) feature.properties.hasLocalCover = true;
  return feature;
}

// Supabase does not throw: it returns { data, error }. We throw, so that
// errorHandler answers with 500 and the details stay in the server log.
function failIfError(error, what) {
  if (error) {
    throw new Error(`Could not ${what}: ${error.message}`);
  }
}

export function isMissingColumn(error) {
  return error?.code === '42703' || error?.code === 'PGRST204';
}

// Trails whose start point is inside the area { minLng, minLat, maxLng, maxLat }
export async function getTrailsInBounds({ minLng, minLat, maxLng, maxLat }, db = supabase) {
  const { data, error } = await db.rpc('trails_in_bounds', {
    min_lng: minLng,
    min_lat: minLat,
    max_lng: maxLng,
    max_lat: maxLat,
  });
  failIfError(error, 'load the trails');
  return toTrailCollection(data ?? []);
}

// One trail with its route, or null if it does not exist
export async function getTrailById(id, db = supabase, includeCover = false) {
  const { data, error } = await db.rpc('get_trail', { trail_id: id });
  failIfError(error, 'load the trail');
  const [row] = data ?? [];
  if (!row) return null;

  if (!includeCover) return toTrailDetailFeature(row);

  const { data: visibility, error: visibilityError } = await db.from('trails')
    .select('is_public, created_by')
    .eq('id', id)
    .maybeSingle();
  // Older databases still serve the trail while the GPX migration is pending.
  if (isMissingColumn(visibilityError)) {
    return withLocalCover(toTrailDetailFeature(row), row);
  }
  failIfError(visibilityError, 'load trail visibility');
  if (!visibility) return null;

  const feature = await withLocalCover(toTrailDetailFeature(row), { ...row, created_by: visibility.created_by });
  feature.properties.isPublic = visibility.is_public;
  return feature;
}

// Added for nearby trails search, see validateNearbyQuery() in validateTrailQuery.js
// One trail with its route, or null if it does not exist
//
// A row of nearby_trails -> a start-point Feature (as in the lists), plus
// distanceM: meters from the search position to the closest point of the trail.
export function toNearbyFeature(row) {
  const feature = toTrailFeature(row);
  return {
    ...feature,
    properties: { ...feature.properties, distanceM: Math.round(row.distance_m) },
  };
}

// Trails passing within `radius` meters of (lat, lng), closest first.
// The search runs in PostGIS (ST_DWithin), in the SQL function nearby_trails.
export async function getNearbyTrails({ lat, lng, radius, limit }, db = supabase) {
  const { data, error } = await db.rpc('nearby_trails', {
    origin_lat: lat,
    origin_lng: lng,
    radius_m: radius,
    max_results: limit,
  });
  failIfError(error, 'search the nearby trails');
  const features = await Promise.all((data ?? []).map((row) => withLocalCover(toNearbyFeature(row), row)));
  return { type: 'FeatureCollection', features };
}
