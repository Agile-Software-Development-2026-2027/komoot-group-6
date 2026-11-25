
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { supabase, supabaseAsUser } from '../src/config/supabase.js';

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
  },
  supabaseAsUser: vi.fn(),
}));

// Test users and friendship ID
const USER_A = '0ccf0000-0000-4000-8000-000000000001';
const USER_B = '0ccf0000-0000-4000-8000-000000000002';
const FRIENDSHIP_ID = '0ccf0000-0000-4000-8000-000000000003';

const TOKEN = 'access-123';
const BASE_URL = '/api/friends';

const dataFetch = vi.fn();

const pendingFriendship = {
  id: FRIENDSHIP_ID,
  requester_id: USER_A,
  addressee_id: USER_B,
  status: 'pending',
  created_at: '2026-11-25T10:00:00Z',
  updated_at: '2026-11-25T10:00:00Z',
};

const acceptedFriendship = {
  ...pendingFriendship,
  status: 'accepted',
};

function authenticateAs(userId) {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function api(method, path = '') {
  return request(app)[method](`${BASE_URL}${path}`)
    .set('Authorization', `Bearer ${TOKEN}`);
}

function mockPublicProfile() {
  dataFetch.mockResolvedValueOnce(
    Response.json([{ id: USER_B }])
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  authenticateAs(USER_A);

  supabaseAsUser.mockReturnValue(
    createClient(
      'https://friends.example.test',
      'test-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: { fetch: dataFetch },
      }
    )
  );
});


// ============================================
// 1. Authentication
// ============================================

