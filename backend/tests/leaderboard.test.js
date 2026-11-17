import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// mock supabase auth and user client before importing the express app
vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { LEADERBOARD_LIMIT } from '../src/config/leaderboard.config.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

// sample trail uuid and endpoint paths used across tests
const TRAIL_ID = '7d3c0b8e-2f7a-4c1e-9a55-0b6f1c2d3e4f';
const TRAIL_LEADERBOARD_URL = `/api/trails/${TRAIL_ID}/leaderboard`;
const GLOBAL_LEADERBOARD_URL = '/api/leaderboard';
const rpc = vi.fn();

// helper to send an authenticated get request with a bearer token
function sendGet(url) {
  return request(app).get(url).set('Authorization', 'Bearer access-123');
}

beforeEach(() => {
  vi.clearAllMocks();
  // simulate a valid logged in user by default
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ rpc });
});

describe('GET /api/trails/:id/leaderboard', () => {
  it('returns the trail leaderboard ordered by points earned on that hike (200)', async () => {
    // mock rpc response with two ranked hikers on this trail
    rpc.mockResolvedValue({
      data: [{
        leaderboard: [
          {
            rank: 1,
            username: 'mario_rossi',
            display_name: 'Mario Rossi',
            level: 4,
            points_earned: 85,
            completed_at: '2026-11-10T10:00:00Z',
            is_mine: true,
          },
          {
            rank: 2,
            username: 'luigi_verdi',
            display_name: 'Luigi Verdi',
            level: 2,
            points_earned: 85,
            completed_at: '2026-11-11T12:30:00Z',
            is_mine: false,
          },
        ],
      }],
      error: null,
    });

    const res = await sendGet(TRAIL_LEADERBOARD_URL);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(rpc).toHaveBeenCalledWith('get_trail_leaderboard', {
      p_trail_id: TRAIL_ID,
      p_limit: LEADERBOARD_LIMIT.default,
    });
    expect(res.body).toEqual({
      trailId: TRAIL_ID,
      leaderboard: [
        {
          rank: 1,
          username: 'mario_rossi',
          displayName: 'Mario Rossi',
          level: 4,
          pointsEarned: 85,
          completedAt: '2026-11-10T10:00:00Z',
          isMine: true,
        },
        {
          rank: 2,
          username: 'luigi_verdi',
          displayName: 'Luigi Verdi',
          level: 2,
          pointsEarned: 85,
          completedAt: '2026-11-11T12:30:00Z',
          isMine: false,
        },
      ],
    });
  });

  it('passes the requested custom limit to the database rpc function', async () => {
    rpc.mockResolvedValue({ data: [{ leaderboard: [] }], error: null });

    const res = await sendGet(`${TRAIL_LEADERBOARD_URL}?limit=10`);

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('get_trail_leaderboard', {
      p_trail_id: TRAIL_ID,
      p_limit: 10,
    });
    expect(res.body).toEqual({ trailId: TRAIL_ID, leaderboard: [] });
  });

  it('responds 404 when the trail does not exist in the database', async () => {
    // sql function returns zero rows when no trail matches the trail id
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await sendGet(TRAIL_LEADERBOARD_URL);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Trail not found' });
  });

  it('responds 401 without an authorization token and reads nothing', async () => {
    const res = await request(app).get(TRAIL_LEADERBOARD_URL);

    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('responds 400 when the trail id is not a valid uuid', async () => {
    const res = await sendGet('/api/trails/not-a-uuid/leaderboard');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid trail id' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['0', '-5', String(LEADERBOARD_LIMIT.max + 1), 'abc', '', '2.5'])(
    'responds 400 when limit is invalid (%s)',
    async (invalidLimit) => {
      const res = await sendGet(`${TRAIL_LEADERBOARD_URL}?limit=${invalidLimit}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/^Invalid limit/);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it('responds 500 when the database returns an unexpected error', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await sendGet(TRAIL_LEADERBOARD_URL);

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('GET /api/leaderboard', () => {
  it('returns the global leaderboard ordered by highest level and total points (200)', async () => {
    // mock rpc response with players ranked by max level
    rpc.mockResolvedValue({
      data: [
        {
          rank: 1,
          username: 'elena_bianchi',
          display_name: 'Elena Bianchi',
          level: 7,
          total_points: 720,
          completed_trails: 11,
          is_mine: false,
        },
        {
          rank: 2,
          username: 'mario_rossi',
          display_name: 'Mario Rossi',
          level: 4,
          total_points: 410,
          completed_trails: 6,
          is_mine: true,
        },
      ],
      error: null,
    });

    const res = await sendGet(GLOBAL_LEADERBOARD_URL);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(rpc).toHaveBeenCalledWith('get_global_leaderboard', {
      p_limit: LEADERBOARD_LIMIT.default,
    });
    expect(res.body).toEqual({
      leaderboard: [
        {
          rank: 1,
          username: 'elena_bianchi',
          displayName: 'Elena Bianchi',
          level: 7,
          totalPoints: 720,
          completedTrails: 11,
          isMine: false,
        },
        {
          rank: 2,
          username: 'mario_rossi',
          displayName: 'Mario Rossi',
          level: 4,
          totalPoints: 410,
          completedTrails: 6,
          isMine: true,
        },
      ],
    });
  });

  it('passes a custom limit to get_global_leaderboard', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await sendGet(`${GLOBAL_LEADERBOARD_URL}?limit=25`);

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('get_global_leaderboard', { p_limit: 25 });
    expect(res.body).toEqual({ leaderboard: [] });
  });

  it('responds 401 without an authorization token and reads nothing', async () => {
    const res = await request(app).get(GLOBAL_LEADERBOARD_URL);

    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', String(LEADERBOARD_LIMIT.max + 1), 'xyz', '', '3.14'])(
    'responds 400 when limit is invalid (%s)',
    async (invalidLimit) => {
      const res = await sendGet(`${GLOBAL_LEADERBOARD_URL}?limit=${invalidLimit}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/^Invalid limit/);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it('responds 500 when the database returns an unexpected error', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '50000', message: 'db failure' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await sendGet(GLOBAL_LEADERBOARD_URL);

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
