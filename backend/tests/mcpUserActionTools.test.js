// Tests for the MCP module "user actions" (SCRUM-71).
// A real MCP client talks in memory to a server that has only this module.
// FAKE: the backend client (no real backend, no database, no session file).
import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createMcpServer } from '../src/mcp/server.js';
import { BackendError, LOGIN_REQUIRED } from '../src/mcp/backendClient.js';
import { registerUserActionTools } from '../src/mcp/userActionTools.js';

const TRAIL_ID = '35250633-b182-4751-914e-54b843aea897';
const OTHER_ID = 'f08a5f77-0000-4000-8000-000000000001';
const NAMES = { [TRAIL_ID]: 'Anello del Campus UniCal', [OTHER_ID]: 'Colline di Rende e Valle del Surdo' };

function fakeBackend() {
  return {
    getTrail: vi.fn(async (id) => (NAMES[id] ? { properties: { id, name: NAMES[id] } } : null)),
    saveTrail: vi.fn().mockResolvedValue({ trailId: TRAIL_ID }),
    unsaveTrail: vi.fn().mockResolvedValue(null),
    completeTrail: vi.fn().mockResolvedValue({ trailId: TRAIL_ID, pointsEarned: 40, level: 2, levelName: 'Explorer', levelUp: true }),
    savedTrails: vi.fn().mockResolvedValue([{ trail_id: OTHER_ID, created_at: '2026-11-20T10:00:00Z' }]),
    completedTrails: vi.fn().mockResolvedValue([]),
    points: vi.fn().mockResolvedValue({
      totalPoints: 120, completedRoutes: 3,
      level: { number: 2, name: 'Explorer', pointsToNext: 80, nextLevelName: 'Trailblazer' },
    }),
  };
}

async function connect(backend) {
  const server = createMcpServer({ backend, modules: [registerUserActionTools] });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

const call = (client, name, args = {}) => client.callTool({ name, arguments: args });
const text = (result) => result.content[0].text;

describe('user action tools: guardrails in the definitions', () => {
  it('marks which tools change data and which only read', async () => {
    const { tools } = await (await connect(fakeBackend())).listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

    expect(Object.keys(byName).sort()).toEqual([
      'mark_trail_completed', 'my_completed_trails', 'my_points', 'my_saved_trails', 'save_trail', 'unsave_trail',
    ]);
    for (const name of ['my_saved_trails', 'my_completed_trails', 'my_points']) {
      expect(byName[name].annotations.readOnlyHint).toBe(true);
    }
    for (const name of ['save_trail', 'unsave_trail', 'mark_trail_completed']) {
      expect(byName[name].annotations.readOnlyHint).toBe(false);
      expect(byName[name].description).toContain('ONLY when the user explicitly asks');
    }
    expect(byName.unsave_trail.annotations.destructiveHint).toBe(true);
  });

  it('refuses an id that is not a trail id, without calling the backend', async () => {
    const backend = fakeBackend();
    const result = await call(await connect(backend), 'save_trail', { trail_id: 'DROP TABLE trails' });

    expect(result.isError).toBe(true);
    expect(backend.saveTrail).not.toHaveBeenCalled();
  });
});

describe('save_trail and unsave_trail', () => {
  it('saves the trail and answers with its name', async () => {
    const backend = fakeBackend();
    const result = await call(await connect(backend), 'save_trail', { trail_id: TRAIL_ID });

    expect(backend.saveTrail).toHaveBeenCalledWith(TRAIL_ID);
    expect(text(result)).toBe('Saved "Anello del Campus UniCal" in your saved trails.');
  });

  it('a trail already saved is not an error', async () => {
    const backend = fakeBackend();
    backend.saveTrail.mockRejectedValue(new BackendError(409, 'Trail already saved'));
    const result = await call(await connect(backend), 'save_trail', { trail_id: TRAIL_ID });

    expect(result.isError).toBeFalsy();
    expect(text(result)).toContain('was already in your saved trails');
  });

  it('a trail that does not exist is not saved', async () => {
    const backend = fakeBackend();
    const missing = '00000000-0000-4000-8000-000000000000';
    const result = await call(await connect(backend), 'save_trail', { trail_id: missing });

    expect(result.isError).toBe(true);
    expect(text(result)).toBe(`Trail not found: ${missing}`);
    expect(backend.saveTrail).not.toHaveBeenCalled();
  });

  it('removes a saved trail', async () => {
    const backend = fakeBackend();
    const result = await call(await connect(backend), 'unsave_trail', { trail_id: TRAIL_ID });

    expect(backend.unsaveTrail).toHaveBeenCalledWith(TRAIL_ID);
    expect(text(result)).toBe('"Anello del Campus UniCal" is no longer in your saved trails.');
  });
});

describe('mark_trail_completed', () => {
  it('reports the points earned and the level up', async () => {
    const result = await call(await connect(fakeBackend()), 'mark_trail_completed', { trail_id: TRAIL_ID });

    expect(text(result)).toBe('"Anello del Campus UniCal" marked as completed: +40 points. Level up: now level 2 (Explorer).');
    expect(result.structuredContent).toMatchObject({ pointsEarned: 40, levelUp: true });
  });

  it('a trail completed twice gives no new points', async () => {
    const backend = fakeBackend();
    backend.completeTrail.mockRejectedValue(new BackendError(409, 'Trail already completed'));
    const result = await call(await connect(backend), 'mark_trail_completed', { trail_id: TRAIL_ID });

    expect(text(result)).toContain('already completed: no new points');
  });
});

describe('my_saved_trails, my_completed_trails, my_points', () => {
  it('lists the saved trails with their names and dates', async () => {
    const result = await call(await connect(fakeBackend()), 'my_saved_trails');
    expect(text(result)).toBe(`1 saved trail(s):\n1. Colline di Rende e Valle del Surdo [id: ${OTHER_ID}] (2026-11-20)`);
  });

  it('says clearly when the list is empty', async () => {
    const result = await call(await connect(fakeBackend()), 'my_completed_trails');
    expect(text(result)).toBe('You have not completed any trail yet.');
  });

  it('describes points and level', async () => {
    const result = await call(await connect(fakeBackend()), 'my_points');
    expect(text(result)).toBe('120 points from 3 completed trail(s). Level 2 (Explorer). 80 points to the next level (Trailblazer).');
  });
});

describe('without login', () => {
  it('every user tool answers "Login required" (the model can tell the user what to do)', async () => {
    const backend = fakeBackend();
    for (const method of ['saveTrail', 'savedTrails', 'points']) {
      backend[method].mockRejectedValue(new BackendError(401, LOGIN_REQUIRED));
    }
    const client = await connect(backend);

    for (const [name, args] of [['save_trail', { trail_id: TRAIL_ID }], ['my_saved_trails', {}], ['my_points', {}]]) {
      const result = await call(client, name, args);
      expect(result.isError).toBe(true);
      expect(text(result)).toContain('pnpm mcp:login');
    }
  });
});