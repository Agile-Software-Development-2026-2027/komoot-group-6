import { DOMParser } from '@xmldom/xmldom';
import { gpx } from '@tmcw/togeojson';

// Error thrown when a GPX file cannot be converted.
// "code" tells the controller which HTTP status to answer with.
export class GpxParseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GpxParseError';
    this.code = code; // 'INVALID_XML' | 'NOT_GPX' | 'NO_TRACK' | 'INVALID_COORDINATES'
  }
}

// Geometry types that describe a path (tracks and routes).
// Single points (waypoints, e.g. a hut or a spring) are left out.
const LINE_TYPES = ['LineString', 'MultiLineString'];

// Reads the XML text into a DOM document.
// Any XML error (not only fatal ones) makes the file invalid.
function readXml(text) {
  const parser = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') {
        throw new GpxParseError(`The file is not valid XML: ${message}`, 'INVALID_XML');
      }
    },
  });

  try {
    return parser.parseFromString(text, 'text/xml');
  } catch {
    // xmldom wraps the error thrown above: we throw a clean one
    throw new GpxParseError('The file is not valid XML', 'INVALID_XML');
  }
}

// The lines of a geometry, always as a list of lines:
// a LineString is one line, a MultiLineString is already a list of lines
function linesOf(geometry) {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
}

// True if every point of the geometry has a third value (the elevation)
function hasElevation(geometry) {
  return linesOf(geometry).every((line) => line.every((point) => point.length >= 3));
}

// True if every point is a real place on Earth:
// longitude between -180 and 180, latitude between -90 and 90
function hasValidCoordinates(geometry) {
  return linesOf(geometry).every((line) =>
    line.every(([lon, lat]) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90)
  );
}

// Converts the text of a .gpx file into a GeoJSON FeatureCollection.
// Coordinates are [longitude, latitude, elevation].
export function parseGpx(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new GpxParseError('The file is empty', 'INVALID_XML');
  }

  // Some apps save files with an invisible "BOM" character at the start:
  // the XML parser rejects it, so we remove it
  const doc = readXml(text.replace(/^\uFEFF/, ''));

  // A valid XML file is not necessarily a GPX file
  if (doc.documentElement?.localName !== 'gpx') {
    throw new GpxParseError('The file is not a GPX file', 'NOT_GPX');
  }
  
 

  const features = gpx(doc).features
    .filter((feature) => LINE_TYPES.includes(feature.geometry?.type))
    .map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        hasElevation: hasElevation(feature.geometry),
      },
    }));

  if (features.length === 0) {
    throw new GpxParseError('The GPX file contains no track or route', 'NO_TRACK');
  }

   if (!features.every((feature) => hasValidCoordinates(feature.geometry))) {
    throw new GpxParseError('The GPX file contains invalid coordinates', 'INVALID_COORDINATES');
  }

  return { type: 'FeatureCollection', features };
}