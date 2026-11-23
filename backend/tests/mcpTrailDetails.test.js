// Tests for the MCP module "trail details": a real MCP client talks to the server in memory.
// FAKE: the backend client (no backend and no Supabase are used).
import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createMcpServer, MODULES } from '../src/mcp/server.js';
import { BackendError } from '../src/mcp/backendClient.js';
import { registerTrailDetails, toTrailDetails, formatTrailSummary } from '../src/mcp/trailDetails.js';

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

// A trail as answered by GET /api/trails/:id
const TRAIL = {
  type: 'Feature',
  id: TRAIL_ID,
  geometry: {
    type: 'LineString',
    coordinates: [
      [16.23, 39.36, 300],
      [16.24, 39.37, 420],
      [16.25, 39.38, 510],
    ],
  },
  properties: {
    id: TRAIL_ID,
    name: 'Anello del Campus UniCal',
    description: 'A short loop around the campus.',
    trailType: 'hiking',
    difficulty: 'T',
    lengthM: 12345,
    ascentM: 410.4,
    descentM: 405,
    maxElevationM: 512,
    estDurationMin: 90,
    startPoint: [16.23, 39.36],
  },
};

// Fake backend: knows only TRAIL_ID
function fakeBackend() {
  return { getTrail: vi.fn(async (id) => (id === TRAIL_ID ? TRAIL : null)) };
}

async function connect(backend) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer({ backend, modules: [registerTrailDetails] });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('trail details module', () => {
  it('is registered in the MCP server', () => {
    expect(MODULES).toContain(registerTrailDetails);
  });

  it('formats only the data the trail has', () => {
    const details = toTrailDetails({
      ...TRAIL,
      geometry: { type: 'Point', coordinates: [16.23, 39.36] },
      properties: { ...TRAIL.properties, ascentM: null, estDurationMin: 45 },
    });
    const text = formatTrailSummary(details);

    expect(details.routePoints).toBe(0);
    expect(text).toContain('Estimated time: 45 min');
    expect(text).not.toContain('Ascent');
    expect(text).not.toContain('Description');
  });
});

describe('tool get_trail_details', () => {
  it('returns the summary and the structured data, without the route', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);

    const result = await client.callTool({ name: 'get_trail_details', arguments: { trail_id: TRAIL_ID } });

    expect(backend.getTrail).toHaveBeenCalledWith(TRAIL_ID);
    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('Anello del Campus UniCal');
    expect(text).toContain('Distance: 12.35 km');
    expect(text).toContain('Estimated time: 1 h 30 min');
    expect(text).toContain('Ascent: 410 m');
    expect(text).toContain(`trail://${TRAIL_ID}`);
    expect(result.structuredContent).toMatchObject({ id: TRAIL_ID, difficulty: 'T', routePoints: 3 });
    expect(result.structuredContent).not.toHaveProperty('geometry');
  });

  it('never passes the description written by users to the model', async () => {
    const client = await connect(fakeBackend());

    const result = await client.callTool({ name: 'get_trail_details', arguments: { trail_id: TRAIL_ID } });

    expect(JSON.stringify(result)).not.toContain(TRAIL.properties.description);
  });

  it('tells the model when the trail does not exist', async () => {
    const client = await connect(fakeBackend());

    const result = await client.callTool({ name: 'get_trail_details', arguments: { trail_id: MISSING_ID } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No trail found');
  });

  it('rejects an id that is not a UUID, without calling the backend', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);

    const result = await client.callTool({ name: 'get_trail_details', arguments: { trail_id: 'abc' } });

    expect(result.isError).toBe(true);
    expect(backend.getTrail).not.toHaveBeenCalled();
  });

  it('shows the error of the backend to the model', async () => {
    const backend = { getTrail: vi.fn().mockRejectedValue(new BackendError(0, 'Backend not reachable')) };
    const client = await connect(backend);

    const result = await client.callTool({ name: 'get_trail_details', arguments: { trail_id: TRAIL_ID } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Backend not reachable');
  });
});

describe('resource trail://{trailId}', () => {
  it('is listed as a resource template', async () => {
    const client = await connect(fakeBackend());

    const { resourceTemplates } = await client.listResourceTemplates();

    expect(resourceTemplates).toEqual([
      expect.objectContaining({ name: 'trail', uriTemplate: 'trail://{trailId}', mimeType: 'application/geo+json' }),
    ]);
  });

  it('returns the whole trail as GeoJSON', async () => {
    const client = await connect(fakeBackend());

    const { contents } = await client.readResource({ uri: `trail://${TRAIL_ID}` });

    expect(contents).toHaveLength(1);
    expect(contents[0].uri).toBe(`trail://${TRAIL_ID}`);
    expect(contents[0].mimeType).toBe('application/geo+json');
    const { description: _description, ...properties } = TRAIL.properties;
    expect(JSON.parse(contents[0].text)).toEqual({ ...TRAIL, properties });
    expect(contents[0].text).not.toContain(TRAIL.properties.description);
  });

  it('fails when the trail does not exist or the id is not valid', async () => {
    const backend = fakeBackend();
    const client = await connect(backend);

    await expect(client.readResource({ uri: `trail://${MISSING_ID}` })).rejects.toThrow(/No trail found/);
    await expect(client.readResource({ uri: 'trail://abc' })).rejects.toThrow(/No trail found/);
    expect(backend.getTrail).toHaveBeenCalledTimes(1);
  });
});

describe('prompt plan_hike', () => {
  it('is listed with its arguments', async () => {
    const client = await connect(fakeBackend());

    const { prompts } = await client.listPrompts();

    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('plan_hike');
    expect(prompts[0].arguments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'trail_id', required: true }),
        expect.objectContaining({ name: 'experience', required: false }),
      ]),
    );
  });

  it('builds a message with the details of the trail and the experience of the hiker', async () => {
    const client = await connect(fakeBackend());

    const { messages } = await client.getPrompt({
      name: 'plan_hike',
      arguments: { trail_id: TRAIL_ID, experience: 'beginner' },
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content.text).toContain('Anello del Campus UniCal');
    expect(messages[0].content.text).toContain('Distance: 12.35 km');
    expect(messages[0].content.text).toContain('beginner');
    expect(messages[0].content.text).not.toContain(TRAIL.properties.description);
  });

  it('works without the experience', async () => {
    const client = await connect(fakeBackend());

    const { messages } = await client.getPrompt({ name: 'plan_hike', arguments: { trail_id: TRAIL_ID } });

    expect(messages[0].content.text).not.toContain('experience');
  });

  it('fails when the trail does not exist', async () => {
    const client = await connect(fakeBackend());

    await expect(client.getPrompt({ name: 'plan_hike', arguments: { trail_id: MISSING_ID } })).rejects.toThrow(
      /No trail found/,
    );
  });
});
