// Session of the user logged in to the MCP server
//
// The tools that act for the user need the user's access token. The access token lasts very little 
// (on our Supabase project, 60 seconds),
// so it is renewed with the refresh token through POST /api/auth/refresh.
// Supabase ROTATES the refresh token: every renewal gives a new one and the old one stops
// working. So the tokens are kept in a small file that is rewritten after each renewal.
//
// The file is created by "pnpm mcp:login". It contains only the tokens and the
// username: never the password. It is readable only by the user who owns it (mode 600).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { BackendError } from './backendClient.js';

// Where the session is saved: ~/.komoot-mcp/session.json (or MCP_SESSION_FILE)
export function defaultSessionFile() {
  return process.env.MCP_SESSION_FILE || join(homedir(), '.komoot-mcp', 'session.json');
}

// The access token is renewed when less than this is left (time for the request to arrive)
const RENEW_BEFORE_SECONDS = 15;

const nowInSeconds = () => Math.floor(Date.now() / 1000);

// filePath:      where the session is kept
// refreshTokens: async (refreshToken) => answer of POST /api/auth/refresh ({ user, session })
// now:           injectable clock, for the tests
export function createSession({ filePath = defaultSessionFile(), refreshTokens, now = nowInSeconds } = {}) {
  // Renewal in progress: two tools called together must not renew twice
  // (the second renewal would use a refresh token that has already been replaced)
  let renewing = null;

  // The file is read every time: a login done while the server runs is seen at once
  async function read() {
    try {
      return JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
      return null; // no file (nobody logged in) or a broken file
    }
  }

  // Saves only what is needed; mode 0o600 = only the owner can read and write the file
  async function save({ user, session }) {
    const data = {
      username: user?.username ?? null,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at, // when the access token expires (seconds)
      session_expires_at: session.session_expires_at, // when a new login is needed (seconds)
    };
    await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    await writeFile(filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
    return data;
  }

  async function clear() {
    await rm(filePath, { force: true });
  }

  // Asks the backend for new tokens and saves them; returns the new access token
  async function renew() {
    const current = await read();
    if (!current?.refresh_token) throw new SessionError();
    try {
      const saved = await save(await refreshTokens(current.refresh_token));
      return saved.access_token;
    } catch (err) {
      // Backend switched off: say that, the session itself may still be fine
      if (err instanceof BackendError && err.status === 0) throw err;
      // Refresh token expired or already used: the user has to log in again
      throw new SessionError();
    }
  }

  // Renews the tokens (one renewal at a time)
  function refresh() {
    renewing ??= renew().finally(() => {
      renewing = null;
    });
    return renewing;
  }

  return {
    filePath,
    read,
    save,
    clear,
    refresh,

    // true if there is a session that has not reached its maximum duration
    async isLoggedIn() {
      const data = await read();
      return Boolean(data?.refresh_token) && !(data.session_expires_at && data.session_expires_at <= now());
    },

    // A valid access token: the saved one, or a new one if it is about to expire
    async getAccessToken() {
      const data = await read();
      if (data?.access_token && data.expires_at - now() > RENEW_BEFORE_SECONDS) return data.access_token;
      return refresh();
    },
  };
}

// The session cannot be renewed: a new "pnpm mcp:login" is needed.
// It is a BackendError 401, so errorResult shows its message to the model.
export class SessionError extends BackendError {
  constructor() {
    super(401, 'Session expired: the user has to run "pnpm mcp:login" in the backend folder again.');
    this.name = 'SessionError';
  }
}