import { supabase } from '../config/supabase.js';

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

// Supabase does not throw: it returns { data, error }. We throw, so that
// errorHandler answers with 500 and the details stay in the server log.
function failIfError(error, what) {
  if (error) {
    throw new Error(`Could not ${what}: ${error.message}`);
  }
}

// Trails whose start point is inside the area { minLng, minLat, maxLng, maxLat }
export async function getTrailsInBounds({ minLng, minLat, maxLng, maxLat }) {
  const { data, error } = await supabase.rpc('trails_in_bounds', {
    min_lng: minLng,
    min_lat: minLat,
    max_lng: maxLng,
    max_lat: maxLat,
  });
  failIfError(error, 'load the trails');
  return toTrailCollection(data ?? []);
}

// One trail with its route, or null if it does not exist
export async function getTrailById(id) {
  const { data, error } = await supabase.rpc('get_trail', { trail_id: id });
  failIfError(error, 'load the trail');
  const [row] = data ?? [];
  return row ? toTrailDetailFeature(row) : null;
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
export async function getNearbyTrails({ lat, lng, radius, limit }) {
  const { data, error } = await supabase.rpc('nearby_trails', {
    origin_lat: lat,
    origin_lng: lng,
    radius_m: radius,
    max_results: limit,
  });
  failIfError(error, 'search the nearby trails');
  return { type: 'FeatureCollection', features: (data ?? []).map(toNearbyFeature) };
}