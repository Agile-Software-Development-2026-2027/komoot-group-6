// Login and logout of the MCP server (SCRUM-71), from the terminal:
//   pnpm mcp:login    asks email and password, logs in through POST /api/auth/login
//                     and saves the session (tokens only, never the password)
//   pnpm mcp:logout   closes the session on the backend and deletes the file
// The backend must be running.
import dotenv from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { createBackendClient } from './backendClient.js';
import { createSession } from './session.js';

// Logs in with "Remember me": the session can be renewed for up to 30 days
export async function login({ backend, session, email, password }) {
  const answer = await backend.request('POST', '/auth/login', { body: { email, password, rememberMe: true } });
  return session.save(answer);
}

// Closes the session on the backend (if possible) and always deletes the local file
export async function logout({ backend, session }) {
  if (await session.isLoggedIn()) {
    // If the backend is off or the token has expired, the file is deleted anyway
    await backend.request('POST', '/auth/logout', { auth: true }).catch(() => {});
  }
  await session.clear();
}

// Asks for email and password; the password is not shown while typing.
// readline echoes what is typed into "output": while "muted" is true, nothing is shown.
async function askCredentials() {
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!output.muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  // The lines typed by the user, one at a time
  const lines = rl[Symbol.asyncIterator]();

  async function ask(prompt, hidden = false) {
    process.stdout.write(prompt);
    output.muted = hidden;
    const { value } = await lines.next();
    output.muted = false;
    if (hidden) process.stdout.write('\n');
    return value ?? '';
  }

  try {
    const email = (await ask('Email: ')).trim();
    const password = await ask('Password: ', true);
    if (!email || !password) throw new Error('email and password are required');
    return { email, password };
  } finally {
    rl.close();
  }
}

async function main() {
  dotenv.config({ quiet: true });
  const baseUrl = process.env.MCP_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const publicBackend = createBackendClient({ baseUrl });
  const session = createSession({
    refreshTokens: (refreshToken) =>
      publicBackend.request('POST', '/auth/refresh', { body: { refresh_token: refreshToken } }),
  });
  const backend = createBackendClient({ baseUrl, session });

  if (process.argv.includes('--logout')) {
    await logout({ backend, session });
    console.log('Logged out: the MCP session has been deleted.');
    return;
  }

  const { email, password } = await askCredentials();
  const saved = await login({ backend, session, email, password });
  const until = saved.session_expires_at ? new Date(saved.session_expires_at * 1000).toLocaleDateString() : 'unknown';
  console.log(`Logged in as ${saved.username ?? email}. The MCP session is valid until ${until}.`);
  console.log(`Session saved in ${session.filePath}`);
}

// Runs only when started from the terminal, not when imported by the tests
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`Login failed: ${err.message}`);
    process.exitCode = 1;
  });
}