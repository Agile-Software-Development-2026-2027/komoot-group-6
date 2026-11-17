import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

const TRAIL_ID = '7d3c0b8e-2f7a-4c1e-9a55-0b6f1c2d3e4f';


// INSERT completed trail
const insert = vi.fn();

// GET completed trails
const order = vi.fn();
const select = vi.fn(() => ({ order }));

// DELETE completed trail
const delEq2 = vi.fn();
const delEq1 = vi.fn(() => ({ eq: delEq2 }));
const del = vi.fn(() => ({ eq: delEq1 }));

// GET trail difficulty and distance
const trailSingle = vi.fn();
const trailEq = vi.fn(() => ({ single: trailSingle }));
const trailSelect = vi.fn(() => ({ eq: trailEq }));

// GET the level saved in the profile
const profileSingle = vi.fn();
const profileEq = vi.fn(() => ({ single: profileSingle }));
const profileSelect = vi.fn(() => ({ eq: profileEq }));

// GET the level name from the levels table
const levelSingle = vi.fn();
const levelEq = vi.fn(() => ({ single: levelSingle, maybeSingle: levelSingle }));
const levelSelect = vi.fn(() => ({ eq: levelEq }));

// Return different query objects depending on table
const from = vi.fn((table) => {
  if (table === 'trails') {
    return {
      select: trailSelect
    };
  }

  if (table === 'profiles') {
    return {
      select: profileSelect
    };
  }

  if (table === 'levels') {
    return {
      select: levelSelect
    };
  }

  if (table === 'completed_trails') {
    return {
      insert,
      select,
      delete: del
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});


function complete(body) {
  return request(app)
    .post('/api/profile/completed-trails')
    .set('Authorization', 'Bearer access-123')
    .send(body);
}

function getCompleted() {
  return request(app)
    .get('/api/profile/completed-trails')
    .set('Authorization', 'Bearer access-123');
}

function uncomplete(trailId) {
  return request(app)
    .delete(`/api/profile/completed-trails/${trailId}`)
    .set('Authorization', 'Bearer access-123');
}


beforeEach(() => {
  vi.clearAllMocks();

  // Mock authenticated user
  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'abc-123',
        email: 'mario@esempio.it'
      }
    },
    error: null,
  });

  // Mock Supabase client
  supabaseAsUser.mockReturnValue({ from });

  // Mock trail metadata
  trailSingle.mockResolvedValue({
    data: {
      difficulty: 'E',
      length_m: 6400
    },
    error: null
  });

  // Mock the level saved in the profile: by default it does not change
  profileSingle.mockResolvedValue({
    data: { level: 0 },
    error: null
  });

  // Mock level name query from levels table
  levelSingle.mockImplementation(() => {
    const levelNumber = levelEq.mock.calls.at(-1)?.[1];
    const names = { 0: 'Beginner', 1: 'Walker', 2: 'Hiker' };
    return Promise.resolve({
      data: { name: names[levelNumber] ?? 'Beginner' },
      error: null
    });
  });

  // Mock successful insertion
  insert.mockResolvedValue({
    error: null
  });

  // Mock completed trails GET
  order.mockResolvedValue({
    data: [],
    error: null
  });

  // Mock completed trails DELETE
  delEq2.mockResolvedValue({
    error: null
  });
});


