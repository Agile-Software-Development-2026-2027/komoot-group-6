import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';
import { MAX_GPX_SIZE } from '../src/middlewares/uploadGpx.js';

const VALID_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="tests" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Lake loop</name>
    <trkseg>
      <trkpt lat="39.3561" lon="16.2280"><ele>210</ele></trkpt>
      <trkpt lat="39.3570" lon="16.2295"><ele>224</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

// Sends a file to the endpoint as a logged-in user
function upload(content, filename = 'track.gpx', field = 'file') {
  return request(app)
    .post('/api/gpx/parse')
    .set('Authorization', 'Bearer access-123')
    .attach(field, Buffer.from(content), filename);
}

beforeEach(() => {
  vi.clearAllMocks();
  // By default the token is valid
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
});

describe('POST /api/gpx/parse', () => {
  it('converts an uploaded GPX file into GeoJSON (200)', async () => {
    const res = await upload(VALID_GPX);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features).toHaveLength(1);
    expect(res.body.features[0].geometry.coordinates[0]).toEqual([16.228, 39.3561, 210]);
    expect(res.body.features[0].properties.hasElevation).toBe(true);
  });

  it('responds 401 without a token', async () => {
    const res = await request(app)
      .post('/api/gpx/parse')
      .attach('file', Buffer.from(VALID_GPX), 'track.gpx');

    expect(res.status).toBe(401);
  });

  it('responds 400 when no file is sent', async () => {
    const res = await request(app)
      .post('/api/gpx/parse')
      .set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('responds 400 when the file is sent in another field', async () => {
    const res = await upload(VALID_GPX, 'track.gpx', 'document');

    expect(res.status).toBe(400);
  });

  it('responds 400 when the file is not a .gpx', async () => {
    const res = await upload(VALID_GPX, 'track.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/\.gpx/);
  });

  it('responds 400 when the file is not valid XML', async () => {
    const res = await upload('<gpx><trk>');

    expect(res.status).toBe(400);
  });

  it('responds 400 when the XML is not a GPX', async () => {
    const res = await upload('<note><to>Mario</to></note>');

    expect(res.status).toBe(400);
  });

  it('responds 422 when the GPX has no track', async () => {
    const res = await upload(
      '<gpx xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="39.36" lon="16.23"/></gpx>'
    );

    expect(res.status).toBe(422);
  });

  it('responds 422 when the GPX has invalid coordinates', async () => {
    const res = await upload(
      '<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>'
        + '<trkpt lat="999" lon="16.228"/><trkpt lat="39.357" lon="16.2295"/>'
        + '</trkseg></trk></gpx>'
    );

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/invalid coordinates/i);
  });

  it('responds 413 when the file is larger than 5 MB', async () => {
    const res = await upload('a'.repeat(MAX_GPX_SIZE + 1));

    expect(res.status).toBe(413);
  });
});