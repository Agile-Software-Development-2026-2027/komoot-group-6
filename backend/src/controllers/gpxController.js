import { parseGpx, GpxParseError } from '../utils/parseGpx.js';

const STATUS_BY_CODE = {
  INVALID_XML: 400,
  NOT_GPX: 400,
  NO_TRACK: 422,
  INVALID_COORDINATES: 422,
};


export function parseGpxFile(req, res) {
  try {
    const geojson = parseGpx(req.file.buffer.toString('utf8'));
    return res.json(geojson);
  } catch (error) {
    if (error instanceof GpxParseError) {
      return res.status(STATUS_BY_CODE[error.code] ?? 400).json({ error: error.message });
    }
    throw error;
  }
}