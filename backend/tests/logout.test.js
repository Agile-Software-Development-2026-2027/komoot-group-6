import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('revoca la sessione su Supabase (204)', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
      error: null,
    });
    fetchMock.mockResolvedValue({ ok: true, status: 204 });

    const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.supabase.co/auth/v1/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer access-123',
        }),
      })
    );
  });

  it('risponde 401 e non chiama Supabase senza token', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('risponde 204 anche se il token era già stato revocato', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
      error: null,
    });
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(204);
  });

  it('risponde 502 se Supabase non riesce a chiudere la sessione', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
      error: null,
    });
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(502);
  });
});
