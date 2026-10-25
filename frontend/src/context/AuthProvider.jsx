import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../services/api.js';
import { getCurrentUser, loginUser, logoutUser, refreshSession } from '../services/loginService.js';
import { AuthContext } from './AuthContext.js';

// Nome con cui la sessione viene salvata nel browser (localStorage).
const STORAGE_KEY = 'auth.session';

// Legge la sessione salvata. Restituisce null se non c'è o non si riesce a leggerla.
function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Salva la sessione nel browser, o la cancella se è null.
// Restituisce false se il browser non permette di salvare (per esempio in navigazione privata).
function writeStoredSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

// Tiene lo stato del login (utente e sessione) e lo mette a disposizione di tutta l'app.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true finché non sappiamo se la sessione salvata è ancora valida
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  // La sessione sta anche in un ref, così le funzioni qui sotto leggono sempre il valore aggiornato.
  const sessionRef = useRef(null);

  // Aggiorna la sessione in tutti e tre i posti: ref, stato e browser.
  const persist = useCallback((next) => {
    sessionRef.current = next;
    setSession(next);
    writeStoredSession(next);
  }, []);

  // All'apertura dell'app: se c'è una sessione salvata la fa verificare al backend.
  // Se l'access token è scaduto prova a rinnovarlo col refresh token, se non ci riesce l'utente risulta non loggato.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStoredSession();

      if (!stored?.access_token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser(stored.access_token);
        if (!cancelled) {
          persist(stored);
          setUser(data.user);
        }
      } catch {
        try {
          const data = await refreshSession(stored.refresh_token);
          if (!cancelled) {
            persist(data.session);
            setUser(data.user);
          }
        } catch {
          if (!cancelled) {
            persist(null);
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  // Login: il backend verifica le credenziali, poi salviamo sessione e utente.
  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginUser({ email, password });
      persist(data.session);
      setUser(data.user);
      return data.user;
    },
    [persist]
  );

  // Logout: avvisa il backend, poi cancella la sessione locale anche se la chiamata fallisce, perché l'utente ha chiesto di uscire.
  const logout = useCallback(async () => {
    const token = sessionRef.current?.access_token;
    if (token) await logoutUser(token).catch(() => null);
    persist(null);
    setUser(null);
  }, [persist]);

  // Da usare per ogni chiamata a una rotta protetta, al posto di apiRequest.
  // Aggiunge il token e se è scaduto lo rinnova una volta e riprova.
  const authFetch = useCallback(
    async (path, options = {}) => {
      const current = sessionRef.current;

      if (!current?.access_token) {
        throw new ApiError('You are not logged in.', 401);
      }

      try {
        return await apiRequest(path, { ...options, token: current.access_token });
      } catch (err) {
        const isExpired = err instanceof ApiError && err.status === 401;
        if (!isExpired || !current.refresh_token) throw err;

        let refreshed;
        try {
          refreshed = await refreshSession(current.refresh_token);
        } catch {
          persist(null);
          setUser(null);
          throw new ApiError('Session expired. Please log in again.', 401);
        }

        persist(refreshed.session);
        setUser(refreshed.user);
        return apiRequest(path, { ...options, token: refreshed.session.access_token });
      }
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      authFetch,
    }),
    [user, session, loading, login, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
