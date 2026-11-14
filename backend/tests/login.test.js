import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';
import { REMEMBER_ME_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS } from '../src/config/auth.config.js';

const validBody = {
  email: 'mario@esempio.it',
  password: 'password123',
};

const NOW = 1_800_000_000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/login', () => {
  it('restituisce utente e sessione con credenziali corrette (200)', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'abc-123',
          email: validBody.email,
          user_metadata: { username: 'mario_rossi', display_name: 'Mario', birth_date: '1990-05-17' },
          created_at: '2026-01-15T10:00:00Z',
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
      birthDate: '1990-05-17',
      createdAt: '2026-01-15T10:00:00Z',
    });
    expect(res.body.session).toEqual({
      access_token: 'access-123',
      refresh_token: 'refresh-123',
      expires_at: 1900000000,
      session_expires_at: NOW + SESSION_MAX_AGE_SECONDS,
      remember_me: false,
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(validBody);
  });

  it('con "Remember me" la sessione dura fino a 30 giorni dal login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'abc-123', email: validBody.email, user_metadata: {} },
        session: { access_token: 'access-123', refresh_token: 'refresh-123', expires_at: 1900000000 },
      },
      error: null,
    });

    const res = await request(app).post('/api/auth/login').send({ ...validBody, rememberMe: true });

    expect(res.status).toBe(200);
    expect(res.body.session.session_expires_at).toBe(NOW + REMEMBER_ME_MAX_AGE_SECONDS);
    expect(res.body.session.remember_me).toBe(true);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(validBody);
  });

  it('risponde 400 se rememberMe non è true o false', async () => {
    const res = await request(app).post('/api/auth/login').send({ ...validBody, rememberMe: 'yes' });

    expect(res.status).toBe(400);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
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