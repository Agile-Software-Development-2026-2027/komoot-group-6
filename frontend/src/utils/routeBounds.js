// Smallest rectangle that contains a whole route, in the format MapLibre wants
// for fitBounds: [[west, south], [east, north]] = [[minLng, minLat], [maxLng, maxLat]].
// "geometry" is a GeoJSON geometry: LineString, MultiLineString or Point.
// Returns null when there is nothing to show.
export function routeBounds(geometry) {
  const { type, coordinates } = geometry ?? {};

  // Every geometry type becomes a simple list of [lng, lat, (elevation)] points
  let points = [];
  if (type === 'LineString') points = coordinates;
  else if (type === 'MultiLineString') points = coordinates.flat();
  else if (type === 'Point') points = [coordinates];

  // Only real numbers count (a broken point must not move the rectangle)
  const valid = points.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (valid.length === 0) return null;

  const lngs = valid.map(([lng]) => lng);
  const lats = valid.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}