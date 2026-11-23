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

  // Iterate so even a densely recorded GPX can fit into the map bounds.
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }
  return Number.isFinite(west) ? [[west, south], [east, north]] : null;
}
