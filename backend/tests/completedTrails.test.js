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

// Return different query objects depending on table
const from = vi.fn((table) => {
  if (table === 'trails') {
    return {
      select: trailSelect
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
  it('segna il sentiero come completato per l\'utente (201)', async () => {
    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID });
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


  it('risponde 401 senza token e non scrive nulla', async () => {
    const res = await request(app).post('/api/profile/completed-trails').send({ trailId: TRAIL_ID });

    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('risponde 400 se trailId manca o non è una stringa', async () => {
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
  ])('traduce l\'errore Postgres %s in %i', async (code, status, message) => {
    insert.mockResolvedValue({ error: { code, message: 'db error' } });

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(status);
    expect(res.body.error).toBe(message);
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('GET /api/profile/completed-trails', () => {
  it('restituisce l\'elenco dei sentieri completati per l\'utente (200)', async () => {
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

  it('risponde 401 se l\'utente non è autenticato', async () => {
    const res = await request(app).get('/api/profile/completed-trails');

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('risponde 500 se il database restituisce un errore', async () => {
    order.mockResolvedValue({ data: null, error: new Error('DB read error') });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await getCompleted();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('DELETE /api/profile/completed-trails/:trailId', () => {
  it('rimuove il sentiero completato per l\'utente (204)', async () => {
    const res = await uncomplete(TRAIL_ID);

    expect(res.status).toBe(204);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('completed_trails');
    expect(del).toHaveBeenCalled();
    expect(delEq1).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(delEq2).toHaveBeenCalledWith('trail_id', TRAIL_ID);
  });

  it('risponde 401 senza token', async () => {
    const res = await request(app).delete(`/api/profile/completed-trails/${TRAIL_ID}`);

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('risponde 400 se l\'id non è un UUID valido', async () => {
    delEq2.mockResolvedValue({ error: { code: '22P02', message: 'invalid input syntax for type uuid' } });

    const res = await uncomplete('not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid trail id');
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    delEq2.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await uncomplete(TRAIL_ID);

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
