import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api.js';
import {
  completeTrail,
  getCompletedTrails,
  getNearbyTrails,
  getSavedTrails,
  getTrail,
  getTrailsInBounds,
  saveTrail,
  uncompleteTrail,
} from './trailsService.js';
import { buildElevationProfile, calculateTrailStats } from '../utils/trailStats.js';

// Cartella delle immagini finta: c'è solo l'immagine dell'"Anello del Campus UniCal"
vi.mock('../utils/trailImages.js', () => ({
  trailImageUrl: (name) => (name === 'Anello del Campus UniCal' ? '/assets/anello.jpg' : null),
}));

// apiRequest usa fetch: lo si simula per vedere l'indirizzo richiesto
function mockFetch(body, { ok = true, status = 200 } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_LOCAL_GPX', undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('trailsService', () => {
  it('asks for the trails in the area with the bbox in the query string', async () => {
    const collection = { type: 'FeatureCollection', features: [] };
    const fetchMock = mockFetch(collection);

    const result = await getTrailsInBounds([16.1, 39.25, 16.35, 39.45]);

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/trails\?bbox=16\.1,39\.25,16\.35,39\.45$/);
    expect(result).toEqual(collection);
  });

  it('asks for one trail by id, without login', async () => {
    const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };
    const fetchMock = mockFetch(feature);

    const result = await getTrail('abc-123');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/trails\/abc-123$/);
    expect(options.headers.Authorization).toBeUndefined();
    expect(result).toEqual(feature);
  });

  it('throws the backend error message', async () => {
    mockFetch({ error: 'Trail not found' }, { ok: false, status: 404 });

    await expect(getTrail('abc-123')).rejects.toMatchObject({ message: 'Trail not found', status: 404 });
  });
});

// Risposta del backend: una FeatureCollection con il punto di partenza come geometria
function nearbyResponse(...features) {
  return { type: 'FeatureCollection', features };
}

describe('getNearbyTrails', () => {
  it('searches around the point with the radius in meters', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      nearbyResponse({
        type: 'Feature',
        id: 't1',
        geometry: { type: 'Point', coordinates: [16.21, 39.37] },
        properties: {
          id: 't1',
          name: 'Crati',
          difficulty: 'T',
          lengthM: 8400,
          ascentM: 320,
          distanceM: 850,
          startPoint: [16.21, 39.37],
          trailType: 'hiking',
        },
      })
    );

    const trails = await getNearbyTrails(authFetch, { lat: 39.356, lng: 16.228, radiusKm: 2.5 });

    expect(authFetch).toHaveBeenCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=2500');
    // Solo i campi usati dalle card: start viene dalla geometria, ascentM diventa elevationGainM,
    // la difficoltà CAI diventa easy/moderate/hard, senza foto imageUrl è null, saved è sempre un booleano
    expect(trails).toEqual([
      {
        id: 't1',
        name: 'Crati',
        difficulty: 'easy',
        lengthM: 8400,
        elevationGainM: 320,
        distanceM: 850,
        start: [16.21, 39.37],
        imageUrl: null,
        saved: false,
      },
    ]);
  });

  it('converts the CAI difficulty to the levels of the filters', async () => {
    const levels = ['T', 'E', 'EE', 'EEA', 'X', undefined];
    const authFetch = vi.fn().mockResolvedValue(
      nearbyResponse(...levels.map((difficulty, i) => ({ properties: { id: `t${i}`, difficulty } })))
    );

    const trails = await getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 });

    // Un livello sconosciuto resta com'è, uno mancante diventa null
    expect(trails.map((trail) => trail.difficulty)).toEqual(['easy', 'moderate', 'hard', 'hard', 'X', null]);
  });

  it('sets start to null when the start point is missing or invalid', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      nearbyResponse(
        { properties: { id: 't1' } },
        { geometry: { type: 'Point', coordinates: ['16.2', 39.3] }, properties: { id: 't2' } },
        { geometry: { type: 'Point', coordinates: [16.2] }, properties: { id: 't3' } }
      )
    );

    const trails = await getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 });

    expect(trails.map((trail) => trail.start)).toEqual([null, null, null]);
  });

  it('takes the image from the folder using the trail name', async () => {
    const authFetch = vi.fn().mockResolvedValue(
      nearbyResponse(
        { properties: { id: 't1', name: 'Anello del Campus UniCal' } },
        { properties: { id: 't2', name: 'Monte Curcio da Camigliatello' } }
      )
    );

    const trails = await getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 });

    expect(trails.map((trail) => trail.imageUrl)).toEqual(['/assets/anello.jpg', null]);
  });

  it('returns an empty list when the response has no trails', async () => {
    const authFetch = vi.fn().mockResolvedValue({});

    await expect(getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 })).resolves.toEqual([]);
  });
});

describe('saveTrail', () => {
  it('sends the trail id to the profile and returns saved', async () => {
    const authFetch = vi.fn().mockResolvedValue({ trailId: 't1' });

    await expect(saveTrail(authFetch, 't1')).resolves.toBe('saved');

    expect(authFetch).toHaveBeenCalledWith('/profile/saved-trails', { method: 'POST', body: { trailId: 't1' } });
  });

  it('returns already-saved for a trail that was already saved (409), but throws other errors', async () => {
    const alreadySaved = vi.fn().mockRejectedValue(new ApiError('Trail already saved', 409));
    await expect(saveTrail(alreadySaved, 't1')).resolves.toBe('already-saved');

    const serverDown = vi.fn().mockRejectedValue(new ApiError('Cannot reach the server.', 0));
    await expect(saveTrail(serverDown, 't1')).rejects.toThrow('Cannot reach the server.');
  });
});

