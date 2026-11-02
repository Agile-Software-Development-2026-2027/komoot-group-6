// Unit tests for trailsService: Supabase is fake, the rows have the same
// shape as those returned by the SQL functions trails_in_bounds and get_trail.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../src/config/supabase.js';
import {
  toTrailFeature,
  toTrailDetailFeature,
  getTrailsInBounds,
  getTrailById,
} from '../src/services/trailsService.js';

// A row as returned by trails_in_bounds (no descent_m, no route)
const LIST_ROW = {
  id: 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2',
  name: 'Anello del Campus UniCal',
  description: 'Giro ad anello.',
  trail_type: 'hiking',
  difficulty: 'T',
  length_m: 4003,
  ascent_m: 40,
  max_elevation_m: 240,
  est_duration_min: 60,
  lng: 16.2275,
  lat: 39.359,
};

// A row as returned by get_trail (with descent_m and the route as GeoJSON)
const ROUTE = {
  type: 'LineString',
  coordinates: [[16.2275, 39.359], [16.2281, 39.3597], [16.2275, 39.359]],
};
const DETAIL_ROW = { ...LIST_ROW, descent_m: 40, route: ROUTE };

const BBOX = { minLng: 16.1, minLat: 39.25, maxLng: 16.35, maxLat: 39.45 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toTrailFeature', () => {
  it('uses the start point as geometry, as [lng, lat]', () => {
    const feature = toTrailFeature(LIST_ROW);

    expect(feature.type).toBe('Feature');
    expect(feature.id).toBe(LIST_ROW.id);
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [16.2275, 39.359] });
  });

  it('renames the columns to camelCase', () => {
    const { properties } = toTrailFeature(LIST_ROW);

    expect(properties).toEqual({
      id: LIST_ROW.id,
      name: 'Anello del Campus UniCal',
      description: 'Giro ad anello.',
      trailType: 'hiking',
      difficulty: 'T',
      lengthM: 4003,
      ascentM: 40,
      descentM: null, // trails_in_bounds does not return it
      maxElevationM: 240,
      estDurationMin: 60,
      startPoint: [16.2275, 39.359],
    });
  });
});

describe('toTrailDetailFeature', () => {
  it('uses the route as geometry', () => {
    const feature = toTrailDetailFeature(DETAIL_ROW);

    expect(feature.geometry).toEqual(ROUTE);
    expect(feature.properties.descentM).toBe(40);
    expect(feature.properties.startPoint).toEqual([16.2275, 39.359]);
  });

  it('falls back to the start point when the trail has no route', () => {
    const feature = toTrailDetailFeature({ ...DETAIL_ROW, route: null });

    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [16.2275, 39.359] });
  });
});

describe('getTrailsInBounds', () => {
  it('calls trails_in_bounds and returns a FeatureCollection', async () => {
    supabase.rpc.mockResolvedValue({ data: [LIST_ROW], error: null });

    const result = await getTrailsInBounds(BBOX);

    expect(supabase.rpc).toHaveBeenCalledWith('trails_in_bounds', {
      min_lng: 16.1,
      min_lat: 39.25,
      max_lng: 16.35,
      max_lat: 39.45,
    });
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.name).toBe('Anello del Campus UniCal');
  });

  it('returns an empty FeatureCollection when no trail is in the area', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await getTrailsInBounds(BBOX);

    expect(result).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('throws when Supabase returns an error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });

    await expect(getTrailsInBounds(BBOX)).rejects.toThrow('connection lost');
  });
});

describe('getTrailById', () => {
  it('calls get_trail and returns the trail with its route', async () => {
    supabase.rpc.mockResolvedValue({ data: [DETAIL_ROW], error: null });

    const trail = await getTrailById(LIST_ROW.id);

    expect(supabase.rpc).toHaveBeenCalledWith('get_trail', { trail_id: LIST_ROW.id });
    expect(trail.geometry).toEqual(ROUTE);
  });

  it('returns null when the trail does not exist', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    expect(await getTrailById(LIST_ROW.id)).toBeNull();
  });

  it('throws when Supabase returns an error', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'connection lost' } });

    await expect(getTrailById(LIST_ROW.id)).rejects.toThrow('connection lost');
  });
});