// Tests for the core of the MCP server: a real MCP client talks to it in memory.
import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod/v4';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createMcpServer } from '../src/mcp/server.js';
import { BackendError } from '../src/mcp/backendClient.js';
import { textResult, errorResult } from '../src/mcp/toolResults.js';

// Connects a client to the server through a pair of linked in-memory transports
async function connect(server) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe('createMcpServer', () => {
  it('gives the backend client to every module, and their tools can be called', async () => {
    const backend = { getTrail: vi.fn().mockResolvedValue({ id: 't1' }) };
    const echoModule = vi.fn((server, backendClient) => {
      server.registerTool(
        'echo_trail',
        { description: 'Test tool', inputSchema: z.object({ id: z.string() }) },
        async ({ id }) => textResult(`trail ${(await backendClient.getTrail(id)).id}`),
      );
    });

    const client = await connect(createMcpServer({ backend, modules: [echoModule] }));

    expect(echoModule).toHaveBeenCalledWith(expect.anything(), backend);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(['echo_trail']);
    const result = await client.callTool({ name: 'echo_trail', arguments: { id: 't1' } });
    expect(result.content).toEqual([{ type: 'text', text: 'trail t1' }]);
  });
});

describe('errorResult', () => {
  it('shows the message of a BackendError to the model', () => {
    expect(errorResult(new BackendError(400, 'Invalid trail id'))).toEqual({
      isError: true,
      content: [{ type: 'text', text: 'Invalid trail id' }],
    });
  });

  it('hides the details of unexpected errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = errorResult(new Error('secret stack'));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain('secret');
  });
});
