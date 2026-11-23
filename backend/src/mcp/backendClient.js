// HTTP client for the REST API of our backend (the same API used by the frontend).
// The MCP server does not talk to Supabase directly: it goes through the API,
// so validation and access rules stay in one place.

// Error answered by the backend (status = HTTP status) or backend not reachable (status = 0).
export class BackendError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
  }
}

// Message for the model when a tool needs the user but nobody is logged in
export const LOGIN_REQUIRED =
  'Login required: the user has to run "pnpm mcp:login" in the backend folder, then try again.';

// baseUrl: where the backend runs, e.g. http://localhost:3000
// fetchFn: injectable, so the tests can use a fake fetch
// token:   optional fixed access token, sent as "Authorization: Bearer <token>"
// session: optional session of the logged-in user (see session.js), used by the
//          requests with auth: true; it gives a valid token and renews it when it expires
export function createBackendClient({ baseUrl, fetchFn = globalThis.fetch, token, session } = {}) {
  if (!baseUrl) {
    throw new Error('Missing baseUrl: set MCP_BACKEND_URL (e.g. http://localhost:3000)');
  }
  const apiUrl = `${baseUrl.replace(/\/+$/, '')}/api`;

  // One HTTP call; returns the Response (errors of the network become BackendError 0)
  async function send(method, path, { query = {}, body, accessToken }) {
    const url = new URL(apiUrl + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers = { Accept: 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
      return await fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new BackendError(0, `Backend not reachable at ${baseUrl}: ${err.message}`);
    }
  }

  // METHOD /api<path>: returns the JSON body (null for an empty answer, e.g. 204),
  // throws BackendError if the answer is not 2xx.
  // auth: true = the request is made as the logged-in user (token from the session);
  // if the backend answers 401 (token expired), the token is renewed once and the request repeated.
  async function request(method, path, { query, body, auth = false } = {}) {
    let accessToken = token;
    if (auth) {
      if (!session || !(await session.isLoggedIn())) throw new BackendError(401, LOGIN_REQUIRED);
      accessToken = await session.getAccessToken();
    }

    let res = await send(method, path, { query, body, accessToken });
    if (auth && res.status === 401) {
      accessToken = await session.refresh();
      res = await send(method, path, { query, body, accessToken });
    }

    // The backend answers errors as { error: '...' }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new BackendError(res.status, data?.error ?? `Request failed with status ${res.status}`);
    }
    return data;
  }

  // GET /api<path>?<query>: query values that are undefined are left out.
  const get = (path, query = {}) => request('GET', path, { query });
  const trailPath = (trailId) => encodeURIComponent(trailId);

  return {
    request,
    get,

    // Public: no login
    // GET /api/trails?bbox=...: trails whose start point is inside the area
    listTrails: ({ minLng, minLat, maxLng, maxLat }) =>
      get('/trails', { bbox: [minLng, minLat, maxLng, maxLat].join(',') }),

    // GET /api/trails/nearby: trails near a position, closest first
    nearbyTrails: ({ lat, lng, radius, limit }) => get('/trails/nearby', { lat, lng, radius, limit }),

    // GET /api/trails/:id: one trail with its route, or null if it does not exist
    async getTrail(id) {
      try {
        return await get(`/trails/${trailPath(id)}`);
      } catch (err) {
        if (err instanceof BackendError && err.status === 404) return null;
        throw err;
      }
    },

    // As the logged-in user (auth: true)

    // POST /api/profile/saved-trails -> { trailId }
    saveTrail: (trailId) => request('POST', '/profile/saved-trails', { body: { trailId }, auth: true }),
    // DELETE /api/profile/saved-trails/:trailId -> nothing (204), also if it was not saved
    unsaveTrail: (trailId) => request('DELETE', `/profile/saved-trails/${trailPath(trailId)}`, { auth: true }),
    // GET /api/profile/saved-trails -> [{ trail_id, created_at }]
    savedTrails: () => request('GET', '/profile/saved-trails', { auth: true }),
    // POST /api/profile/completed-trails -> { trailId, pointsEarned, level, levelName, levelUp }
    completeTrail: (trailId) => request('POST', '/profile/completed-trails', { body: { trailId }, auth: true }),
    // GET /api/profile/completed-trails -> [{ trail_id, completed_at }]
    completedTrails: () => request('GET', '/profile/completed-trails', { auth: true }),
    // GET /api/profile/points -> { totalPoints, completedRoutes, level: { name, pointsToNext, ... } }
    points: () => request('GET', '/profile/points', { auth: true }),
  };
}