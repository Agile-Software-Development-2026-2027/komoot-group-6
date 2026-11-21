// Unit tests for the backend client of the MCP server.
// FAKE: fetch (no real backend is started).
import { describe, it, expect, vi } from 'vitest';
import { createBackendClient, BackendError } from '../src/mcp/backendClient.js';

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';

// A fake fetch that always answers with the given status and JSON body
function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('createBackendClient', () => {
  it('requires the base url', () => {
    expect(() => createBackendClient({})).toThrow(/MCP_BACKEND_URL/);
  });

  it('getTrail calls GET /api/trails/:id and returns the trail', async () => {
    const fetchFn = fakeFetch(200, { type: 'Feature', id: TRAIL_ID });
    const backend = createBackendClient({ baseUrl: 'http://localhost:3000/', fetchFn });

    await expect(backend.getTrail(TRAIL_ID)).resolves.toEqual({ type: 'Feature', id: TRAIL_ID });
    expect(String(fetchFn.mock.calls[0][0])).toBe(`http://localhost:3000/api/trails/${TRAIL_ID}`);
  });

  it('getTrail returns null when the trail does not exist (404)', async () => {
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn: fakeFetch(404, { error: 'Trail not found' }) });

    await expect(backend.getTrail(TRAIL_ID)).resolves.toBeNull();
  });

  it('throws a BackendError with the message of the API on other errors', async () => {
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn: fakeFetch(400, { error: 'Invalid trail id' }) });

    await expect(backend.getTrail('abc')).rejects.toMatchObject({ status: 400, message: 'Invalid trail id' });
  });

  it('throws a BackendError with status 0 when the backend is not reachable', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn });

    const err = await backend.getTrail(TRAIL_ID).catch((e) => e);
    expect(err).toBeInstanceOf(BackendError);
    expect(err.status).toBe(0);
  });

  it('builds the query string and leaves out undefined values', async () => {
    const fetchFn = fakeFetch(200, { type: 'FeatureCollection', features: [] });
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn });

    await backend.nearbyTrails({ lat: 39.36, lng: 16.23, radius: undefined, limit: 5 });
    await backend.listTrails({ minLng: 16.1, minLat: 39.25, maxLng: 16.35, maxLat: 39.45 });

    expect(String(fetchFn.mock.calls[0][0])).toBe('http://x/api/trails/nearby?lat=39.36&lng=16.23&limit=5');
    expect(String(fetchFn.mock.calls[1][0])).toBe('http://x/api/trails?bbox=16.1%2C39.25%2C16.35%2C39.45');
  });

  it('sends the token as a Bearer header only when it is given', async () => {
    const fetchFn = fakeFetch(200, {});
    await createBackendClient({ baseUrl: 'http://x', fetchFn, token: 'abc' }).get('/profile/me');
    await createBackendClient({ baseUrl: 'http://x', fetchFn }).get('/profile/me');

    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });
});
