// Entry point of the MCP server: node src/mcp/index.js.
// It uses stdio: the MCP client starts this process and
// talks to it on stdin/stdout. The backend must be running.
import dotenv from 'dotenv';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createBackendClient } from './backendClient.js';
import { createMcpServer } from './server.js';
import { createSession } from './session.js';

// quiet: stdout carries the MCP protocol, nothing else can be printed there
dotenv.config({ quiet: true });

const baseUrl = process.env.MCP_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

// Session of the user logged in with "pnpm mcp:login" (file ~/.komoot-mcp/session.json).
// The tokens are renewed through the public route POST /api/auth/refresh.
const publicBackend = createBackendClient({ baseUrl });
const session = createSession({
  refreshTokens: (refreshToken) =>
    publicBackend.request('POST', '/auth/refresh', { body: { refresh_token: refreshToken } }),
});

const backend = createBackendClient({ baseUrl, session });
serveStdio(() => createMcpServer({ backend }));

// Logs go to stderr (console.error), never to stdout
console.error('MCP server running on stdio');
