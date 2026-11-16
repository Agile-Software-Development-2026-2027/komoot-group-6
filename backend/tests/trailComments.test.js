import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { rpc: vi.fn(), auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';
const COMMENTS_URL = `/api/trails/${TRAIL_ID}/comments`;
const ROW = {
  id: 'c10ed016-f34f-432e-90db-55c4936eca12',
  body: 'Water available at the start.',
  created_at: '2026-11-16T10:01:00.123456+00:00',
  author_name: 'Hiker',
  author_username: null,
  is_mine: false,
};
const insert = vi.fn();
const deleteById = vi.fn();
const deleteByTrail = vi.fn(() => ({ eq: deleteById }));
const remove = vi.fn(() => ({ eq: deleteByTrail }));
const from = vi.fn(() => ({ insert, delete: remove }));
const userRpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockResolvedValue({ data: [{ comments: [ROW] }], error: null });
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'author' } }, error: null });
  supabaseAsUser.mockReturnValue({ from, rpc: userRpc });
  insert.mockResolvedValue({ error: null });
  deleteById.mockResolvedValue({ error: null });
});

describe('GET /api/trails/:id/comments', () => {
  it('serves the public comment data to a guest', async () => {
    const res = await request(app).get(COMMENTS_URL);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      comments: [{
        id: ROW.id, body: ROW.body, createdAt: ROW.created_at,
        authorName: 'Hiker', authorUsername: null, isMine: false,
      }],
      nextCursor: null,
    });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('get_trail_comments', {
      p_trail_id: TRAIL_ID,
      p_before_at: null,
      p_before_id: null,
      p_limit: 21,
    });
  });

  it('reads ownership with the verified user token and prevents caching', async () => {
    userRpc.mockResolvedValue({ data: [{ comments: [{ ...ROW, is_mine: true }] }], error: null });

    const res = await request(app).get(COMMENTS_URL).set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(200);
    expect(res.body.comments[0]).toMatchObject({ authorName: 'Hiker', isMine: true });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('keeps the full timestamp in the cursor and accepts it for the next page', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ comments: Array.from({ length: 21 }, (_, index) => ({
        ...ROW,
        id: `c10ed016-f34f-432e-90db-55c4936eca${String(index).padStart(2, '0')}`,
      })) }],
      error: null,
    });

    const first = await request(app).get(COMMENTS_URL);
    const { comments, nextCursor } = first.body;
    expect(comments).toHaveLength(20);
    expect(nextCursor).toEqual({ id: comments[19].id, createdAt: ROW.created_at });

    const second = await request(app).get(COMMENTS_URL).query({
      beforeAt: nextCursor.createdAt,
      beforeId: nextCursor.id,
    });
    expect(second.status).toBe(200);
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_trail_comments', {
      p_trail_id: TRAIL_ID,
      p_before_at: nextCursor.createdAt,
      p_before_id: nextCursor.id,
      p_limit: 21,
    });
  });

  it('returns 404 for a missing trail', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await request(app).get(COMMENTS_URL)).status).toBe(404);
  });
});

describe('POST /api/trails/:id/comments', () => {
  it('rejects a guest before accessing the table', async () => {
    const res = await request(app).post(COMMENTS_URL).send({ body: ROW.body });

    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it.each([' \n\t ', 'x'.repeat(2001), 5])('rejects an invalid body without writing', async (body) => {
    const res = await request(app).post(COMMENTS_URL).set('Authorization', 'Bearer access-123').send({ body });

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it('inserts only the trail and trimmed body with the verified user token', async () => {
    const res = await request(app)
      .post(COMMENTS_URL)
      .set('Authorization', 'Bearer access-123')
      .send({ body: `  ${ROW.body}  `, author_id: 'another-author' });

    expect(res.status).toBe(201);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('trail_comments');
    expect(insert).toHaveBeenCalledWith({ trail_id: TRAIL_ID, body: ROW.body });
  });
});

describe('DELETE /api/trails/:id/comments/:commentId', () => {
  it('rejects deletion by a guest', async () => {
    const res = await request(app).delete(`${COMMENTS_URL}/${ROW.id}`);

    expect(res.status).toBe(401);
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects an invalid comment id before accessing the table', async () => {
    const res = await request(app).delete(`${COMMENTS_URL}/invalid`).set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  });

  it('filters by trail and comment using the authenticated RLS client', async () => {
    const res = await request(app).delete(`${COMMENTS_URL}/${ROW.id}`).set('Authorization', 'Bearer access-123');

    expect(res.status).toBe(204);
    expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
    expect(from).toHaveBeenCalledWith('trail_comments');
    expect(deleteByTrail).toHaveBeenCalledWith('trail_id', TRAIL_ID);
    expect(deleteById).toHaveBeenCalledWith('id', ROW.id);
  });
});
