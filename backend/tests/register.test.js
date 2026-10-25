import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { signUp: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const validBody = {
  email: 'mario@esempio.it',
  password: 'password123',
  username: 'mario_rossi',
  displayName: 'Mario',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('registra un nuovo utente (201)', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'abc-123', email: validBody.email, identities: [{ id: '1' }] } },
      error: null,
    });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 'abc-123', email: validBody.email });
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: validBody.email,
        password: validBody.password,
        options: expect.objectContaining({
          data: { username: 'mario_rossi', display_name: 'Mario' },
        }),
      })
    );
  });

  it('risponde 400 e non chiama Supabase se i dati non sono validi', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ciao', password: 'password123' });

    expect(res.status).toBe(400);
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('risponde 409 se l\'email è già registrata', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'abc-123', email: validBody.email, identities: [] } },
      error: null,
    });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it('risponde 409 se lo username è già in uso', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Database error saving new user' },
    });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username already in use');
  });

  it('risponde 400 se la password è debole per Supabase', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { code: 'weak_password', message: 'Password is too weak' },
    });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(400);
  });

  it('risponde 422 per un altro errore di Supabase', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Something went wrong' },
    });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(422);
  });
});