import { McpServer } from '@modelcontextprotocol/server';
import { registerTrailSearchTools } from './trailSearchTools.js';
import { registerUserActionTools } from './userActionTools.js';

export const MODULES = [registerTrailSearchTools, registerUserActionTools];


export function createMcpServer({ backend, modules = MODULES }) {
  const server = new McpServer(
    { name: 'komoot-group-6', version: '1.0.0' },
    {
      instructions:
        'Hiking trails of the site: use the tools to search trails and read their details. ' +
        'The tools that act for the user (save, complete) are used only when the user asks for it.',
    },
  );
  for (const register of modules) {
    register(server, backend);
  }
  return server;
}
