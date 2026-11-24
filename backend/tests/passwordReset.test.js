import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));

import app from '../src/app.js';
import { supabase } from '../src/config/supabase.js';

const SAME_MESSAGE = 'If the email is registered, you will receive a link to reset your password.';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/auth/forgot-password', () => {
  it('asks Supabase to send the link and answers 200', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'mario@esempio.it' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(SAME_MESSAGE);
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'mario@esempio.it',
      expect.objectContaining({ redirectTo: expect.stringMatching(/\/auth\/reset-password$/) }),
    );
  });

  it('answers the same way even if Supabase returns an error (does not reveal emails)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nessuno@esempio.it' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(SAME_MESSAGE);
  });

  it('rejects an invalid email (400) without calling Supabase', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/reset-password', () => {
  const validBody = { access_token: 'token-123', password: 'nuova!pass' };

  function mockSupabaseResponse(status, body = {}) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('updates the password with the link token (200)', async () => {
    const fetchMock = mockSupabaseResponse(200, { id: 'abc-123' });

    const res = await request(app).post('/api/auth/reset-password').send(validBody);

    expect(res.status).toBe(200);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/v1\/user$/);
    expect(options.method).toBe('PUT');
    expect(options.headers.Authorization).toBe('Bearer token-123');
    expect(JSON.parse(options.body)).toEqual({ password: 'nuova!pass' });
  });

  it('answers 401 if the link has expired or was already used', async () => {
    mockSupabaseResponse(401);

    const res = await request(app).post('/api/auth/reset-password').send(validBody);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/);
  });

  it('forwards the Supabase message if the password is too weak (400)', async () => {
    mockSupabaseResponse(422, { error_code: 'weak_password', msg: 'Password is too weak' });

    const res = await request(app).post('/api/auth/reset-password').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password is too weak');
  });

  it('rejects the request without a token (400)', async () => {
    const fetchMock = mockSupabaseResponse(200);

    const res = await request(app).post('/api/auth/reset-password').send({ password: 'nuova!pass' });

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', 'a!b'],
    ['too long', 'a!'.repeat(15)],
    ['without a special character', 'password123'],
  ])('rejects a password %s (400)', async (_label, password) => {
    const fetchMock = mockSupabaseResponse(200);

    const res = await request(app).post('/api/auth/reset-password').send({ access_token: 'token-123', password });

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
