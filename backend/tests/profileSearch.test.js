import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAsUser: vi.fn(),
}));

const USER_ID = '0ccf0000-0000-4000-8000-000000000001';
const dataFetch = vi.fn();
const search = () => request(app).get('/api/profile/search').set('Authorization', 'Bearer access-123');

beforeEach(() => {
  vi.resetAllMocks();
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  supabaseAsUser.mockReturnValue(createClient('https://profiles.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: dataFetch },
  }));
});

it('requires authentication and a non-blank username search', async () => {
  const unauthenticated = await request(app).get('/api/profile/search?q=alba');
  expect(unauthenticated.status).toBe(401);
  expect((await search().query({ q: '  ' })).status).toBe(400);
  expect((await search().query('q=alba&q=other')).status).toBe(400);
  expect(dataFetch).not.toHaveBeenCalled();
});

it('looks up public profiles and requests points for the current page in one call', async () => {
  const rows = Array.from({ length: 21 }, (_, index) => ({
    id: '0ccf0000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
    username: 'al.ba_*' + String(index + 1).padStart(2, '0'),
    display_name: 'Alba',
    bio: 'Weekend hiker',
    level: 2,
    birth_date: '2000-01-01',
  }));
  dataFetch
    .mockResolvedValueOnce(Response.json(rows))
    .mockResolvedValueOnce(Response.json([
      { profile_id: rows[0].id, total_points: 205 },
      { profile_id: rows[1].id, total_points: 0 },
    ]));

  const res = await search().query({ q: ' Al.ba_* ', after: 'al.ba_*00' });

  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toBe('no-store');
  expect(supabaseAsUser).toHaveBeenCalledWith('access-123');
  expect(dataFetch).toHaveBeenCalledTimes(2);
  const [input, options] = dataFetch.mock.calls[0];
  const url = new URL(input);
  expect(options.method).toBe('GET');
  expect(url.pathname).toBe('/rest/v1/profiles');
  expect(url.searchParams.get('select')).toBe('id,username,display_name,bio,level');
  expect(url.searchParams.get('is_public')).toBe('eq.true');
  expect(url.searchParams.getAll('username')).toEqual(['imatch.Al\\.ba_\\*', 'gt.al.ba_*00']);
  expect(url.searchParams.get('order')).toBe('username.asc');
  expect(url.searchParams.get('limit')).toBe('21');
  const [pointsUrl, pointsOptions] = dataFetch.mock.calls[1];
  expect(new URL(pointsUrl).pathname).toBe('/rest/v1/rpc/get_public_profile_points');
  expect(JSON.parse(pointsOptions.body)).toEqual({ p_profile_ids: rows.slice(0, 20).map((row) => row.id) });

  expect(res.body.profiles).toHaveLength(20);
  expect(res.body.profiles[0]).toEqual({
   id: rows[0].id, username: 'al.ba_*01', displayName: 'Alba', bio: 'Weekend hiker', level: 2, isMine: true, totalPoints: 205,
  });
  expect(res.body.profiles[1]).toMatchObject({ isMine: false, totalPoints: 0 });
  expect(res.body.profiles[2].totalPoints).toBeNull();
  expect(res.body.nextCursor).toBe('al.ba_*20');
});

it('serves search results with the You marker when the points function is unavailable', async () => {
  dataFetch
    .mockResolvedValueOnce(Response.json([
      { id: USER_ID, username: 'alba', display_name: 'Alba', bio: null, level: 2 },
    ]))
    .mockResolvedValueOnce(Response.json({ code: 'PGRST202', message: 'Function not found' }, { status: 404 }));

  const res = await search().query({ q: 'alba' });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    profiles: [{ id: '0ccf0000-0000-4000-8000-000000000001',username: 'alba', displayName: 'Alba', bio: null, level: 2, isMine: true, totalPoints: null }],
    nextCursor: null,
  });
});
