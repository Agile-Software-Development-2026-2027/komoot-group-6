import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

const TRAIL_ID = '7d3c0b8e-2f7a-4c1e-9a55-0b6f1c2d3e4f';
const LIKES_URL = `/api/trails/${TRAIL_ID}/likes`;
const insert = vi.fn();
const secondEq = vi.fn();
const firstEq = vi.fn(() => ({ eq: secondEq }));
const remove = vi.fn(() => ({ eq: firstEq }));
const from = vi.fn(() => ({ insert, delete: remove }));
const rpc = vi.fn();

// Sets what the trail_likes_summary function answers
function summary(likeCount, likedByMe) {
  rpc.mockResolvedValue({ data: [{ like_count: likeCount, liked_by_me: likedByMe }], error: null });
}

// Sends the request as a logged-in user
function send(method, url = LIKES_URL) {
  return request(app)[method](url).set('Authorization', 'Bearer access-123');
}

beforeEach(() => {
  vi.clearAllMocks();
  // By default the token is valid and the writes succeed
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'abc-123', email: 'mario@esempio.it' } },
    error: null,
  });
  supabaseAsUser.mockReturnValue({ from, rpc });
  insert.mockResolvedValue({ error: null });
  secondEq.mockResolvedValue({ error: null });
  summary(0, false);
});

describe('GET /api/trails/:id/likes', () => {
  it('returns the total likes and whether the user liked the trail (200)', async () => {
    summary(12, true);

    const res = await send('get');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ trailId: TRAIL_ID, count: 12, liked: true });
    // The query runs with the user's token: this way auth.uid() in the database is their id
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(rpc).toHaveBeenCalledWith('trail_likes_summary', { p_trail_id: TRAIL_ID });
  });

  it('responds 404 when the trail does not exist (the function returns no row)', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await send('get');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Trail not found');
  });

  it('responds 401 without a token and reads nothing', async () => {
    const res = await request(app).get(LIKES_URL);

    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('responds 400 when the id is not a uuid', async () => {
    const res = await send('get', '/api/trails/abc/likes');

    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('responds 500 for an unexpected database error', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    // errorHandler prints the error: we silence it here
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await send('get');

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('POST /api/trails/:id/likes', () => {
  it('adds the like for the user of the token and returns the new total (201)', async () => {
    summary(5, true);

    const res = await send('post');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ trailId: TRAIL_ID, count: 5, liked: true });
    expect(from).toHaveBeenCalledWith('trail_likes');
    expect(insert).toHaveBeenCalledWith({ user_id: 'abc-123', trail_id: TRAIL_ID });
  });

  it('responds 200 with the total, without an error, when the like was already there', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    summary(5, true);

    const res = await send('post');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ trailId: TRAIL_ID, count: 5, liked: true });
  });

  it('responds 404 when the trail does not exist', async () => {
    insert.mockResolvedValue({ error: { code: '23503', message: 'foreign key' } });

    const res = await send('post');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Trail not found');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('responds 401 without a token and writes nothing', async () => {
    const res = await request(app).post(LIKES_URL);

    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('responds 400 when the id is not a uuid and writes nothing', async () => {
    const res = await send('post', '/api/trails/abc/likes');

    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('responds 500 for an unexpected database error', async () => {
    insert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await send('post');

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});

describe('DELETE /api/trails/:id/likes', () => {
  it('removes only the like of the user of the token and returns the new total (200)', async () => {
    summary(4, false);

    const res = await send('delete');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ trailId: TRAIL_ID, count: 4, liked: false });
    expect(from).toHaveBeenCalledWith('trail_likes');
    expect(firstEq).toHaveBeenCalledWith('user_id', 'abc-123');
    expect(secondEq).toHaveBeenCalledWith('trail_id', TRAIL_ID);
  });

  it('responds 404 when the trail does not exist, like POST', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await send('delete');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Trail not found');
  });

  it('responds 401 without a token and deletes nothing', async () => {
    const res = await request(app).delete(LIKES_URL);

    expect(res.status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('responds 500 for an unexpected database error', async () => {
    secondEq.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await send('delete');

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
