import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_EVENTS,
  ACTIVITY_KEY,
  ACTIVITY_SAVE_INTERVAL_MS,
  EXPIRY_CHECK_INTERVAL_MS,
  IDLE_TIMEOUT_MS,
  MAX_AGE,
  MAX_TIMEOUT_MS,
  MIN_AGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  STORAGE_KEY,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './auth.config.js';
import { NOTICE_MS, SAVE_MESSAGE_MS } from './ui.config.js';

describe('auth.config', () => {
  it('defines distinct non-empty storage keys for session and activity', () => {
    expect(STORAGE_KEY).toBe('auth.session');
    expect(ACTIVITY_KEY).toBe('auth.lastActivity');
    expect(STORAGE_KEY).not.toBe(ACTIVITY_KEY);
  });

  it('tracks the expected DOM activity events', () => {
    expect(ACTIVITY_EVENTS).toEqual(['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']);
  });

  it('sets valid positive intervals for activity tracking and session expiry', () => {
    expect(ACTIVITY_SAVE_INTERVAL_MS).toBe(15 * 1000);
    expect(EXPIRY_CHECK_INTERVAL_MS).toBe(30 * 1000);
    expect(IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
    expect(ACTIVITY_SAVE_INTERVAL_MS).toBeLessThan(IDLE_TIMEOUT_MS);
    expect(EXPIRY_CHECK_INTERVAL_MS).toBeLessThan(IDLE_TIMEOUT_MS);
    expect(MAX_TIMEOUT_MS).toBe(2_147_483_647);
  });

  it('keeps sign-up rules aligned with the backend and bcrypt limits', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(20);
    expect(PASSWORD_MIN_LENGTH).toBeLessThan(PASSWORD_MAX_LENGTH);
    expect(PASSWORD_MAX_LENGTH).toBeLessThanOrEqual(72);

    expect(USERNAME_MIN_LENGTH).toBe(3);
    expect(USERNAME_MAX_LENGTH).toBe(30);
    expect(USERNAME_MIN_LENGTH).toBeLessThan(USERNAME_MAX_LENGTH);

    expect(MIN_AGE).toBe(14);
    expect(MAX_AGE).toBe(120);
    expect(MIN_AGE).toBeLessThan(MAX_AGE);
  });
});

describe('ui.config', () => {
  it('defines separate durations for bookmark messages (6s) and short notices (3s)', () => {
    expect(SAVE_MESSAGE_MS).toBe(6000);
    expect(NOTICE_MS).toBe(3000);
    expect(SAVE_MESSAGE_MS).toBeGreaterThan(NOTICE_MS);
  });
});
