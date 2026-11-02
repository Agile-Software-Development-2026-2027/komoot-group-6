const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/trails?bbox=minLng,minLat,maxLng,maxLat
// The visible area of the map. If valid, it is saved in req.bbox as numbers.
export function validateBbox(req, res, next) {
  const { bbox } = req.query;
  const invalid = () =>
    res.status(400).json({
      error: 'Invalid bbox: use bbox=minLng,minLat,maxLng,maxLat (e.g. 16.1,39.25,16.35,39.45)',
    });

  if (typeof bbox !== 'string') return invalid();

  const values = bbox.split(',').map((value) => Number(value.trim()));
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return invalid();

  const [minLng, minLat, maxLng, maxLat] = values;
  const inRange =
    Math.abs(minLng) <= 180 && Math.abs(maxLng) <= 180 &&
    Math.abs(minLat) <= 90 && Math.abs(maxLat) <= 90;
  if (!inRange || minLng >= maxLng || minLat >= maxLat) return invalid();

  req.bbox = { minLng, minLat, maxLng, maxLat };
  next();
}

// GET /api/trails/:id: the id must be a UUID, as in the trails table
export function validateTrailId(req, res, next) {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid trail id' });
  }
  next();
}

// trail query parameters for GET /api/trails/nearby
//
// GET /api/trails/nearby?lat=...&lng=...&radius=...&limit=...
//   lat, lng  required: the position to search from
//   radius    optional: meters, from 1 to 50000 (default 5000)
//   limit     optional: max trails, from 1 to 100 (default 50)
// If valid, the values are saved in req.nearbyQuery as numbers.
export const DEFAULT_RADIUS_M = 5000;
export const MAX_RADIUS_M = 50000;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

// Query values arrive as strings (an array if the parameter is repeated).
// Number('') is 0, so an empty value has to be rejected by hand.
function readNumber(value) {
  if (typeof value !== 'string' || value.trim() === '') return NaN;
  return Number(value);
}

export function validateNearbyQuery(req, res, next) {
  const { query } = req;
  const lat = readNumber(query.lat);
  const lng = readNumber(query.lng);
  const radius = query.radius === undefined ? DEFAULT_RADIUS_M : readNumber(query.radius);
  const limit = query.limit === undefined ? DEFAULT_LIMIT : readNumber(query.limit);
  const invalid = (message) => res.status(400).json({ error: message });

  if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
    return invalid('Invalid lat: use a number between -90 and 90');
  }
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) {
    return invalid('Invalid lng: use a number between -180 and 180');
  }
  if (!Number.isFinite(radius) || radius < 1 || radius > MAX_RADIUS_M) {
    return invalid(`Invalid radius: use meters between 1 and ${MAX_RADIUS_M}`);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return invalid(`Invalid limit: use a whole number between 1 and ${MAX_LIMIT}`);
  }

  req.nearbyQuery = { lat, lng, radius, limit };
  next();
}