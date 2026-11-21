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

// baseUrl: where the backend runs, e.g. http://localhost:3000
// fetchFn: injectable, so the tests can use a fake fetch
// token:   optional access token, sent as "Authorization: Bearer <token>"
export function createBackendClient({ baseUrl, fetchFn = globalThis.fetch, token } = {}) {
  if (!baseUrl) {
    throw new Error('Missing baseUrl: set MCP_BACKEND_URL (e.g. http://localhost:3000)');
  }
  const apiUrl = `${baseUrl.replace(/\/+$/, '')}/api`;

  // GET /api<path>?<query>: returns the JSON body, throws BackendError if the answer is not 2xx.
  // Query values that are undefined are left out.
  async function get(path, query = {}) {
    const url = new URL(apiUrl + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetchFn(url, { headers });
    } catch (err) {
      throw new BackendError(0, `Backend not reachable at ${baseUrl}: ${err.message}`);
    }

    // The backend answers errors as { error: '...' }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new BackendError(res.status, body?.error ?? `Request failed with status ${res.status}`);
    }
    return body;
  }

  return {
    get,

    // GET /api/trails?bbox=...: trails whose start point is inside the area
    listTrails: ({ minLng, minLat, maxLng, maxLat }) =>
      get('/trails', { bbox: [minLng, minLat, maxLng, maxLat].join(',') }),

    // GET /api/trails/nearby: trails near a position, closest first
    nearbyTrails: ({ lat, lng, radius, limit }) => get('/trails/nearby', { lat, lng, radius, limit }),

    // GET /api/trails/:id: one trail with its route, or null if it does not exist
    async getTrail(id) {
      try {
        return await get(`/trails/${encodeURIComponent(id)}`);
      } catch (err) {
        if (err instanceof BackendError && err.status === 404) return null;
        throw err;
      }
    },
  };
}
