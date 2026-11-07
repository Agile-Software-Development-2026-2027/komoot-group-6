// Turns the route of a trail (GeoJSON LineString or MultiLineString) into an SVG path
// that fits inside a width × height rectangle, centered and with a margin.
// Returns { d, start, end } (start/end are the [x, y] of the beginning and the end) or null
// if the route does not have at least two valid points in different places.

const MAX_POINTS = 400;

function toLines(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates];
  if (geometry?.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

// Keeps at most MAX_POINTS points (always the first and the last) so the SVG does not get heavy
function downsample(points) {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => points[Math.round(i * step)]);
}

export function routeToSvgPath(geometry, { width = 640, height = 360, padding = 24 } = {}) {
  const lines = toLines(geometry)
    .map((line) => line.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1])))
    .filter((line) => line.length >= 2);
  if (lines.length === 0) return null;

  const all = lines.flat();
  const lngs = all.map(([lng]) => lng);
  const lats = all.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLat = Math.max(...lats);
  const midLat = (maxLat + Math.min(...lats)) / 2;

  // At this latitude a degree of longitude is shorter than a degree of latitude
  const xScale = Math.cos((midLat * Math.PI) / 180);
  const spanX = (Math.max(...lngs) - minLng) * xScale;
  const spanY = maxLat - Math.min(...lats);
  if (spanX === 0 && spanY === 0) return null;

  const scale = Math.min(
    spanX > 0 ? (width - 2 * padding) / spanX : Infinity,
    spanY > 0 ? (height - 2 * padding) / spanY : Infinity,
  );
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  const project = ([lng, lat]) => [
    Math.round(((lng - minLng) * xScale * scale + offsetX) * 10) / 10,
    Math.round(((maxLat - lat) * scale + offsetY) * 10) / 10,
  ];

  const d = lines
    .map((line) => downsample(line).map(project))
    .map((points) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' '))
    .join(' ');

  return {
    d,
    start: project(lines[0][0]),
    end: project(lines.at(-1).at(-1)),
  };
}
