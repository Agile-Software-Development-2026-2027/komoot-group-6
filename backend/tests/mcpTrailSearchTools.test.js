// Tests for the MCP module "trail search" 
import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createMcpServer } from '../src/mcp/server.js';
import { BackendError } from '../src/mcp/backendClient.js';
import { registerTrailSearchTools, toTrailSummary } from '../src/mcp/trailSearchTools.js';


function feature(id, name, extra = {}) {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [16.23, 39.36] },
    properties: {
      id, name, trailType: 'hiking', difficulty: 'T', lengthM: 4003, ascentM: 40,
      estDurationMin: 60, startPoint: [16.2275, 39.359], description: 'Text written by a user',
      ...extra,
    },
  };
}

const CAMPUS = feature('t1', 'Anello del Campus UniCal', { distanceM: 320 });
const CRATI = feature('t2', 'Corsa lungo il Crati', { difficulty: 'E', lengthM: 10000, distanceM: 1500 });
const BOTTE = feature('t3', 'Monte Botte Donato', { difficulty: 'EE', lengthM: 7800, distanceM: 2900 });

function fakeBackend(features = [CAMPUS, CRATI, BOTTE]) {
  return {
    nearbyTrails: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features }),
    listTrails: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features }),
  };
}

// Server with only this module + a client connected in memory
async function connect(backend) {
  const server = createMcpServer({ backend, modules: [registerTrailSearchTools] });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('trail search tools: list', () => {
  it('offers the two tools, marked as read-only', async () => {
    const client = await connect(fakeBackend());
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual(['search_trails_nearby', 'trails_in_area']);
    for (const tool of tools) {
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.description.length).toBeGreaterThan(40);
    }
  });
});

describe('search_trails_nearby', () => {
  it('asks the backend in meters and returns a short list, closest first', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);

    const result = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 39.36, lng: 16.23, radius_km: 3 } });

    expect(backend.nearbyTrails).toHaveBeenCalledWith({ lat: 39.36, lng: 16.23, radius: 3000, limit: 100 });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('1. Anello del Campus UniCal [id: t1]: T (easy), 4 km, ascent 40 m, about 1h00, 0.3 km away');
    expect(result.structuredContent.count).toBe(3);
  });

  it('never passes the descriptions written by users to the model', async () => {
    const client = await connect(fakeBackend());
    const result = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 39.36, lng: 16.23 } });

    expect(JSON.stringify(result)).not.toContain('Text written by a user');
  });

  it('filters by difficulty and maximum length, then applies the limit', async () => {
    const client = await connect(fakeBackend());

    const easyOrMedium = await client.callTool({
      name: 'search_trails_nearby',
      arguments: { lat: 39.36, lng: 16.23, difficulty: ['T', 'E'], max_length_km: 8 },
    });
    expect(easyOrMedium.structuredContent.trails.map((t) => t.id)).toEqual(['t1']);

    const onlyOne = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 39.36, lng: 16.23, limit: 1 } });
    expect(onlyOne.structuredContent.count).toBe(1);
  });

  it('says clearly when nothing is found', async () => {
    const client = await connect(fakeBackend([]));
    const result = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 39.36, lng: 16.23, radius_km: 2 } });

    expect(result.content[0].text).toBe('No trails within 2 km with these filters.');
    expect(result.structuredContent).toEqual({ count: 0, trails: [] });
  });

  it('refuses invalid input without calling the backend', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);
    const result = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 999, lng: 16.23 } });

    expect(result.isError).toBe(true);
    expect(backend.nearbyTrails).not.toHaveBeenCalled();
  });

  it('returns the message of the backend when it fails', async () => {
    const backend = fakeBackend();
    backend.nearbyTrails.mockRejectedValue(new BackendError(0, 'Backend not reachable at http://localhost:3000'));
    const client = await connect(backend);

    const result = await client.callTool({ name: 'search_trails_nearby', arguments: { lat: 39.36, lng: 16.23 } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Backend not reachable');
  });
});

describe('trails_in_area', () => {
  it('passes the rectangle to the backend and sorts the trails by name', async () => {
    const backend = fakeBackend([BOTTE, CAMPUS, CRATI]);
    const client = await connect(backend);

    const result = await client.callTool({
      name: 'trails_in_area',
      arguments: { min_lng: 16.1, min_lat: 39.25, max_lng: 16.35, max_lat: 39.45 },
    });

    expect(backend.listTrails).toHaveBeenCalledWith({ minLng: 16.1, minLat: 39.25, maxLng: 16.35, maxLat: 39.45 });
    expect(result.structuredContent.trails.map((t) => t.name)).toEqual([
      'Anello del Campus UniCal', 'Corsa lungo il Crati', 'Monte Botte Donato',
    ]);
  });

  it('refuses a rectangle with the borders swapped', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);
    const result = await client.callTool({
      name: 'trails_in_area',
      arguments: { min_lng: 16.35, min_lat: 39.25, max_lng: 16.1, max_lat: 39.45 },
    });

    expect(result.isError).toBe(true);
    expect(backend.listTrails).not.toHaveBeenCalled();
  });
});

describe('toTrailSummary', () => {
  it('cuts very long names and copes with missing values', () => {
    const summary = toTrailSummary({ properties: { id: 'x', name: 'A'.repeat(200) } });
    expect(summary.name).toHaveLength(81);
    expect(summary).toMatchObject({ lengthKm: null, ascentM: null, start: null, difficultyText: 'unknown' });
    expect(summary).not.toHaveProperty('distanceKm');
  });
});