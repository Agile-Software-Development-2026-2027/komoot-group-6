import { expect, test, vi } from 'vitest';
import { ApiError } from './api.js';
import { getNearbyTrails, saveTrail } from './trailService.js';

// Risposta del backend: una FeatureCollection con il punto di partenza come geometria
function nearbyResponse(...features) {
  return { type: 'FeatureCollection', features };
}

test('getNearbyTrails searches around the point with the radius in meters', async () => {
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

test('getNearbyTrails converts the CAI difficulty to the levels of the filters', async () => {
  const levels = ['T', 'E', 'EE', 'EEA', 'X', undefined];
  const authFetch = vi.fn().mockResolvedValue(
    nearbyResponse(...levels.map((difficulty, i) => ({ properties: { id: `t${i}`, difficulty } })))
  );

  const trails = await getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 });

  // Un livello sconosciuto resta com'è, uno mancante diventa null
  expect(trails.map((trail) => trail.difficulty)).toEqual(['easy', 'moderate', 'hard', 'hard', 'X', null]);
});

test('getNearbyTrails sets start to null when the start point is missing or invalid', async () => {
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

test('getNearbyTrails returns an empty list when the response has no trails', async () => {
  const authFetch = vi.fn().mockResolvedValue({});

  await expect(getNearbyTrails(authFetch, { lat: 0, lng: 0, radiusKm: 1 })).resolves.toEqual([]);
});

test('saveTrail sends the trail id to the profile', async () => {
  const authFetch = vi.fn().mockResolvedValue({ trailId: 't1' });

  await saveTrail(authFetch, 't1');

  expect(authFetch).toHaveBeenCalledWith('/profile/saved-trails', { method: 'POST', body: { trailId: 't1' } });
});

test('saveTrail treats an already saved trail (409) as success, but not other errors', async () => {
  const alreadySaved = vi.fn().mockRejectedValue(new ApiError('Trail already saved', 409));
  await expect(saveTrail(alreadySaved, 't1')).resolves.toBeUndefined();

  const serverDown = vi.fn().mockRejectedValue(new ApiError('Cannot reach the server.', 0));
  await expect(saveTrail(serverDown, 't1')).rejects.toThrow('Cannot reach the server.');
});