describe('getSavedTrails', () => {
  it('fetches the list of saved trails from the profile', async () => {
    const savedList = [{ trail_id: 't1', created_at: '2026-11-06T10:00:00Z' }];
    const authFetch = vi.fn().mockResolvedValue(savedList);

    await expect(getSavedTrails(authFetch)).resolves.toEqual(savedList);

    expect(authFetch).toHaveBeenCalledWith('/profile/saved-trails');
  });
});

describe('completeTrail and getCompletedTrails', () => {
  it('sends the completed trail id to the profile', async () => {
    const authFetch = vi.fn().mockResolvedValue({ trailId: 't1' });

    await completeTrail(authFetch, 't1');

    expect(authFetch).toHaveBeenCalledWith('/profile/completed-trails', { method: 'POST', body: { trailId: 't1' } });
  });

  it('treats an already completed trail (409) as success, but not other errors', async () => {
    const alreadyCompleted = vi.fn().mockRejectedValue(new ApiError('Trail already completed', 409));
    await expect(completeTrail(alreadyCompleted, 't1')).resolves.toBeUndefined();

    const serverDown = vi.fn().mockRejectedValue(new ApiError('Cannot reach the server.', 0));
    await expect(completeTrail(serverDown, 't1')).rejects.toThrow('Cannot reach the server.');
  });

  it('fetches the list of completed trails from the profile', async () => {
    const mockList = [{ trail_id: 't1', completed_at: '2026-11-05T20:00:00Z' }];
    const authFetch = vi.fn().mockResolvedValue(mockList);

    const result = await getCompletedTrails(authFetch);

    expect(authFetch).toHaveBeenCalledWith('/profile/completed-trails');
    expect(result).toEqual(mockList);
  });

  it('removes the completed trail from profile with DELETE', async () => {
    const authFetch = vi.fn().mockResolvedValue();

    await uncompleteTrail(authFetch, 't1');

    expect(authFetch).toHaveBeenCalledWith('/profile/completed-trails/t1', { method: 'DELETE' });
  });
});

describe('original GPX data explicitly enabled for local development', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_USE_LOCAL_GPX', 'true');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns nine API-compatible start points and all 31,662 original profile points without HTTP requests', async () => {
    const collection = await getTrailsInBounds([-180, -90, 180, 90]);
    expect(collection.type).toBe('FeatureCollection');
    expect(collection.features).toHaveLength(9);
    expect(new Set(collection.features.map((feature) => feature.id)).size).toBe(9);

    let pointCount = 0;
    for (const start of collection.features) {
      expect(start.geometry).toEqual({ type: 'Point', coordinates: start.properties.startPoint });
      expect(start.geometry.coordinates).toHaveLength(2);
      expect(start.properties.id).toBe(start.id);
      const detail = await getTrail(start.id);
      const profile = buildElevationProfile(detail);
      const stats = calculateTrailStats(detail);
      expect(detail.geometry.type).toBe('LineString');
      expect(detail.properties).toEqual(start.properties);
      expect(profile).toHaveLength(detail.geometry.coordinates.length);
      expect(profile.every((point, i) => point.coordinates === detail.geometry.coordinates[i])).toBe(true);
      expect(detail.properties.lengthM).toBe(Math.round(stats.distanceKm * 1000));
      expect(detail.properties.ascentM).toBe(Math.round(stats.elevationGain));
      pointCount += profile.length;
    }
    expect(pointCount).toBe(31662);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('filters the visible area and loads the exact Cozzo Cervello XYZ track', async () => {
    const { features } = await getTrailsInBounds([16.08, 39.42, 16.09, 39.43]);
    expect(features.map((feature) => feature.properties.name)).toEqual(['Cozzo Cervello']);
    const detail = await getTrail(features[0].id);
    expect(detail.geometry.coordinates).toHaveLength(789);
    expect(detail.geometry.coordinates[0]).toEqual([16.084846, 39.427135, 1179.565814]);
    expect((await getTrailsInBounds([10, 40, 11, 41])).features).toEqual([]);
  });

  it('preserves the GPX whose original elevations are all zero', async () => {
    const { features } = await getTrailsInBounds([-180, -90, 180, 90]);
    const start = features.find((feature) => feature.properties.name === 'Piccole Dolomiti - Frascineto');
    const profile = buildElevationProfile(await getTrail(start.id));
    expect(profile).toHaveLength(16486);
    expect(profile.every((point) => point.elevation === 0)).toBe(true);
  });

  it('reports an unknown local ID without falling back to the database', async () => {
    await expect(getTrail('unknown')).rejects.toMatchObject({ message: 'Trail not found', status: 404 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the API in production even when the local GPX flag is true', async () => {
    vi.stubEnv('DEV', false);
    const collection = { type: 'FeatureCollection', features: [] };
    const fetchMock = mockFetch(collection);
    expect(await getTrailsInBounds([16, 39, 17, 40])).toEqual(collection);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/trails\?bbox=16,39,17,40$/);
    await getTrail('db-trail');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/trails\/db-trail$/);
  });
});
