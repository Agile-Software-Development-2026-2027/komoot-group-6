import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
const STORAGE_URL = 'https://test.supabase.co';
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
const uploadCover = vi.fn();
const removeCover = vi.fn();
const rpc = vi.fn();

function upload(fields = {}, gpx = GPX, cover = COVER) {
  const req = request(app).post('/api/trails').set('Authorization', 'Bearer trail-token');
  for (const [key, value] of Object.entries({ ...METADATA, ...fields })) req.field(key, value);
  req.attach('file', Buffer.from(gpx), 'lake.gpx');
  if (cover) req.attach('cover', cover, { filename: 'cover.jpg', contentType: 'image/jpeg' });
  return req;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_URL', STORAGE_URL);
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  const lookup = { eq: vi.fn().mockReturnThis(), maybeSingle: findUpload };
  supabaseAsUser.mockReturnValue({
    from: () => ({ upsert, select: () => lookup }),
    storage: { from: () => ({ upload: uploadCover, remove: removeCover }) },
    rpc,
  });
  upsert.mockReturnValue({ select: () => ({ maybeSingle: savedUpload }) });
  findUpload.mockResolvedValue({ data: null, error: null });
  savedUpload.mockResolvedValue({ data: { id: UPLOAD_ID }, error: null });
  uploadCover.mockResolvedValue({ error: null });
  removeCover.mockResolvedValue({ error: null });
});

afterEach(() => vi.unstubAllEnvs());

it('uploads a JPEG and stores its reference with the trail and its authenticated owner', async () => {
  const res = await upload();
  expect(res.status).toBe(201);
  expect(res.body.geometry).toEqual({ type: 'Point', coordinates: [16.20, 39.30] });
  const [path] = uploadCover.mock.calls[0];
  expect(path).toMatch(new RegExp(`^${USER_ID}/${UPLOAD_ID}/[0-9a-f-]+\\.jpg$`));
  expect(uploadCover).toHaveBeenCalledWith(path, COVER, { contentType: 'image/jpeg' });
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
    id: UPLOAD_ID,
    created_by: USER_ID,
    source: 'gpx',
    is_public: false,
    name: 'Lake trail',
    image_url: `${STORAGE_URL}/storage/v1/object/authenticated/trail-covers/${path}`,
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
});

it('validates the GPX, photo and required fields before writing anything', async () => {
  expect((await upload({}, '<gpx>')).status).toBe(400);
  expect((await upload({}, GPX, null)).status).toBe(400);
  expect((await upload({ difficulty: '' })).status).toBe(400);
  expect(uploadCover).not.toHaveBeenCalled();
  expect(upsert).not.toHaveBeenCalled();
});

it('reports an overlap and removes the staging photo', async () => {
  savedUpload.mockResolvedValue({ data: null, error: {
    code: '23505', message: 'A similar public trail already exists.', details: PUBLIC_ID,
  } });
  const res = await upload();
  expect(res.status).toBe(409);
  expect(res.body.existingTrailId).toBe(PUBLIC_ID);
  expect(removeCover).toHaveBeenCalledWith([uploadCover.mock.calls[0][0]]);
});

it('returns the saved trail on retry without writing another photo', async () => {
  findUpload.mockResolvedValue({ data: { id: UPLOAD_ID, is_public: false }, error: null });
  rpc.mockResolvedValue({ data: [{ id: UPLOAD_ID, name: 'Saved trail', lng: 16.2, lat: 39.3 }], error: null });
  const res = await upload();
  expect(res.status).toBe(200);
  expect(res.body.properties.name).toBe('Saved trail');
  expect(uploadCover).not.toHaveBeenCalled();
  expect(upsert).not.toHaveBeenCalled();
});

it('keeps the cover after a gateway timeout and reuses the saved trail on retry', async () => {
  savedUpload.mockResolvedValueOnce({ data: null, status: 504, error: { message: 'upstream request timeout' } });
  const timedOut = await upload();
  expect(timedOut.status).toBe(504);
  expect(timedOut.body.error).toContain('Try again');
  expect(removeCover).not.toHaveBeenCalled();

  findUpload.mockResolvedValueOnce({ data: { id: UPLOAD_ID }, error: null });
  rpc.mockResolvedValueOnce({ data: [{ id: UPLOAD_ID, name: 'Saved before timeout', lng: 16.2, lat: 39.3 }], error: null });
  expect((await upload()).body.properties.name).toBe('Saved before timeout');
  expect(upsert).toHaveBeenCalledTimes(1);
  expect(uploadCover).toHaveBeenCalledTimes(1);
});

it('discards the staging photo if PostgreSQL canceled the insert', async () => {
  savedUpload.mockResolvedValueOnce({ data: null, error: {
    code: '57014', message: 'canceling statement due to statement timeout',
  } });
  expect((await upload()).status).toBe(504);
  expect(removeCover).toHaveBeenCalledWith([uploadCover.mock.calls[0][0]]);
});

it('removes only the staging photo when another request has already saved the same id', async () => {
  findUpload.mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: { id: UPLOAD_ID, is_public: false }, error: null });
  savedUpload.mockResolvedValue({ data: null, error: null });
  rpc.mockResolvedValue({ data: [{ id: UPLOAD_ID, name: 'Saved by the other request', lng: 16.2, lat: 39.3 }], error: null });

  const res = await upload();
  expect(res.status).toBe(200);
  expect(res.body.properties.name).toBe('Saved by the other request');
  expect(removeCover).toHaveBeenCalledWith([uploadCover.mock.calls[0][0]]);
});

it('reports a missing visibility migration before writing a Storage object', async () => {
  findUpload.mockResolvedValue({ data: null, error: { code: '42703' } });
  expect((await upload()).status).toBe(503);
  expect(uploadCover).not.toHaveBeenCalled();
});
