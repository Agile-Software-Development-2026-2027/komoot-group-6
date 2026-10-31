// Unit tests for parseGpx: no Express, no network, only GPX text in and GeoJSON out.
import { describe, it, expect } from 'vitest';
import { parseGpx, GpxParseError } from '../src/utils/parseGpx.js';

// Builds a minimal GPX document around the given content
function gpxFile(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="tests" xmlns="http://www.topografix.com/GPX/1/1">
${content}
</gpx>`;
}

// A track with elevation and times, plus a waypoint that must be ignored
const TRACK_WITH_ELEVATION = gpxFile(`
  <wpt lat="39.3600" lon="16.2300"><name>Spring</name></wpt>
  <trk>
    <name>Lake loop</name>
    <trkseg>
      <trkpt lat="39.3561" lon="16.2280"><ele>210</ele><time>2026-10-12T09:00:00Z</time></trkpt>
      <trkpt lat="39.3570" lon="16.2295"><ele>224</ele><time>2026-10-12T09:01:30Z</time></trkpt>
    </trkseg>
  </trk>`);

// Checks that parseGpx throws a GpxParseError with the given code
function expectParseError(text, code) {
  try {
    parseGpx(text);
  } catch (error) {
    expect(error).toBeInstanceOf(GpxParseError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error('parseGpx did not throw');
}

describe('parseGpx', () => {
  it('converts a track into a GeoJSON FeatureCollection', () => {
    const result = parseGpx(TRACK_WITH_ELEVATION);

    expect(result.type).toBe('FeatureCollection');
    // The waypoint is left out: only the track remains
    expect(result.features).toHaveLength(1);

    const [track] = result.features;
    expect(track.geometry.type).toBe('LineString');
    expect(track.properties.name).toBe('Lake loop');
  });

  it('writes coordinates as [longitude, latitude, elevation]', () => {
    const [track] = parseGpx(TRACK_WITH_ELEVATION).features;

    // In the GPX lat comes first: in GeoJSON the order is reversed
    expect(track.geometry.coordinates[0]).toEqual([16.228, 39.3561, 210]);
    expect(track.properties.hasElevation).toBe(true);
  });

  it('keeps the time of every point', () => {
    const [track] = parseGpx(TRACK_WITH_ELEVATION).features;

    expect(track.properties.coordinateProperties.times).toEqual([
      '2026-10-12T09:00:00Z',
      '2026-10-12T09:01:30Z',
    ]);
  });

  it('marks tracks without elevation', () => {
    const [track] = parseGpx(gpxFile(`
      <trk><trkseg>
        <trkpt lat="39.3561" lon="16.2280"/>
        <trkpt lat="39.3570" lon="16.2295"/>
      </trkseg></trk>`)).features;

    expect(track.geometry.coordinates[0]).toEqual([16.228, 39.3561]);
    expect(track.properties.hasElevation).toBe(false);
  });

  it('returns a MultiLineString when the track has more segments', () => {
    const [track] = parseGpx(gpxFile(`
      <trk>
        <trkseg>
          <trkpt lat="39.3561" lon="16.2280"><ele>210</ele></trkpt>
          <trkpt lat="39.3570" lon="16.2295"><ele>224</ele></trkpt>
        </trkseg>
        <trkseg>
          <trkpt lat="39.3600" lon="16.2300"><ele>230</ele></trkpt>
          <trkpt lat="39.3610" lon="16.2310"><ele>231</ele></trkpt>
        </trkseg>
      </trk>`)).features;

    expect(track.geometry.type).toBe('MultiLineString');
    expect(track.geometry.coordinates).toHaveLength(2);
    expect(track.properties.hasElevation).toBe(true);
  });

  it('converts a route (rte) too', () => {
    const [route] = parseGpx(gpxFile(`
      <rte>
        <rtept lat="39.3561" lon="16.2280"><ele>210</ele></rtept>
        <rtept lat="39.3570" lon="16.2295"><ele>224</ele></rtept>
      </rte>`)).features;

    expect(route.geometry.type).toBe('LineString');
  });

  it('accepts a file that starts with a BOM character', () => {
    const result = parseGpx(`\uFEFF${TRACK_WITH_ELEVATION}`);

    expect(result.features).toHaveLength(1);
  });

  it('rejects an empty file', () => {
    expectParseError('', 'INVALID_XML');
    expectParseError('   ', 'INVALID_XML');
  });

  it('rejects broken XML', () => {
    expectParseError('<gpx><trk>', 'INVALID_XML');
  });

  it('rejects XML with undeclared entities', () => {
    expectParseError('<!DOCTYPE gpx [<!ENTITY x "y">]><gpx>&a;</gpx>', 'INVALID_XML');
  });

  it('rejects valid XML that is not a GPX file', () => {
    expectParseError('<note><to>Mario</to></note>', 'NOT_GPX');
  });

  it('rejects a GPX file without tracks or routes', () => {
    expectParseError(gpxFile('<wpt lat="39.36" lon="16.23"><name>Spring</name></wpt>'), 'NO_TRACK');
  });

  
  it('ignores a track with a single point', () => {
    // A line needs at least two points: a one-point track is not a path
    expectParseError(gpxFile(`
      <trk><trkseg><trkpt lat="39.3561" lon="16.2280"><ele>210</ele></trkpt></trkseg></trk>`), 'NO_TRACK');
  });

  it('rejects coordinates outside the valid range', () => {
    expectParseError(gpxFile(`
      <trk><trkseg>
        <trkpt lat="999" lon="16.2280"/>
        <trkpt lat="39.3570" lon="16.2295"/>
      </trkseg></trk>`), 'INVALID_COORDINATES');
  });
});