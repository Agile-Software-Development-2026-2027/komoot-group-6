import { trailImageUrl } from '../utils/trailImages.js';
import { ApiError, apiRequest } from './api.js';

// Only in development and on explicit request: original GPX files to try the chart and the map.
// Without VITE_USE_LOCAL_GPX=true the service keeps using the backend.
async function getLocalTrails() {
  const { default: collection } = await import('../data/gpxTrails.json');
  return collection.features;
}

// Backend calls about trails.
// getTrailsInBounds and getTrail: trails are public data, the endpoints do not require login,
// so no token. getNearbyTrails and saveTrail instead receive authFetch from useAuth(),
// which adds the token and refreshes it if it has expired.

// Trails that start inside the area [minLng, minLat, maxLng, maxLat].
// Returns a FeatureCollection of points (the starting points).
export async function getTrailsInBounds(bbox) {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_LOCAL_GPX !== 'true') {
    return apiRequest(`/trails?bbox=${bbox.join(',')}`);
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  const trails = await getLocalTrails();
  const features = trails
    .filter(({ properties: { startPoint: [lng, lat] } }) =>
      lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat)
    .map((trail) => ({
      ...trail,
      geometry: { type: 'Point', coordinates: trail.properties.startPoint },
    }));

  return structuredClone({ type: 'FeatureCollection', features });
}

// A trail with the full route: a Feature whose geometry is the route.
export async function getTrail(id) {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_LOCAL_GPX !== 'true') {
    return apiRequest(`/trails/${encodeURIComponent(id)}`);
  }

  const trails = await getLocalTrails();
  const trail = trails.find((feature) => feature.properties.id === id);
  if (!trail) throw new ApiError('Trail not found', 404);
  return structuredClone(trail);
}

// The backend uses the CAI scale (T, E, EE, EEA); cards and filters use easy / moderate / hard.
export const CAI_TO_DIFFICULTY = { T: 'easy', E: 'moderate', EE: 'hard', EEA: 'hard' };

function toLngLat(point) {
  const isValid = Array.isArray(point) && point.length >= 2 && point.slice(0, 2).every(Number.isFinite);
  return isValid ? [point[0], point[1]] : null;
}

// Converts a trail from the response into the format used by the cards.
// Each trail is a GeoJSON Feature: the geometry is the starting point, the data is in properties.
function toTrail(feature) {
  const props = feature?.properties ?? {};
  return {
    id: props.id ?? feature?.id,
    name: props.name,
    // A level that is not in the table stays as it is
    difficulty: CAI_TO_DIFFICULTY[props.difficulty] ?? props.difficulty ?? null,
    lengthM: props.lengthM,
    elevationGainM: props.ascentM,
    distanceM: props.distanceM,
    start: toLngLat(feature?.geometry?.coordinates),
    imageUrl: trailImageUrl(props.name),
    saved: Boolean(props.saved),
  };
}

// Trails within radiusKm of the point (lat, lng), closest first.
// The backend wants the radius in meters and answers with a FeatureCollection.
export async function getNearbyTrails(authFetch, { lat, lng, radiusKm }) {
  const query = new URLSearchParams({ lat, lng, radius: Math.round(radiusKm * 1000) });
  const data = await authFetch(`/trails/nearby?${query}`);
  return (data?.features ?? []).map(toTrail);
}

// Saves the trail to the user's profile.
// Returns 'saved' if it was saved now, 'already-saved' if it was already in the profile (409):
// it is not an error, but the card shows a different message.
export async function saveTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/saved-trails', { method: 'POST', body: { trailId } });
    return 'saved';
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return 'already-saved';
    throw err;
  }
}

// Trails saved by the logged-in user: [{ trail_id, created_at }, ...].
// Used to show the filled bookmark on trails already saved (even after a new login).
export async function getSavedTrails(authFetch) {
  return authFetch('/profile/saved-trails');
}

// Removes the trail from the saved ones in the user's profile (the bookmark becomes empty again).
export async function unsaveTrail(authFetch, trailId) {
  await authFetch(`/profile/saved-trails/${encodeURIComponent(trailId)}`, { method: 'DELETE' });
}


// If it was already completed (409) the result for the user is the same, so it is not an error.
export async function completeTrail(authFetch, trailId) {
  try {
    await authFetch('/profile/completed-trails', { method: 'POST', body: { trailId } });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 409)) throw err;
  }
}

// Returns the list of trails completed by the logged-in user.
export async function getCompletedTrails(authFetch) {
  return authFetch('/profile/completed-trails');
}

// Removes the trail from the completed ones in the user's profile.
export async function uncompleteTrail(authFetch, trailId) {
  await authFetch(`/profile/completed-trails/${trailId}`, { method: 'DELETE' });
}

// Likes of the trail. All three answer with { trailId, count, liked }:
// count = total likes of all users, liked = true if the logged-in user's like is among them.
export async function getTrailLikes(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`);
}

// Adds the like. If it was already there, the backend still answers with the updated total.
export async function likeTrail(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`, { method: 'POST' });
}

// Removes the like and returns the updated total.
export async function unlikeTrail(authFetch, trailId) {
  return authFetch(`/trails/${encodeURIComponent(trailId)}/likes`, { method: 'DELETE' });
}


//Returns the total points of the logged-in user.
export async function getProfilePoints(authFetch) {
  return authFetch('/profile/points');
}