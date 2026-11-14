import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from './AuthProvider.jsx';
import { useAuth } from './useAuth.js';
import { getCurrentUser, loginUser, logoutUser, refreshSession } from '../services/loginService.js';
import { ACTIVITY_KEY, IDLE_TIMEOUT_MS, STORAGE_KEY } from '../config/auth.config.js';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(ACTIVITY_KEY, String(lastActivity));
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
  sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Pulsante che fa il login, con o senza "Remember me".
function LoginButton({ rememberMe }) {
  const { login } = useAuth();
  return <button onClick={() => login({ email: 'mario@esempio.it', password: 'password123', rememberMe })}>log in</button>;
}

test('con "Remember me" la sessione va in localStorage, senza in sessionStorage', async () => {
  for (const rememberMe of [true, false]) {
    loginUser.mockResolvedValue({ user: { id: 'abc-123' }, session: { ...SESSION, remember_me: rememberMe } });
    render(
      <AuthProvider>
        <LoginButton rememberMe={rememberMe} />
        <Status />
      </AuthProvider>
    );

    fireEvent.click(await screen.findByText('log in'));
    await screen.findByText('logged in');

    expect(loginUser).toHaveBeenCalledWith({ email: 'mario@esempio.it', password: 'password123', rememberMe });
    const saved = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    expect(JSON.parse(saved.getItem(STORAGE_KEY)).remember_me).toBe(rememberMe);
    expect(other.getItem(STORAGE_KEY)).toBeNull();

    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  }
});

test('senza "Remember me" la sessione si chiude a session_expires_at', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
  reloadPage({ session: { ...SESSION, session_expires_at: NOW / 1000 + 60, remember_me: false }, lastActivity: NOW });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.getByText('logged in')).toBeInTheDocument();

  Date.now.mockReturnValue(NOW + 60 * 1000);
  await act(() => vi.advanceTimersByTimeAsync(60 * 1000));

  expect(screen.getByText('session expired')).toBeInTheDocument();
  expect(logoutUser).toHaveBeenCalledWith('access-123');
});

test('al refresh, con il token scaduto, "Remember me" rinnova la sessione', async () => {
  getCurrentUser.mockRejectedValue(new Error('expired'));
  refreshSession.mockResolvedValue({ user: { id: 'abc-123' }, session: { ...SESSION, access_token: 'access-456', remember_me: true } });

  reloadPage({ session: { ...SESSION, remember_me: true }, lastActivity: NOW - 2 * IDLE_TIMEOUT_MS });

  expect(await screen.findByText('logged in')).toBeInTheDocument();
  expect(refreshSession).toHaveBeenCalledWith('refresh-123');
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).access_token).toBe('access-456');
});

test('al refresh, con il token scaduto e senza "Remember me", bisogna rifare il login', async () => {
  getCurrentUser.mockRejectedValue(new Error('expired'));

  reloadPage({ session: { ...SESSION, remember_me: false }, lastActivity: NOW - MINUTE });

  expect(await screen.findByText('session expired')).toBeInTheDocument();
  expect(refreshSession).not.toHaveBeenCalled();
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
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(localStorage.getItem(ACTIVITY_KEY)).toBeNull();
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
