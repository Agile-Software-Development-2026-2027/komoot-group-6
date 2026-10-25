import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/me', () => {
  it('restituisce l\'utente del token (200)', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'abc-123',
          email: 'mario@esempio.it',
          user_metadata: { username: 'mario_rossi', display_name: 'Mario' },
        },
      },
      error: null,
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'abc-123',
      email: 'mario@esempio.it',
      username: 'mario_rossi',
      displayName: 'Mario',
    });
    expect(supabase.auth.getUser).toHaveBeenCalledWith('access-123');
  });

  it('risponde 401 senza token e non chiama Supabase', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('risponde 401 se il token non è valido', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer scaduto');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired session');
  });
});
