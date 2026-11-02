import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTrail, getTrailsInBounds } from './trailsService.js';

// apiRequest usa fetch: lo si simula per vedere l'indirizzo richiesto
function mockFetch(body, { ok = true, status = 200 } = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trailsService', () => {
  it('asks for the trails in the area with the bbox in the query string', async () => {
    const collection = { type: 'FeatureCollection', features: [] };
    const fetchMock = mockFetch(collection);

    const result = await getTrailsInBounds([16.1, 39.25, 16.35, 39.45]);

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/trails\?bbox=16\.1,39\.25,16\.35,39\.45$/);
    expect(result).toEqual(collection);
  });

  it('asks for one trail by id, without login', async () => {
    const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };
    const fetchMock = mockFetch(feature);

    const result = await getTrail('abc-123');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/trails\/abc-123$/);
    expect(options.headers.Authorization).toBeUndefined();
    expect(result).toEqual(feature);
  });

  it('throws the backend error message', async () => {
    mockFetch({ error: 'Trail not found' }, { ok: false, status: 404 });

    await expect(getTrail('abc-123')).rejects.toMatchObject({ message: 'Trail not found', status: 404 });
  });
});