describe('Friendship authentication', () => {
  it.each([
    ['get', ''],
    ['get', '/requests'],
    ['get', `/status/${USER_B}`],
    ['post', '/request'],
    ['patch', `/${FRIENDSHIP_ID}/accept`],
    ['patch', `/${FRIENDSHIP_ID}/decline`],
    ['delete', `/${FRIENDSHIP_ID}`],
  ])('protects %s %s without a token', async (method, path) => {
    const res = await request(app)[method](`${BASE_URL}${path}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing access token');
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await api('get');

    expect(res.status).toBe(401);
    expect(dataFetch).not.toHaveBeenCalled();
  });
});


// ============================================
// 2. Send friend request
// ============================================

describe('POST /api/friends/request', () => {
  it('creates a pending friend request', async () => {
    mockPublicProfile();

    dataFetch.mockResolvedValueOnce(
      Response.json(pendingFriendship, { status: 201 })
    );

    const res = await api('post', '/request')
      .send({ userId: USER_B });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(pendingFriendship);
    expect(supabaseAsUser).toHaveBeenCalledWith(TOKEN);

    expect(dataFetch).toHaveBeenCalledTimes(2);

    const [profileInput] = dataFetch.mock.calls[0];
    const profileUrl = new URL(profileInput);

    expect(profileUrl.pathname).toBe('/rest/v1/profiles');
    expect(profileUrl.searchParams.get('id'))
      .toBe(`eq.${USER_B}`);
    expect(profileUrl.searchParams.get('is_public'))
      .toBe('eq.true');

    const [insertInput, options] = dataFetch.mock.calls[1];

    expect(new URL(insertInput).pathname)
      .toBe('/rest/v1/friendships');

    expect(options.method).toBe('POST');

    expect(JSON.parse(options.body)).toEqual({
      requester_id: USER_A,
      addressee_id: USER_B,
    });
  });

  it('rejects an invalid user ID', async () => {
    const res = await api('post', '/request')
      .send({ userId: 'invalid-id' });

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('rejects a missing user ID', async () => {
    const res = await api('post', '/request').send({});

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('prevents users from adding themselves', async () => {
    const res = await api('post', '/request')
      .send({ userId: USER_A });

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('rejects duplicate friendship requests', async () => {
    mockPublicProfile();

    dataFetch.mockResolvedValueOnce(
      Response.json(
        {
          code: '23505',
          message: 'Duplicate friendship',
        },
        { status: 409 }
      )
    );

    const res = await api('post', '/request')
      .send({ userId: USER_B });

    expect(res.status).toBe(409);
    expect(res.body.error)
      .toBe('A friendship or request already exists');
  });

  it('rejects a missing or unavailable profile', async () => {
    dataFetch.mockResolvedValueOnce(Response.json([]));

    const res = await api('post', '/request')
      .send({ userId: USER_B });

    expect(res.status).toBe(404);
    expect(dataFetch).toHaveBeenCalledTimes(1);
  });

  it('handles a profile deleted before insertion', async () => {
    mockPublicProfile();

    dataFetch.mockResolvedValueOnce(
      Response.json(
        {
          code: '23503',
          message: 'Foreign key violation',
        },
        { status: 409 }
      )
    );

    const res = await api('post', '/request')
      .send({ userId: USER_B });

    expect(res.status).toBe(404);
  });
});


// ============================================
// 3. Retrieve friends
// ============================================

describe('GET /api/friends', () => {
  it('returns an empty friends list', async () => {
    dataFetch.mockResolvedValueOnce(Response.json([]));

    const res = await api('get');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns accepted friendships for the requester', async () => {
    dataFetch.mockResolvedValueOnce(
      Response.json([acceptedFriendship])
    );

    const res = await api('get');

    expect(res.status).toBe(200);

    expect(res.body).toEqual([
      {
        ...acceptedFriendship,
        friendId: USER_B,
      },
    ]);

    const [input] = dataFetch.mock.calls[0];
    const url = new URL(input);

    expect(url.searchParams.get('status'))
      .toBe('eq.accepted');

    expect(url.searchParams.get('or')).toBe(
      `(requester_id.eq.${USER_A},addressee_id.eq.${USER_A})`
    );
  });

  it('returns the correct friend ID for the receiver', async () => {
    authenticateAs(USER_B);

    dataFetch.mockResolvedValueOnce(
      Response.json([acceptedFriendship])
    );

    const res = await api('get');

    expect(res.status).toBe(200);
    expect(res.body[0].friendId).toBe(USER_A);
  });
});


// ============================================
// 4. Retrieve pending requests
// ============================================

describe('GET /api/friends/requests', () => {
  it('returns empty incoming and outgoing lists', async () => {
    dataFetch.mockResolvedValueOnce(Response.json([]));

    const res = await api('get', '/requests');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      incoming: [],
      outgoing: [],
    });
  });

  it('returns outgoing requests for the requester', async () => {
    dataFetch.mockResolvedValueOnce(
      Response.json([pendingFriendship])
    );

    const res = await api('get', '/requests');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      incoming: [],
      outgoing: [pendingFriendship],
    });

    const [input] = dataFetch.mock.calls[0];

    expect(new URL(input).searchParams.get('status'))
      .toBe('eq.pending');
  });

  it('returns incoming requests for the receiver', async () => {
    authenticateAs(USER_B);

    dataFetch.mockResolvedValueOnce(
      Response.json([pendingFriendship])
    );

    const res = await api('get', '/requests');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      incoming: [pendingFriendship],
      outgoing: [],
    });
  });
});


// ============================================
// 5. Friendship status
// ============================================

describe('GET /api/friends/status/:userId', () => {
  it('returns none when no relationship exists', async () => {
    dataFetch.mockResolvedValueOnce(Response.json([]));

    const res = await api('get', `/status/${USER_B}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'none',
      friendshipId: null,
    });
  });

  it('returns self for the authenticated user', async () => {
    const res = await api('get', `/status/${USER_A}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'self',
      friendshipId: null,
    });

    expect(dataFetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid profile ID', async () => {
    const res = await api('get', '/status/invalid-id');

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });

  it.each([
    [USER_A, USER_B, 'pending', 'outgoing_pending'],
    [USER_B, USER_A, 'pending', 'incoming_pending'],
    [USER_A, USER_B, 'accepted', 'accepted'],
    [USER_A, USER_B, 'declined', 'declined'],
  ])(
    'returns the correct relationship for %s and %s (%s)',
    async (currentUser, targetUser, dbStatus, expectedStatus) => {
      authenticateAs(currentUser);

      dataFetch.mockResolvedValueOnce(
        Response.json([
          {
            ...pendingFriendship,
            status: dbStatus,
          },
        ])
      );

      const res = await api('get', `/status/${targetUser}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: expectedStatus,
        friendshipId: FRIENDSHIP_ID,
      });
    }
  );
});


