import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

const UPLOAD_ID = 'a7000000-0000-4000-a000-000000000043';
const USER_ID = 'a8000000-0000-4000-a000-000000000043';
const PUBLIC_ID = 'a9000000-0000-4000-a000-000000000043';
const COVER = Buffer.from('/9j/4AD/2Q==', 'base64');
const GPX = `<gpx><trk><trkseg>
  <trkpt lat="39.30" lon="16.20"><ele>100</ele></trkpt>
  <trkpt lat="39.31" lon="16.20"><ele>150</ele></trkpt>
</trkseg><trkseg>
  <trkpt lat="39.40" lon="16.20"><ele>250</ele></trkpt>
  <trkpt lat="39.41" lon="16.20"><ele>240</ele></trkpt>
</trkseg></trk></gpx>`;

const METADATA = {
  uploadId: UPLOAD_ID,
  name: '  Lake trail  ',
  description: 'A walk around the lake.',
  difficulty: 'E',
  trailType: 'hiking',
  isPublic: 'false',
};

const upsert = vi.fn();
const findUpload = vi.fn();
const savedUpload = vi.fn();
const update = vi.fn();
const rpc = vi.fn();
let coversDir;

function coverPath() {
  const reference = upsert.mock.calls[0][0].image_url;
  return join(coversDir, reference.split('/').at(-1));
}

function upload(fields = {}, gpx = GPX, cover = COVER) {
  const req = request(app).post('/api/trails').set('Authorization', 'Bearer trail-token');
  for (const [key, value] of Object.entries({ ...METADATA, ...fields })) req.field(key, value);
  req.attach('file', Buffer.from(gpx), 'lake.gpx');
  if (cover) req.attach('cover', cover, { filename: 'cover.jpg', contentType: 'image/jpeg' });
  return req;
}

beforeEach(async () => {
  vi.resetAllMocks();
  coversDir = await mkdtemp(join(tmpdir(), 'qomoot-trail-upload-'));
  vi.stubEnv('TRAIL_COVERS_DIR', coversDir);
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  const lookup = { eq: vi.fn().mockReturnThis(), maybeSingle: findUpload };
  supabaseAsUser.mockReturnValue({
    from: () => ({ upsert, update, select: () => lookup }),
    rpc,
  });
  upsert.mockReturnValue({ select: () => ({ maybeSingle: savedUpload }) });
  findUpload.mockResolvedValue({ data: null, error: null });
  savedUpload.mockResolvedValue({ data: { id: UPLOAD_ID }, error: null });
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(coversDir, { recursive: true, force: true });
});

it('saves the private JPEG locally and stores its trail with the authenticated owner', async () => {
  const res = await upload();
  expect(res.status).toBe(201);
  expect(res.body.geometry).toEqual({ type: 'Point', coordinates: [16.20, 39.30] });
  expect(await readFile(coverPath())).toEqual(COVER);
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
    id: UPLOAD_ID,
    created_by: USER_ID,
    source: 'gpx',
    is_public: false,
    name: 'Lake trail',
    length_m: 2224,
    ascent_m: 50,
    descent_m: 10,
    route_geojson: {
      type: 'MultiLineString',
      coordinates: [
        [[16.20, 39.30, 100], [16.20, 39.31, 150]],
        [[16.20, 39.40, 250], [16.20, 39.41, 240]],
      ],
    },
  }), { onConflict: 'id', ignoreDuplicates: true });
  expect(res.body.properties.imageUrl).toBeUndefined();
  expect(upsert.mock.calls[0][0].image_url).toMatch(/^trail-covers\/gpx-.*\.jpg$/);
});

