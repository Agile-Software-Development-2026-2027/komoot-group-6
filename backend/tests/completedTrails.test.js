import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

const TRAIL_ID = '7d3c0b8e-2f7a-4c1e-9a55-0b6f1c2d3e4f';

const insert = vi.fn();
const order = vi.fn();
const select = vi.fn(() => ({ order }));
const from = vi.fn(() => ({ insert, select }));

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

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ from });
  insert.mockResolvedValue({ error: null });
  order.mockResolvedValue({ data: [], error: null });
});

describe('POST /api/profile/completed-trails', () => {
  it('segna il sentiero come completato per l\'utente (201)', async () => {
    const res = await complete({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID });
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('completed_trails');
    expect(insert).toHaveBeenCalledWith({ user_id: 'abc-123', trail_id: TRAIL_ID });
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
