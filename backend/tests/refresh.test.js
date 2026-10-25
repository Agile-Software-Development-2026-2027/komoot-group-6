import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { refreshSession: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const validBody = {
  refresh_token: 'refresh-123',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/refresh', () => {
  it('restituisce una nuova sessione (200)', async () => {
    supabase.auth.refreshSession.mockResolvedValue({
      data: {
        user: { id: 'abc-123', email: 'mario@esempio.it', user_metadata: {} },
        session: { access_token: 'access-456', refresh_token: 'refresh-456', expires_at: 1900000000 },
      },
      error: null,
    });

    const res = await request(app).post('/api/auth/refresh').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.session).toEqual({
      access_token: 'access-456',
      refresh_token: 'refresh-456',
      expires_at: 1900000000,
    });
    expect(supabase.auth.refreshSession).toHaveBeenCalledWith(validBody);
  });

  it('risponde 400 e non chiama Supabase se manca il refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('risponde 401 se il refresh token non è valido', async () => {
    supabase.auth.refreshSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid Refresh Token' },
    });

    const res = await request(app).post('/api/auth/refresh').send(validBody);

    expect(res.status).toBe(401);
  });
});
