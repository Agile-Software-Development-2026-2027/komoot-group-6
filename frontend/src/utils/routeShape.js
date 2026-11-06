import turfDistance from '@turf/distance';

// If the end of a route is farther than this from its start, the route is "one way"
export const LOOP_TOLERANCE_M = 100;

// Last [lng, lat] of a LineString or MultiLineString, null for anything else
export function lastPoint(geometry) {
  if (geometry?.type === 'LineString') return geometry.coordinates.at(-1) ?? null;
  if (geometry?.type === 'MultiLineString') return geometry.coordinates.at(-1)?.at(-1) ?? null;
  return null;
}

// true = the route ends where it starts (a loop), false = one way, null = we cannot tell
// (e.g. the trail has only a start point and no route).
// "start" is [lng, lat], "geometry" is the GeoJSON geometry of the route.
export function isLoop(start, geometry) {
  const end = lastPoint(geometry);
  const valid = (point) => Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]);
  if (!valid(start) || !valid(end)) return null;
  return turfDistance(start, end, { units: 'meters' }) <= LOOP_TOLERANCE_M;
}