// Tests for the session of the MCP server (SCRUM-71) and for the requests made as the user.
// FAKE: the clock, the refresh route and fetch. The session file goes in a temporary folder.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSession, SessionError } from '../src/mcp/session.js';
import { BackendError, createBackendClient, LOGIN_REQUIRED } from '../src/mcp/backendClient.js';
import { login, logout } from '../src/mcp/login.js';

const NOW = 1_800_000_000; // a fixed "now", in seconds

// An answer of POST /api/auth/login or /api/auth/refresh
function authAnswer(n, { expiresIn = 60 } = {}) {
  return {
    user: { username: 'mario' },
    session: {
      access_token: `access-${n}`,
      refresh_token: `refresh-${n}`,
      expires_at: NOW + expiresIn,
      session_expires_at: NOW + 30 * 24 * 3600,
    },
  };
}

let dir;
let filePath;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mcp-session-'));
  filePath = join(dir, 'session.json');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('createSession', () => {
  it('without the file nobody is logged in', async () => {
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    expect(await session.isLoggedIn()).toBe(false);
  });

  it('saves only the tokens and the username, readable only by the owner', async () => {
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    await session.save({ ...authAnswer(1), user: { username: 'mario', email: 'mario@example.com' } });

    const saved = JSON.parse(await readFile(filePath, 'utf8'));
    expect(Object.keys(saved).sort()).toEqual(['access_token', 'expires_at', 'refresh_token', 'session_expires_at', 'username']);
    expect(await session.isLoggedIn()).toBe(true);
    if (process.platform !== 'win32') expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it('gives the saved token while it is valid, without renewing it', async () => {
    const refreshTokens = vi.fn();
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1));

    expect(await session.getAccessToken()).toBe('access-1');
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it('renews an expiring token and saves the NEW refresh token (rotation)', async () => {
    const refreshTokens = vi.fn().mockResolvedValue(authAnswer(2));
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1, { expiresIn: 5 })); // expires in 5 seconds

    expect(await session.getAccessToken()).toBe('access-2');
    expect(refreshTokens).toHaveBeenCalledWith('refresh-1');
    expect(JSON.parse(await readFile(filePath, 'utf8')).refresh_token).toBe('refresh-2');
  });

  it('renews only once when two requests need it at the same time', async () => {
    const refreshTokens = vi.fn().mockResolvedValue(authAnswer(2));
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1, { expiresIn: 0 }));

    const tokens = await Promise.all([session.getAccessToken(), session.getAccessToken()]);
    expect(tokens).toEqual(['access-2', 'access-2']);
    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });

  it('asks for a new login when the refresh token does not work anymore', async () => {
    const refreshTokens = vi.fn().mockRejectedValue(new BackendError(401, 'Session expired. Please log in again.'));
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1, { expiresIn: 0 }));

    const err = await session.getAccessToken().catch((e) => e);
    expect(err).toBeInstanceOf(SessionError);
    expect(err.status).toBe(401);
    expect(err.message).toContain('pnpm mcp:login');
  });

  it('says that the backend is off instead of asking a new login', async () => {
    const refreshTokens = vi.fn().mockRejectedValue(new BackendError(0, 'Backend not reachable'));
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1, { expiresIn: 0 }));

    await expect(session.getAccessToken()).rejects.toMatchObject({ status: 0, message: 'Backend not reachable' });
  });

  it('is not valid anymore after its maximum duration', async () => {
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW + 31 * 24 * 3600 });
    await session.save(authAnswer(1));
    expect(await session.isLoggedIn()).toBe(false);
  });
});

describe('requests as the logged-in user (backendClient + session)', () => {
  const okJson = (body, status = 200) => new Response(JSON.stringify(body), { status });

  it('without login answers "Login required" and does not call the backend', async () => {
    const fetchFn = vi.fn();
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn, session });

    await expect(backend.savedTrails()).rejects.toMatchObject({ status: 401, message: LOGIN_REQUIRED });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sends the token and the JSON body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson({ trailId: 't1' }, 201));
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    await session.save(authAnswer(1));
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn, session });

    await backend.saveTrail('t1');

    const [url, options] = fetchFn.mock.calls[0];
    expect(String(url)).toBe('http://x/api/profile/saved-trails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer access-1');
    expect(JSON.parse(options.body)).toEqual({ trailId: 't1' });
  });

  it('on 401 renews the token once and repeats the request', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(okJson({ error: 'Invalid or expired session' }, 401))
      .mockResolvedValueOnce(okJson([]));
    const refreshTokens = vi.fn().mockResolvedValue(authAnswer(2));
    const session = createSession({ filePath, refreshTokens, now: () => NOW });
    await session.save(authAnswer(1));
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn, session });

    await expect(backend.savedTrails()).resolves.toEqual([]);
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBe('Bearer access-2');
  });

  it('an empty answer (204) is null, not an error', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    await session.save(authAnswer(1));
    const backend = createBackendClient({ baseUrl: 'http://x', fetchFn, session });

    await expect(backend.unsaveTrail('t1')).resolves.toBeNull();
    expect(fetchFn.mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('login and logout', () => {
  it('logs in with Remember me and saves the session', async () => {
    const backend = { request: vi.fn().mockResolvedValue(authAnswer(1)) };
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });

    await login({ backend, session, email: 'mario@example.com', password: 'Secret!123' });

    expect(backend.request).toHaveBeenCalledWith('POST', '/auth/login', {
      body: { email: 'mario@example.com', password: 'Secret!123', rememberMe: true },
    });
    const saved = await readFile(filePath, 'utf8');
    expect(saved).not.toContain('Secret!123'); // the password is never saved
    expect(await session.isLoggedIn()).toBe(true);
  });

  it('logout deletes the file even if the backend is off', async () => {
    const backend = { request: vi.fn().mockRejectedValue(new BackendError(0, 'Backend not reachable')) };
    const session = createSession({ filePath, refreshTokens: vi.fn(), now: () => NOW });
    await session.save(authAnswer(1));

    await logout({ backend, session });
    expect(await session.isLoggedIn()).toBe(false);
  });
});