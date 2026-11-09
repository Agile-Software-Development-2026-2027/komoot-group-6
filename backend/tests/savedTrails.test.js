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
const eq = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ eq }));
// Delete chain: .delete().eq('user_id', ...).eq('trail_id', ...)
const deleteEqTrail = vi.fn();
const deleteEqUser = vi.fn(() => ({ eq: deleteEqTrail }));
const remove = vi.fn(() => ({ eq: deleteEqUser }));
const from = vi.fn(() => ({ insert, select, delete: remove }));

// Sends the request as a logged-in user
function save(body) {
  return request(app)
    .post('/api/profile/saved-trails')
    .set('Authorization', 'Bearer access-123')
    .send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  // By default the token is valid and the insert succeeds
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ from });
  insert.mockResolvedValue({ error: null });
  order.mockResolvedValue({ data: [], error: null });
  deleteEqTrail.mockResolvedValue({ error: null });
});

describe('GET /api/profile/saved-trails', () => {
  // Sends the request as a logged-in user
  function getSaved() {
    return request(app)
      .get('/api/profile/saved-trails')
      .set('Authorization', 'Bearer access-123');
  }

  it('restituisce i sentieri salvati dall\'utente, dal più recente (200)', async () => {
    const rows = [{ trail_id: TRAIL_ID, created_at: '2026-11-06T10:00:00Z' }];
    order.mockResolvedValue({ data: rows, error: null });

    const res = await getSaved();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('saved_trails');
    expect(select).toHaveBeenCalledWith('trail_id, created_at');
    expect(eq).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('restituisce una lista vuota se il database non manda righe', async () => {
    order.mockResolvedValue({ data: null, error: null });

    const res = await getSaved();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('risponde 401 senza token e non legge nulla', async () => {
    const res = await request(app).get('/api/profile/saved-trails');

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    order.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await getSaved();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('POST /api/profile/saved-trails', () => {
  it('salva il sentiero per l\'utente del token (201)', async () => {
    const res = await save({ trailId: TRAIL_ID });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID });
    // The query runs with the user's token, so the RLS policies apply
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('saved_trails');
    expect(insert).toHaveBeenCalledWith({ user_id: 'abc-123', trail_id: TRAIL_ID });
  });

  it('risponde 401 senza token e non scrive nulla', async () => {
    const res = await request(app).post('/api/profile/saved-trails').send({ trailId: TRAIL_ID });

    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('risponde 400 se trailId manca o non è una stringa', async () => {
    for (const body of [{}, { trailId: '  ' }, { trailId: 42 }]) {
      const res = await save(body);
      expect(res.status).toBe(400);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ['23505', 409, 'Trail already saved'],
    ['23503', 404, 'Trail not found'],
    ['22P02', 400, 'Invalid trail id'],
  ])('traduce l\'errore Postgres %s in %i', async (code, status, message) => {
    insert.mockResolvedValue({ error: { code, message: 'db error' } });

    const res = await save({ trailId: TRAIL_ID });

    expect(res.status).toBe(status);
    expect(res.body.error).toBe(message);
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    // errorHandler prints the error: here we silence it
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await save({ trailId: TRAIL_ID });

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('DELETE /api/profile/saved-trails/:trailId', () => {
  // Sends the request as a logged-in user
  function unsave(trailId = TRAIL_ID) {
    return request(app)
      .delete(`/api/profile/saved-trails/${trailId}`)
      .set('Authorization', 'Bearer access-123');
  }

  it('toglie il sentiero dai salvati dell\'utente del token (204)', async () => {
    const res = await unsave();

    expect(res.status).toBe(204);
    // The query runs with the user's token, so the RLS policies apply
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('saved_trails');
    expect(remove).toHaveBeenCalled();
    expect(deleteEqUser).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(deleteEqTrail).toHaveBeenCalledWith('trail_id', TRAIL_ID);
  });

  it('risponde 401 senza token e non cancella nulla', async () => {
    const res = await request(app).delete(`/api/profile/saved-trails/${TRAIL_ID}`);

    expect(res.status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('risponde 400 se l\'id non è un uuid', async () => {
    deleteEqTrail.mockResolvedValue({ error: { code: '22P02', message: 'invalid input syntax for type uuid' } });

    const res = await unsave('non-un-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid trail id');
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    deleteEqTrail.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await unsave();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
