import { parseGpx, GpxParseError } from '../utils/parseGpx.js';
import { describeGpxTrail } from '../utils/gpxTrailStats.js';

const STATUS_BY_CODE = {
  INVALID_XML: 400,
  NOT_GPX: 400,
  NO_TRACK: 422,
  INVALID_COORDINATES: 422,
};


export function readGpx(req, res, next) {
  try {
    req.gpx = parseGpx(req.file.buffer.toString('utf8'));
  } catch (error) {
    if (error instanceof GpxParseError) {
      return res.status(STATUS_BY_CODE[error.code] ?? 400).json({ error: error.message });
    }
    throw error;
  }
  req.gpxTrail = describeGpxTrail(req.gpx);
  if (!req.gpxTrail) {
    return res.status(422).json({ error: 'The GPX needs a route at least 1 metre long.' });
  }
  next();
}

export function parseGpxFile(req, res) {
  return res.json(req.gpx);
}