// ============================================
// 6. Accept and decline requests
// ============================================

describe('Respond to friend requests', () => {
  it.each([
    ['accept', 'accepted'],
    ['decline', 'declined'],
  ])('allows the receiver to %s a request', async (action, status) => {
    authenticateAs(USER_B);

    dataFetch.mockResolvedValueOnce(
      Response.json([
        {
          ...pendingFriendship,
          status,
        },
      ])
    );

    const res = await api(
      'patch',
      `/${FRIENDSHIP_ID}/${action}`
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(status);

    const [input, options] = dataFetch.mock.calls[0];
    const url = new URL(input);

    expect(options.method).toBe('PATCH');

    expect(JSON.parse(options.body)).toEqual({ status });

    expect(url.searchParams.get('id'))
      .toBe(`eq.${FRIENDSHIP_ID}`);

    expect(url.searchParams.get('addressee_id'))
      .toBe(`eq.${USER_B}`);

    expect(url.searchParams.get('status'))
      .toBe('eq.pending');
  });

  it.each(['accept', 'decline'])(
    'returns 404 when the sender attempts to %s their own request',
    async (action) => {
      authenticateAs(USER_A);

      dataFetch.mockResolvedValueOnce(Response.json([]));

      const res = await api(
        'patch',
        `/${FRIENDSHIP_ID}/${action}`
      );

      expect(res.status).toBe(404);

      const [input] = dataFetch.mock.calls[0];
      const url = new URL(input);

      expect(url.searchParams.get('addressee_id'))
        .toBe(`eq.${USER_A}`);

      expect(url.searchParams.get('status'))
        .toBe('eq.pending');
    }
  );

  it('rejects an invalid friendship ID', async () => {
    const res = await api('patch', '/invalid-id/accept');

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });
});


// ============================================
// 7. Remove friendship or cancel request
// ============================================

describe('DELETE /api/friends/:id', () => {
  it('successfully deletes an allowed friendship record', async () => {
    dataFetch.mockResolvedValueOnce(
      Response.json([{ id: FRIENDSHIP_ID }])
    );

    const res = await api('delete', `/${FRIENDSHIP_ID}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const [input, options] = dataFetch.mock.calls[0];
    const url = new URL(input);

    expect(options.method).toBe('DELETE');

    expect(url.searchParams.get('id'))
      .toBe(`eq.${FRIENDSHIP_ID}`);

    expect(url.searchParams.get('or')).toBe(
      `(and(status.eq.pending,requester_id.eq.${USER_A}),` +
      `and(status.in.(accepted,declined),` +
      `or(requester_id.eq.${USER_A},addressee_id.eq.${USER_A})))`
    );
  });

  it('returns 404 when deletion is not permitted', async () => {
    authenticateAs(USER_B);

    dataFetch.mockResolvedValueOnce(Response.json([]));

    const res = await api('delete', `/${FRIENDSHIP_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Friendship not found');
  });

  it('rejects an invalid friendship ID', async () => {
    const res = await api('delete', '/invalid-id');

    expect(res.status).toBe(400);
    expect(dataFetch).not.toHaveBeenCalled();
  });
});


// ============================================
// 8. Unexpected database errors
// ============================================

describe('Friendship error handling', () => {
  it('returns 500 for an unexpected database error', async () => {
    dataFetch.mockResolvedValueOnce(
      Response.json(
        {
          code: '42501',
          message: 'Permission denied',
        },
        { status: 403 }
      )
    );

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      const res = await api('get');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal Server Error');
    } finally {
      consoleError.mockRestore();
    }
  });
});
