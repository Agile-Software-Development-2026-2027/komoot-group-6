import { McpServer } from '@modelcontextprotocol/server';

// Every MCP module exports a function register(server, backend) that adds its
// tools, resources and prompts. To add a module, import it and put it in this list.
export const MODULES = [];

// Creates the MCP server of the site. backend is the client of createBackendClient().
export function createMcpServer({ backend, modules = MODULES }) {
  const server = new McpServer(
    { name: 'komoot-group-6', version: '1.0.0' },
    {
      instructions:
        'Hiking trails of the site: use the tools to search trails and read their details.',
    },
  );
  for (const register of modules) {
    register(server, backend);
  }
  return server;
}
