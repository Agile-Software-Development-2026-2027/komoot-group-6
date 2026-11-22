// Entry point of the MCP server: node src/mcp/index.js.
// It uses stdio: the MCP client starts this process and
// talks to it on stdin/stdout. The backend must be running.
import dotenv from 'dotenv';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createBackendClient } from './backendClient.js';
import { createMcpServer } from './server.js';

// quiet: stdout carries the MCP protocol, nothing else can be printed there
dotenv.config({ quiet: true });

const backend = createBackendClient({
  baseUrl: process.env.MCP_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
});

serveStdio(() => createMcpServer({ backend }));

// Logs go to stderr (console.error), never to stdout
console.error('MCP server running on stdio');
