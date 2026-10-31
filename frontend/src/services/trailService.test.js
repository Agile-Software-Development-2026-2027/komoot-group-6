import { expect, test, vi } from 'vitest';
import { ApiError } from './api.js';
import { getNearbyTrails, saveTrail } from './trailService.js';

test('getNearbyTrails searches around the point with the radius in meters', async () => {
  const authFetch = vi.fn().mockResolvedValue({
    trails: [
      {
        id: 't1',
        name: 'Crati',
        difficulty: 'easy',
        lengthM: 8400,
        elevationGainM: 320,
        distanceM: 850,
        start: [16.21, 39.37, 210],
        extra: 'x',
      },
    ],
  });

  const trails = await getNearbyTrails(authFetch, { lat: 39.356, lng: 16.228, radiusKm: 2.5 });

  expect(authFetch).toHaveBeenCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=2500');
  // Solo i campi usati dalle card: start diventa [lng, lat], senza foto imageUrl è null,
  // saved diventa sempre un booleano
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

test('getNearbyTrails sets start to null when the start point is missing or invalid', async () => {
  const authFetch = vi.fn().mockResolvedValue({
    trails: [{ id: 't1' }, { id: 't2', start: ['16.2', 39.3] }, { id: 't3', start: [16.2] }],
  });

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