describe('POST /api/profile/completed-trails', () => {
  it('marks the trail as completed for the user (201)', async () => {
    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID, pointsEarned: 75, level: 0, levelName: 'Beginner', levelUp: false });
    expect(profileSelect).toHaveBeenCalledWith('level');
    expect(profileEq).toHaveBeenCalledWith('id', 'abc-123');
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('completed_trails');
    //expect(insert).toHaveBeenCalledWith({ user_id: 'abc-123', trail_id: TRAIL_ID });
    expect(insert).toHaveBeenCalledWith({user_id: 'abc-123',trail_id: TRAIL_ID,points_earned: 75});
    expect(trailSelect).toHaveBeenCalledWith(
  'difficulty, length_m'
);

expect(trailEq).toHaveBeenCalledWith(
  'id',
  TRAIL_ID
);

  });

  it('tells the frontend when the new points reach the next level', async () => {
    // The level before the insert, then the one updated by the database trigger
    profileSingle
      .mockResolvedValueOnce({ data: { level: 0 }, error: null })
      .mockResolvedValueOnce({ data: { level: 1 }, error: null });

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID, pointsEarned: 75, level: 1, levelName: 'Walker', levelUp: true });
  });

  it('gives fewer points to a user with a higher level', async () => {
    // Level 2: 80% of the 75 points of the trail
    profileSingle.mockResolvedValue({ data: { level: 2 }, error: null });

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ user_id: 'abc-123', trail_id: TRAIL_ID, points_earned: 60 });
    expect(res.body).toEqual({ trailId: TRAIL_ID, pointsEarned: 60, level: 2, levelName: 'Hiker', levelUp: false });
  });

  it('responds 500 when the level cannot be read', async () => {
    profileSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(500);
    expect(insert).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

it('returns 404 when the trail does not exist', async () => {
  trailSingle.mockResolvedValue({
    data: null,
    error: {
      code: 'PGRST116',
      message: 'No rows found'
    }
  });

  const res = await complete({
    trailId: TRAIL_ID
  });

  expect(res.status).toBe(404);
  expect(res.body.error).toBe('Trail not found');

  // No completion should be inserted
  expect(insert).not.toHaveBeenCalled();
});


  it('responds 401 without a token and writes nothing', async () => {
    const res = await request(app).post('/api/profile/completed-trails').send({ trailId: TRAIL_ID });

    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('responds 400 when trailId is missing or not a string', async () => {
    for (const body of [{}, { trailId: '  ' }, { trailId: 42 }]) {
      const res = await complete(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('trailId is required');
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ['23505', 409, 'Trail already completed'],
    ['23503', 404, 'Trail not found'],
    ['22P02', 400, 'Invalid trail id'],
  ])('turns the Postgres error %s into %i', async (code, status, message) => {
    insert.mockResolvedValue({ error: { code, message: 'db error' } });

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(status);
    expect(res.body.error).toBe(message);
  });

  it('responds 500 for an unexpected database error', async () => {
    insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('GET /api/profile/completed-trails', () => {
  it('returns the list of trails completed by the user (200)', async () => {
    const mockData = [
      { trail_id: TRAIL_ID, completed_at: '2026-11-05T20:00:00Z' },
    ];
    order.mockResolvedValue({ data: mockData, error: null });

    const res = await getCompleted();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('completed_trails');
    expect(select).toHaveBeenCalledWith('trail_id, completed_at');
    expect(order).toHaveBeenCalledWith('completed_at', { ascending: false });
  });

  it('responds 401 when the user is not logged in', async () => {
    const res = await request(app).get('/api/profile/completed-trails');

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('responds 500 when the database returns an error', async () => {
    order.mockResolvedValue({ data: null, error: new Error('DB read error') });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await getCompleted();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('DELETE /api/profile/completed-trails/:trailId', () => {
  it('removes the completed trail for the user (204)', async () => {
    const res = await uncomplete(TRAIL_ID);

    expect(res.status).toBe(204);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('completed_trails');
    expect(del).toHaveBeenCalled();
    expect(delEq1).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(delEq2).toHaveBeenCalledWith('trail_id', TRAIL_ID);
  });

  it('responds 401 without a token', async () => {
    const res = await request(app).delete(`/api/profile/completed-trails/${TRAIL_ID}`);

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('responds 400 when the id is not a valid UUID', async () => {
    delEq2.mockResolvedValue({ error: { code: '22P02', message: 'invalid input syntax for type uuid' } });

    const res = await uncomplete('not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid trail id');
  });

  it('responds 500 for an unexpected database error', async () => {
    delEq2.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await uncomplete(TRAIL_ID);

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});