it('keeps the same photo and path when a public trail becomes private', async () => {
  expect((await upload({ isPublic: 'true' })).status).toBe(201);
  expect(await readFile(coverPath())).toEqual(COVER);

  const query = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: UPLOAD_ID, is_public: false }, error: null }),
  };
  update.mockReturnValue(query);
  const res = await request(app).patch(`/api/trails/${UPLOAD_ID}/visibility`)
    .set('Authorization', 'Bearer trail-token').send({ isPublic: false });

  expect(res.status).toBe(200);
  expect(update).toHaveBeenCalledWith({ is_public: false });
  expect(await readFile(coverPath())).toEqual(COVER);
  expect(await readdir(coversDir)).toHaveLength(1);
});

it('validates the GPX, photo and required fields before writing anything', async () => {
  expect((await upload({}, '<gpx>')).status).toBe(400);
  expect((await upload({}, GPX, null)).status).toBe(400);
  expect((await upload({ difficulty: '' })).status).toBe(400);
  expect(await readdir(coversDir)).toEqual([]);
  expect(upsert).not.toHaveBeenCalled();
});

it('reports an overlap and removes the staging photo', async () => {
  savedUpload.mockResolvedValue({ data: null, error: {
    code: '23505', message: 'A similar public trail already exists.', details: PUBLIC_ID,
  } });
  const res = await upload();
  expect(res.status).toBe(409);
  expect(res.body.existingTrailId).toBe(PUBLIC_ID);
  expect(await readdir(coversDir)).toEqual([]);
});

it('returns the saved trail on retry without writing another photo', async () => {
  findUpload.mockResolvedValue({ data: { id: UPLOAD_ID, is_public: false }, error: null });
  rpc.mockResolvedValue({ data: [{ id: UPLOAD_ID, name: 'Saved trail', lng: 16.2, lat: 39.3 }], error: null });
  const res = await upload();
  expect(res.status).toBe(200);
  expect(res.body.properties.name).toBe('Saved trail');
  expect(await readdir(coversDir)).toEqual([]);
  expect(upsert).not.toHaveBeenCalled();
});

it('keeps the cover after a gateway timeout and reuses the saved trail on retry', async () => {
  savedUpload.mockResolvedValueOnce({ data: null, status: 504, error: { message: 'upstream request timeout' } });
  const timedOut = await upload();
  expect(timedOut.status).toBe(504);
  expect(timedOut.body.error).toContain('Try again');
  expect(await readFile(coverPath() + '.pending')).toEqual(COVER);

  const image_url = upsert.mock.calls[0][0].image_url;
  findUpload.mockResolvedValueOnce({ data: { id: UPLOAD_ID, image_url }, error: null });
  rpc.mockResolvedValueOnce({ data: [{ id: UPLOAD_ID, name: 'Saved before timeout', lng: 16.2, lat: 39.3 }], error: null });
  expect((await upload()).body.properties.name).toBe('Saved before timeout');
  expect(upsert).toHaveBeenCalledTimes(1);
  expect(await readFile(coverPath())).toEqual(COVER);
  expect(await readdir(coversDir)).toHaveLength(1);
});

it('discards the staging photo if PostgreSQL canceled the insert', async () => {
  savedUpload.mockResolvedValueOnce({ data: null, error: {
    code: '57014', message: 'canceling statement due to statement timeout',
  } });
  expect((await upload()).status).toBe(504);
  expect(await readdir(coversDir)).toEqual([]);
});

it('removes only the staging photo when another request has already saved the same id', async () => {
  findUpload.mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: { id: UPLOAD_ID, is_public: false }, error: null });
  savedUpload.mockResolvedValue({ data: null, error: null });
  rpc.mockResolvedValue({ data: [{ id: UPLOAD_ID, name: 'Saved by the other request', lng: 16.2, lat: 39.3 }], error: null });

  const res = await upload();
  expect(res.status).toBe(200);
  expect(res.body.properties.name).toBe('Saved by the other request');
  expect(await readdir(coversDir)).toEqual([]);
});

it('reports a missing visibility migration before writing a local photo', async () => {
  findUpload.mockResolvedValue({ data: null, error: { code: '42703' } });
  expect((await upload()).status).toBe(503);
  expect(await readdir(coversDir)).toEqual([]);
});
