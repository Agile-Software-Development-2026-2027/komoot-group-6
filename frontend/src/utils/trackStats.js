const EARTH_RADIUS_M = 6371000;

// Distanza in metri tra due punti [lng, lat] (formula di haversine).
function distanceBetween([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Calcola i dettagli di un percorso a partire da una feature GeoJSON (LineString o MultiLineString)
// come quella restituita da POST /api/gpx/parse.
// I valori che il file non contiene (quota, orari) sono null.
export function getTrackStats(feature) {
  const properties = feature?.properties ?? {};
  const { type, coordinates } = feature?.geometry ?? {};

  let lines = [];
  if (type === 'LineString') lines = [coordinates];
  if (type === 'MultiLineString') lines = coordinates;

  let distance = 0;
  let ascent = 0;
  let descent = 0;
  let minAltitude = Infinity;
  let maxAltitude = -Infinity;

  for (const line of lines) {
    line.forEach((point, index) => {
      const altitude = point[2];
      if (Number.isFinite(altitude)) {
        minAltitude = Math.min(minAltitude, altitude);
        maxAltitude = Math.max(maxAltitude, altitude);
      }

      if (index === 0) return;
      const previous = line[index - 1];
      distance += distanceBetween(previous, point);

      if (Number.isFinite(altitude) && Number.isFinite(previous[2])) {
        const delta = altitude - previous[2];
        if (delta > 0) ascent += delta;
        else descent -= delta;
      }
    });
  }

  const hasAltitude = Number.isFinite(minAltitude);

  // Per un MultiLineString gli orari sono array annidati: li appiattisco
  const times = (properties.coordinateProperties?.times ?? [])
    .flat(Infinity)
    .map((time) => new Date(time).getTime())
    .filter(Number.isFinite);
  const duration = times.length > 1 ? times[times.length - 1] - times[0] : null;
  const startTime = properties.time ?? (times.length ? new Date(times[0]).toISOString() : null);

  return {
    name: properties.name || 'Untitled track',
    activity: properties.type ?? null,
    startTime,
    distance,
    duration,
    ascent: hasAltitude ? ascent : null,
    descent: hasAltitude ? descent : null,
    minAltitude: hasAltitude ? minAltitude : null,
    maxAltitude: hasAltitude ? maxAltitude : null,
  };
}
