import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from './AuthProvider.jsx';
import { useAuth } from './useAuth.js';
import { getCurrentUser, logoutUser } from '../services/loginService.js';
import { IDLE_TIMEOUT_MS } from '../utils/sessionExpiry.js';

vi.mock('../services/loginService.js', () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  refreshSession: vi.fn(),
}));

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;
// Sessione salvata da un login precedente: per il backend scade fra 4 ore.
const SESSION = {
  access_token: 'access-123',
  refresh_token: 'refresh-123',
  session_expires_at: NOW / 1000 + 4 * 60 * 60,
};

// Mostra lo stato del login.
function Status() {
  const { loading, isAuthenticated, sessionExpired } = useAuth();
  if (loading) return <p>loading</p>;
  if (isAuthenticated) return <p>logged in</p>;
  return <p>{sessionExpired ? 'session expired' : 'logged out'}</p>;
}

// Simula il refresh della pagina.
function reloadPage({ session = SESSION, lastActivity }) {
  localStorage.setItem('auth.session', JSON.stringify(session));
  localStorage.setItem('auth.lastActivity', String(lastActivity));
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  getCurrentUser.mockResolvedValue({ user: { id: 'abc-123', email: 'mario@esempio.it' } });
  logoutUser.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

test('al refresh una sessione usata da poco resta attiva', async () => {
  reloadPage({ lastActivity: NOW - 5 * MINUTE });

  expect(await screen.findByText('logged in')).toBeInTheDocument();
  expect(getCurrentUser).toHaveBeenCalledWith('access-123');
});

test('al refresh una sessione inattiva da più di 30 minuti non viene ripristinata', async () => {
  reloadPage({ lastActivity: NOW - IDLE_TIMEOUT_MS - MINUTE });

  expect(await screen.findByText('session expired')).toBeInTheDocument();
  expect(getCurrentUser).not.toHaveBeenCalled();
  expect(logoutUser).toHaveBeenCalledWith('access-123');
  expect(localStorage.getItem('auth.session')).toBeNull();
  expect(localStorage.getItem('auth.lastActivity')).toBeNull();
});

test('al refresh una sessione oltre la durata massima non viene ripristinata', async () => {
  reloadPage({ session: { ...SESSION, session_expires_at: NOW / 1000 }, lastActivity: NOW - MINUTE });

  expect(await screen.findByText('session expired')).toBeInTheDocument();
  expect(getCurrentUser).not.toHaveBeenCalled();
});

test("l'attività dell'utente sposta in avanti la scadenza", async () => {
  reloadPage({ lastActivity: NOW - MINUTE });
  await screen.findByText('logged in');

  Date.now.mockReturnValue(NOW + 20 * MINUTE);
  fireEvent.pointerMove(window);
  Date.now.mockReturnValue(NOW + 45 * MINUTE);
  fireEvent.pointerMove(window);

  expect(screen.getByText('logged in')).toBeInTheDocument();
  expect(logoutUser).not.toHaveBeenCalled();
});

test('chi torna dopo più di 30 minuti di inattività viene disconnesso al primo movimento', async () => {
  reloadPage({ lastActivity: NOW - MINUTE });
  await screen.findByText('logged in');

  
  Date.now.mockReturnValue(NOW + IDLE_TIMEOUT_MS + MINUTE);
  fireEvent.pointerMove(window);

  expect(await screen.findByText('session expired')).toBeInTheDocument();
  expect(logoutUser).toHaveBeenCalledWith('access-123');
});
