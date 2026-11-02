// Integration tests for GET /api/trails and GET /api/trails/:id.
// REAL: the Express app, the validation, the controller, trailsService.
// FAKE: Supabase (supabase.rpc).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';

const ROW = {
  id: TRAIL_ID,
  name: 'Anello del Campus UniCal',
  description: 'Giro ad anello.',
  trail_type: 'hiking',
  difficulty: 'T',
  length_m: 4003,
  ascent_m: 40,
  descent_m: 40,
  max_elevation_m: 240,
  est_duration_min: 60,
  lng: 16.2275,
  lat: 39.359,
  route: { type: 'LineString', coordinates: [[16.2275, 39.359], [16.2281, 39.3597]] },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/trails', () => {
  it('returns the trails in the area as a FeatureCollection (200)', async () => {
    supabase.rpc.mockResolvedValue({ data: [ROW], error: null });

    const res = await request(app).get('/api/trails?bbox=16.1,39.25,16.35,39.45');

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features[0].geometry).toEqual({ type: 'Point', coordinates: [16.2275, 39.359] });
    expect(supabase.rpc).toHaveBeenCalledWith('trails_in_bounds', {
      min_lng: 16.1,
      min_lat: 39.25,
      max_lng: 16.35,
      max_lat: 39.45,
    });
  });

  it.each([
    ['missing', ''],
    ['with 3 values', '?bbox=16.1,39.25,16.35'],
    ['with text', '?bbox=a,b,c,d'],
    ['out of range', '?bbox=16.1,39.25,16.35,99'],
    ['with min greater than max', '?bbox=16.35,39.25,16.1,39.45'],
  ])('responds 400 when the bbox is %s, without calling Supabase', async (_, query) => {
    const res = await request(app).get(`/api/trails${query}`);

    expect(res.status).toBe(400);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe('GET /api/trails/:id', () => {
  it('returns the trail with its route (200)', async () => {
    supabase.rpc.mockResolvedValue({ data: [ROW], error: null });

    const res = await request(app).get(`/api/trails/${TRAIL_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.geometry.type).toBe('LineString');
    expect(res.body.properties.name).toBe('Anello del Campus UniCal');
    expect(supabase.rpc).toHaveBeenCalledWith('get_trail', { trail_id: TRAIL_ID });
  });

  it('responds 404 when the trail does not exist', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const res = await request(app).get(`/api/trails/${TRAIL_ID}`);

    expect(res.status).toBe(404);
  });

  it('responds 400 when the id is not a UUID, without calling Supabase', async () => {
    const res = await request(app).get('/api/trails/123');

    expect(res.status).toBe(400);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('responds 500 when the database fails', async () => {
    // Silence the expected error printed by errorHandler
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });

    const res = await request(app).get(`/api/trails/${TRAIL_ID}`);

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});