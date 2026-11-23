const EARTH_RADIUS_M = 6371008.8;
const ELEVATION_THRESHOLD_M = 5;
const FLAT_SPEED_KMH = 4;
const CLIMB_SPEED_MH = 300;

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceM([lngA, latA], [lngB, latB]) {
  const haversine = Math.sin(radians(latB - latA) / 2) ** 2
    + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(radians(lngB - lngA) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

// Keep every track and segment. Distance and elevation changes stop at segment boundaries.
export function describeGpxTrail({ features }) {
  const segments = features.flatMap(({ geometry }) =>
    geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
  ).filter((line) => line.length >= 2);
  const lines = segments.map((line) => line.map(([lng, lat, elevation]) =>
    Number.isFinite(elevation) ? [lng, lat, elevation] : [lng, lat]
  ));

  let length = 0;
  let ascent = 0;
  let descent = 0;
  let highest = null;
  for (const line of lines) {
    let previousElevation = null;
    for (const [index, point] of line.entries()) {
      if (index > 0) length += distanceM(line[index - 1], point);
      const elevation = point[2];
      if (elevation === undefined) {
        previousElevation = null;
        continue;
      }
      highest = highest === null ? elevation : Math.max(highest, elevation);
      const change = previousElevation === null ? 0 : elevation - previousElevation;
      if (previousElevation === null || Math.abs(change) >= ELEVATION_THRESHOLD_M) {
        ascent += Math.max(0, change);
        descent += Math.max(0, -change);
        previousElevation = elevation;
      }
    }
  }
  if (length < 1) return null;

  const flatHours = length / 1000 / FLAT_SPEED_KMH;
  const climbHours = ascent / CLIMB_SPEED_MH;
  const hours = Math.max(flatHours, climbHours) + Math.min(flatHours, climbHours) / 2;
  return {
    geometry: lines.length === 1
      ? { type: 'LineString', coordinates: lines[0] }
      : { type: 'MultiLineString', coordinates: lines },
    startPoint: lines[0][0].slice(0, 2),
    lengthM: Math.round(length),
    ascentM: highest === null ? null : Math.round(ascent),
    descentM: highest === null ? null : Math.round(descent),
    highestM: highest === null ? null : Math.round(highest),
    durationMin: Math.max(1, Math.round(hours * 60)),
  };
}
