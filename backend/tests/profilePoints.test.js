import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

// The rows of the levels table (database/levels.sql)
const LEVELS = [
  { level: 0, min_points: 0, name: 'Beginner' },
  { level: 1, min_points: 30, name: 'Walker' },
  { level: 2, min_points: 120, name: 'Hiker' },
];

// SELECT points_earned FROM completed_trails WHERE user_id = ...
const pointsEq = vi.fn();
const pointsSelect = vi.fn(() => ({ eq: pointsEq }));

// SELECT level FROM profiles WHERE id = ... (one row)
const profileSingle = vi.fn();
const profileEq = vi.fn(() => ({ single: profileSingle }));
const profileSelect = vi.fn(() => ({ eq: profileEq }));

// SELECT level, min_points, name FROM levels
const levelsSelect = vi.fn();

const from = vi.fn((table) => {
  if (table === 'completed_trails') return { select: pointsSelect };
  if (table === 'profiles') return { select: profileSelect };
  if (table === 'levels') return { select: levelsSelect };
  throw new Error(`Unexpected table: ${table}`);
});

function getPoints() {
  return request(app).get('/api/profile/points').set('Authorization', 'Bearer access-123');
}

beforeEach(() => {
  vi.clearAllMocks();

  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ from });

  // By default: two completed trails (115 points), level 1
  pointsEq.mockResolvedValue({ data: [{ points_earned: 75 }, { points_earned: 40 }], error: null });
  profileSingle.mockResolvedValue({ data: { level: 1 }, error: null });
  levelsSelect.mockResolvedValue({ data: LEVELS, error: null });
});

describe('GET /api/profile/points', () => {
  it('returns the points, the completed trails and the level (200)', async () => {
    const res = await getPoints();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalPoints: 115,
      completedRoutes: 2,
      level: { number: 1, name: 'Walker', nextLevelPoints: 120, pointsToNext: 5 },
    });
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(pointsEq).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(profileEq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('starts from 0 points and level 0 without completed trails', async () => {
    pointsEq.mockResolvedValue({ data: [], error: null });
    profileSingle.mockResolvedValue({ data: { level: 0 }, error: null });

    const res = await getPoints();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalPoints: 0,
      completedRoutes: 0,
      level: { number: 0, name: 'Beginner', nextLevelPoints: 30, pointsToNext: 30 },
    });
  });

  it('has no next level at the highest level', async () => {
    pointsEq.mockResolvedValue({ data: [{ points_earned: 125 }], error: null });
    profileSingle.mockResolvedValue({ data: { level: 2 }, error: null });

    const res = await getPoints();

    expect(res.body.level).toEqual({ number: 2, name: 'Hiker', nextLevelPoints: null, pointsToNext: 0 });
  });

  it('never returns negative points to the next level', async () => {
    // The thresholds changed and the saved level was not calculated again yet
    pointsEq.mockResolvedValue({ data: [{ points_earned: 125 }], error: null });
    profileSingle.mockResolvedValue({ data: { level: 1 }, error: null });

    const res = await getPoints();

    expect(res.body.level.pointsToNext).toBe(0);
  });

  it('responds 401 without a token and reads nothing', async () => {
    const res = await request(app).get('/api/profile/points');

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['the points', () => pointsEq.mockResolvedValue({ data: null, error: { message: 'db error' } })],
    ['the level', () => profileSingle.mockResolvedValue({ data: null, error: { message: 'db error' } })],
    ['the levels table', () => levelsSelect.mockResolvedValue({ data: null, error: { message: 'db error' } })],
  ])('responds 500 when %s cannot be read', async (_what, breakQuery) => {
    breakQuery();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await getPoints();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});