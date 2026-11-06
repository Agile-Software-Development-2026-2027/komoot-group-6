import { expect, test } from 'vitest';
import { IDLE_TIMEOUT_MS, isSessionExpired } from './sessionExpiry.js';

const NOW = 1_800_000_000_000;
// Sessione che per il backend scade fra un'ora (session_expires_at è in secondi)
const session = { access_token: 'access-123', session_expires_at: NOW / 1000 + 60 * 60 };

test('una sessione usata da poco e entro la durata massima è valida', () => {
  expect(isSessionExpired(session, NOW - 60 * 1000, NOW)).toBe(false);
});

test('la sessione scade dopo IDLE_TIMEOUT_MS senza attività', () => {
  expect(isSessionExpired(session, NOW - IDLE_TIMEOUT_MS + 1000, NOW)).toBe(false);
  expect(isSessionExpired(session, NOW - IDLE_TIMEOUT_MS, NOW)).toBe(true);
});

test("la sessione scade a session_expires_at anche se l'utente è attivo", () => {
  expect(isSessionExpired({ ...session, session_expires_at: NOW / 1000 }, NOW, NOW)).toBe(true);
});

test("senza ultima attività la sessione non è valida", () => {
  expect(isSessionExpired(session, null, NOW)).toBe(true);
});

test('con "Remember me" l\'inattività non conta, solo la durata massima', () => {
  const remembered = { ...session, remember_me: true };
  expect(isSessionExpired(remembered, NOW - 2 * IDLE_TIMEOUT_MS, NOW)).toBe(false);
  expect(isSessionExpired(remembered, null, NOW)).toBe(false);
  expect(isSessionExpired({ ...remembered, session_expires_at: NOW / 1000 }, NOW, NOW)).toBe(true);
});

test('senza session_expires_at conta solo l\'inattività', () => {
  expect(isSessionExpired({ access_token: 'access-123' }, NOW - 60 * 1000, NOW)).toBe(false);
  expect(isSessionExpired({ access_token: 'access-123' }, NOW - IDLE_TIMEOUT_MS, NOW)).toBe(true);
});
