import { afterEach, describe, expect, it, vi } from 'vitest';

// The session lengths are read from .env when the module is loaded:
// each test loads it again with different values.
async function loadConfig() {
  vi.resetModules();
  return import('../src/config/auth.config.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('auth.config', () => {
  it('uses 8 hours and 30 days when .env does not set the lengths', async () => {
    vi.stubEnv('SESSION_MAX_AGE_SECONDS', '');
    vi.stubEnv('REMEMBER_ME_MAX_AGE_SECONDS', '');

    const config = await loadConfig();

    expect(config.SESSION_MAX_AGE_SECONDS).toBe(8 * 60 * 60);
    expect(config.REMEMBER_ME_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it('reads the lengths from .env as numbers', async () => {
    vi.stubEnv('SESSION_MAX_AGE_SECONDS', '60');

    const config = await loadConfig();

    expect(config.SESSION_MAX_AGE_SECONDS).toBe(60);
  });

  it.each(['abc', '0', '-5', '1.5'])('stops at startup when the value is "%s"', async (value) => {
    vi.stubEnv('SESSION_MAX_AGE_SECONDS', value);

    await expect(loadConfig()).rejects.toThrow('SESSION_MAX_AGE_SECONDS must be a positive whole number');
  });
});