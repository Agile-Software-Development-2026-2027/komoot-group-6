import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { refreshSession: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';
import { REMEMBER_ME_MAX_AGE_SECONDS as MAX_AGE } from '../src/config/auth.config.js';

const validBody = {
  refresh_token: 'refresh-123',
};

const NOW = 1_800_000_000;

function fakeAccessToken(loginTime) {
  const payload = { amr: [{ method: 'password', timestamp: loginTime }] };
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

// Risposta di Supabase a un refresh riuscito, con l'access token indicato.
function refreshedSession(accessToken) {
  return {
    data: {
      user: { id: 'abc-123', email: 'mario@esempio.it', user_metadata: {} },
      session: { access_token: accessToken, refresh_token: 'refresh-456', expires_at: 1900000000 },
    },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/refresh', () => {
  it('restituisce una nuova sessione (200)', async () => {
    // Login fatto un'ora fa
    const accessToken = fakeAccessToken(NOW - 60 * 60);
    supabase.auth.refreshSession.mockResolvedValue(refreshedSession(accessToken));

    const res = await request(app).post('/api/auth/refresh').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.session).toEqual({
      access_token: accessToken,
      refresh_token: 'refresh-456',
      expires_at: 1900000000,
      // La scadenza dipende dal momento del login, non da quello del refresh
      session_expires_at: NOW - 60 * 60 + MAX_AGE,
      // Il refresh lo usano solo le sessioni con "Remember me"
      remember_me: true,
    });
    expect(supabase.auth.refreshSession).toHaveBeenCalledWith(validBody);
  });

  it('risponde 401 se sono passati 30 giorni dal login', async () => {
    supabase.auth.refreshSession.mockResolvedValue(refreshedSession(fakeAccessToken(NOW - MAX_AGE)));

    const res = await request(app).post('/api/auth/refresh').send(validBody);

    expect(res.status).toBe(401);
    expect(res.body.session).toBeUndefined();
  });

  it('risponde 401 se dal token non si capisce quando è avvenuto il login', async () => {
    supabase.auth.refreshSession.mockResolvedValue(refreshedSession('non-un-jwt'));

    const res = await request(app).post('/api/auth/refresh').send(validBody);

    expect(res.status).toBe(401);
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