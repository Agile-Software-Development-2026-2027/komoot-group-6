import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

const USER_ID = '0ccf0000-0000-4000-8000-000000000001';
const OTHER_ID = '0ccf0000-0000-4000-8000-000000000002';
const TRAIL_ID = '7a1f0000-0000-4000-8000-000000000009';
const dataFetch = vi.fn();
const open = (username) => request(app)
  .get(`/api/profile/users/${encodeURIComponent(username)}`)
  .set('Authorization', 'Bearer access-123');

const profile = (overrides = {}) => ({
  id: OTHER_ID,
  username: 'alba_trek',
  display_name: 'Alba',
  bio: 'Weekend hiker',
  level: 2,
  created_at: '2026-01-05T10:00:00Z',
  is_public: true,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  supabaseAsUser.mockReturnValue(createClient('https://profiles.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: dataFetch },
  }));
});

it('requires authentication', async () => {
  const res = await request(app).get('/api/profile/users/alba_trek');
  expect(res.status).toBe(401);
  expect(dataFetch).not.toHaveBeenCalled();
});

it('rejects a blank username', async () => {
  const res = await open('   ');
  expect(res.status).toBe(400);
  expect(dataFetch).not.toHaveBeenCalled();
});

it('answers 404 when the username does not exist', async () => {
  dataFetch.mockResolvedValueOnce(Response.json([]));

  const res = await open('nobody');

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'Profile not found' });
  expect(dataFetch).toHaveBeenCalledTimes(1);
});

it('answers 403 for a private profile of another user, without reading its trails', async () => {
  dataFetch.mockResolvedValueOnce(Response.json([profile({ is_public: false })]));

  const res = await open('alba_trek');

  expect(res.status).toBe(403);
  expect(res.body).toEqual({ error: 'Profile is private' });
  expect(dataFetch).toHaveBeenCalledTimes(1);
});

it('returns level, points and completed trails of a public profile', async () => {
  dataFetch.mockImplementation(async (input) => {
    const { pathname } = new URL(input);
    if (pathname === '/rest/v1/profiles') return Response.json([profile()]);
    if (pathname === '/rest/v1/rpc/get_public_profile_points') {
      return Response.json([{ profile_id: OTHER_ID, total_points: 150 }]);
    }
    if (pathname === '/rest/v1/rpc/get_public_profile_completed') {
      return Response.json([{ trail_id: TRAIL_ID, completed_at: '2026-03-01T10:00:00Z' }]);
    }
    if (pathname === '/rest/v1/levels') {
      return Response.json([
        { level: 2, min_points: 100, name: 'Hiker' },
        { level: 3, min_points: 200, name: 'Explorer' },
      ]);
    }
    throw new Error(`unexpected request ${pathname}`);
  });

  const res = await open('alba_trek');

  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toBe('no-store');
  expect(res.body).toEqual({
    username: 'alba_trek',
    displayName: 'Alba',
    bio: 'Weekend hiker',
    createdAt: '2026-01-05T10:00:00Z',
    isMine: false,
    totalPoints: 150,
    completedTrails: [{ trailId: TRAIL_ID, completedAt: '2026-03-01T10:00:00Z' }],
    level: {
      number: 2,
      name: 'Hiker',
      minPoints: 100,
      nextLevelPoints: 200,
      nextLevelName: 'Explorer',
      pointsToNext: 50,
    },
  });
  const profileCall = dataFetch.mock.calls.map(([input]) => new URL(input))
    .find((url) => url.pathname === '/rest/v1/profiles');
  expect(profileCall.searchParams.get('username')).toBe('eq.alba_trek');
});

it('marks the profile of the logged-in user as mine, even if it is private', async () => {
  dataFetch.mockImplementation(async (input) => {
    const { pathname } = new URL(input);
    if (pathname === '/rest/v1/profiles') return Response.json([profile({ id: USER_ID, is_public: false })]);
    return Response.json([]);
  });

  const res = await open('alba_trek');

  expect(res.status).toBe(200);
  expect(res.body.isMine).toBe(true);
  expect(res.body.totalPoints).toBe(0);
  expect(res.body.completedTrails).toEqual([]);
});
