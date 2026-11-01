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