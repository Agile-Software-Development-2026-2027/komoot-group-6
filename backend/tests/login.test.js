import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const validBody = {
  email: 'mario@esempio.it',
  password: 'password123',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  it('restituisce utente e sessione con credenziali corrette (200)', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'abc-123',
          email: validBody.email,
          user_metadata: { username: 'mario_rossi', display_name: 'Mario' },
        },
        session: { access_token: 'access-123', refresh_token: 'refresh-123', expires_at: 1900000000 },
      },
      error: null,
    });

    const res = await request(app).post('/api/auth/login').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'abc-123',
      email: validBody.email,
      username: 'mario_rossi',
      displayName: 'Mario',
    });
    expect(res.body.session).toEqual({
      access_token: 'access-123',
      refresh_token: 'refresh-123',
      expires_at: 1900000000,
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(validBody);
  });

  it('risponde 400 e non chiama Supabase se i dati non sono validi', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ciao', password: 'password123' });

    expect(res.status).toBe(400);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('risponde 401 se le credenziali sono sbagliate', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });

    const res = await request(app).post('/api/auth/login').send(validBody);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('risponde 403 se l\'email non è confermata', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    });

    const res = await request(app).post('/api/auth/login').send(validBody);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Email not confirmed. Check your email to confirm.');
  });

  it('risponde 429 se ci sono troppi tentativi', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_request_rate_limit', message: 'Request rate limit reached', status: 429 },
    });

    const res = await request(app).post('/api/auth/login').send(validBody);

    expect(res.status).toBe(429);
  });

  it('risponde 422 per un altro errore di Supabase', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Something went wrong' },
    });

    const res = await request(app).post('/api/auth/login').send(validBody);

    expect(res.status).toBe(422);
  });
});
