// On first commit there are seven tests
// the first six are for the new nearby trails search (SUB-19.1), the last one is for the existing /api/trails/:id route.
// 
// Tests for GET /api/trails/nearby (SUB-19.1).
// REAL: the Express app, the validation, the controller, trailsService.
// FAKE: Supabase (supabase.rpc).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';
import { getNearbyTrails, toNearbyFeature } from '../src/services/trailsService.js';

// A row as returned by nearby_trails: the list columns plus distance_m
const ROW = {
  id: 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2',
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
  distance_m: 185.6,
};

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockResolvedValue({ data: [ROW], error: null });
});

describe('GET /api/trails/nearby', () => {
  it('returns the nearby trails as start points, with the distance (200)', async () => {
    const res = await request(app).get('/api/trails/nearby?lat=39.3561&lng=16.228');

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features).toHaveLength(1);
    expect(res.body.features[0].geometry).toEqual({ type: 'Point', coordinates: [16.2275, 39.359] });
    expect(res.body.features[0].properties).toMatchObject({
      id: ROW.id,
      name: 'Anello del Campus UniCal',
      difficulty: 'T',
      lengthM: 4003,
      distanceM: 186,
    });
  });

  it('works without login, like the other trail routes', async () => {
    const res = await request(app).get('/api/trails/nearby?lat=39.3561&lng=16.228');

    expect(res.status).toBe(200);
  });

  it('calls nearby_trails with the default radius and limit', async () => {
    await request(app).get('/api/trails/nearby?lat=39.3561&lng=16.228');

    expect(supabase.rpc).toHaveBeenCalledWith('nearby_trails', {
      origin_lat: 39.3561,
      origin_lng: 16.228,
      radius_m: 5000,
      max_results: 50,
    });
  });

  it('passes the requested radius and limit', async () => {
    await request(app).get('/api/trails/nearby?lat=39.3561&lng=16.228&radius=12000&limit=10');

    expect(supabase.rpc).toHaveBeenCalledWith('nearby_trails', expect.objectContaining({
      radius_m: 12000,
      max_results: 10,
    }));
  });

  it('is not mistaken for a trail id (the route is above /:id)', async () => {
    const res = await request(app).get('/api/trails/nearby');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/^Invalid lat/);
  });

  it.each([
    ['without lat', '?lng=16.228', 'lat'],
    ['with an empty lat', '?lat=&lng=16.228', 'lat'],
    ['with a lat out of range', '?lat=91&lng=16.228', 'lat'],
    ['with lat sent twice', '?lat=39&lat=40&lng=16.228', 'lat'],
    ['with a lng that is not a number', '?lat=39.3561&lng=abc', 'lng'],
    ['with a lng out of range', '?lat=39.3561&lng=-181', 'lng'],
    ['with a radius of 0', '?lat=39.3561&lng=16.228&radius=0', 'radius'],
    ['with a radius over 50 km', '?lat=39.3561&lng=16.228&radius=50001', 'radius'],
    ['with an empty radius', '?lat=39.3561&lng=16.228&radius=', 'radius'],
    ['with a limit of 0', '?lat=39.3561&lng=16.228&limit=0', 'limit'],
    ['with a limit over 100', '?lat=39.3561&lng=16.228&limit=101', 'limit'],
    ['with a decimal limit', '?lat=39.3561&lng=16.228&limit=2.5', 'limit'],
  ])('responds 400 %s, without calling Supabase', async (_, query, field) => {
    const res = await request(app).get(`/api/trails/nearby${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(new RegExp(`^Invalid ${field}`));
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('responds 500 when the database fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });

    const res = await request(app).get('/api/trails/nearby?lat=39.3561&lng=16.228');

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe('getNearbyTrails', () => {
  it('returns an empty FeatureCollection when no trail is nearby', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await getNearbyTrails({ lat: 45.464, lng: 9.19, radius: 5000, limit: 50 });

    expect(result).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('throws when Supabase returns an error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });

    await expect(getNearbyTrails({ lat: 39.3561, lng: 16.228, radius: 5000, limit: 50 }))
      .rejects.toThrow('connection lost');
  });
});

describe('toNearbyFeature', () => {
  it('is a list Feature (start point) plus distanceM, rounded to the meter', () => {
    const feature = toNearbyFeature(ROW);

    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [16.2275, 39.359] });
    expect(feature.properties.startPoint).toEqual([16.2275, 39.359]);
    expect(feature.properties.descentM).toBe(40);
    expect(feature.properties.distanceM).toBe(186);
  });
});