import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

// Simulated query chain: from('profiles').select(...).eq(...).single()
//                        from('profiles').update(...).eq(...).select(...).single()
const single = vi.fn();
const select = vi.fn(() => ({ eq, single }));
const eq = vi.fn(() => ({ single, select }));
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select, update }));

const get = () => request(app).get('/api/profile/visibility').set('Authorization', 'Bearer access-123');
const put = (body) => request(app).put('/api/profile/visibility').set('Authorization', 'Bearer access-123').send(body);

beforeEach(() => {
  vi.clearAllMocks();
  // By default the token is valid and the query succeeds
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ from });
  single.mockResolvedValue({ data: { is_public: false }, error: null });
});

describe('GET /api/profile/visibility', () => {
  it('restituisce se il profilo dell\'utente è pubblico (200)', async () => {
    single.mockResolvedValue({ data: { is_public: true }, error: null });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isPublic: true });
    // The query runs with the user's token, so the RLS policies apply
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('is_public');
    expect(eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('risponde 401 senza token e non legge nulla', async () => {
    const res = await request(app).get('/api/profile/visibility');

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('risponde 404 se il profilo non esiste', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });

    const res = await get();

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Profile not found' });
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    single.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    // errorHandler prints the error: here we silence it
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await get();

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('PUT /api/profile/visibility', () => {
  it('salva la nuova visibilità e restituisce il valore salvato (200)', async () => {
    single.mockResolvedValue({ data: { is_public: true }, error: null });

    const res = await put({ isPublic: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isPublic: true });
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith({ is_public: true });
    expect(eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('accetta anche false (torna privato)', async () => {
    const res = await put({ isPublic: false });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ is_public: false });
  });

  it('risponde 401 senza token e non scrive nulla', async () => {
    const res = await request(app).put('/api/profile/visibility').send({ isPublic: true });

    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it('risponde 400 se isPublic manca o non è un booleano', async () => {
    for (const body of [{}, { isPublic: 'true' }, { isPublic: 1 }, { isPublic: null }]) {
      const res = await put(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'isPublic must be a boolean' });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('risponde 404 se il profilo non esiste (o le policy non lo lasciano modificare)', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } });

    const res = await put({ isPublic: true });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Profile not found' });
  });

  it('risponde 500 per un errore inatteso del database', async () => {
    single.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await put({ isPublic: true });

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
