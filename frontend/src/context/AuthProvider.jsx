import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest } from '../services/api.js';
import { getCurrentUser, loginUser, logoutUser, refreshSession } from '../services/loginService.js';
import { isSessionExpired } from '../utils/sessionExpiry.js';
import { AuthContext } from './AuthContext.js';

// Nome con cui la sessione viene salvata nel browser (localStorage).
const STORAGE_KEY = 'auth.session';
// Momento dell'ultima attività dell'utente. È salvato a parte perché cambia spesso:
// così resta dopo un refresh della pagina ed è condiviso tra le schede aperte sul sito.
const ACTIVITY_KEY = 'auth.lastActivity';
// Gli eventi che contano come attività dell'utente.
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
// L'attività viene salvata al massimo una volta ogni 15 secondi.
const ACTIVITY_SAVE_INTERVAL_MS = 15 * 1000;
// Ogni quanto controllare, mentre l'app è aperta, se la sessione è scaduta.
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;

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

// Legge il momento dell'ultima attività (in millisecondi). Restituisce null se non c'è.
function readLastActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || null;
  } catch {
    return null;
  }
}

// Salva il momento dell'ultima attività, o lo cancella se è null.
function writeLastActivity(time) {
  try {
    if (time) localStorage.setItem(ACTIVITY_KEY, String(time));
    else localStorage.removeItem(ACTIVITY_KEY);
  } catch {
  }
}

// Tiene lo stato del login (utente e sessione) e lo mette a disposizione di tutta l'app.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true finché non sappiamo se la sessione salvata è ancora valida
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  // true se l'utente è stato disconnesso perché la sessione era scaduta: la pagina di login lo spiega.
  const [sessionExpired, setSessionExpired] = useState(false);
  // La sessione sta anche in un ref, così le funzioni qui sotto leggono sempre il valore aggiornato.
  const sessionRef = useRef(null);
  // Anche l'ultima attività sta in memoria, per quando il browser non permette di salvarla.
  const lastActivityRef = useRef(null);

  // Aggiorna il momento dell'ultima attività in memoria e nel browser (null lo cancella).
  const setLastActivity = useCallback((time) => {
    lastActivityRef.current = time;
    writeLastActivity(time);
  }, []);

  // L'ultima attività più recente tra quella in memoria e quella salvata nel browser,
  // che può essere stata aggiornata da un'altra scheda aperta sul sito.
  const getLastActivity = useCallback(
    () => Math.max(lastActivityRef.current ?? 0, readLastActivity() ?? 0) || null,
    []
  );

  // Aggiorna la sessione in tutti e tre i posti: ref, stato e browser.
  // Senza sessione non serve più ricordare l'ultima attività.
  const persist = useCallback(
    (next) => {
      sessionRef.current = next;
      setSession(next);
      writeStoredSession(next);
      if (!next) setLastActivity(null);
    },
    [setLastActivity]
  );

  // All'apertura dell'app (quindi anche a ogni refresh della pagina): se c'è una sessione salvata
  // e non è scaduta la fa verificare al backend.
  // Se l'access token è scaduto prova a rinnovarlo col refresh token, se non ci riesce l'utente risulta non loggato.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStoredSession();

      if (!stored?.access_token) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Troppo tempo senza attività o dal login: la sessione non viene ripristinata e si torna al login.
      if (isSessionExpired(stored, readLastActivity())) {
        logoutUser(stored.access_token).catch(() => null);
        if (!cancelled) {
          persist(null);
          setSessionExpired(true);
          setLoading(false);
        }
        return;
      }

      // La sessione è ancora valida: il refresh della pagina conta come attività.
      setLastActivity(Date.now());

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
  }, [persist, setLastActivity]);

  // Login: il backend verifica le credenziali, poi salviamo sessione e utente.
  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginUser({ email, password });
      setLastActivity(Date.now());
      persist(data.session);
      setUser(data.user);
      setSessionExpired(false);
      return data.user;
    },
    [persist, setLastActivity]
  );

  // Logout: avvisa il backend, poi cancella la sessione locale anche se la chiamata fallisce, perché l'utente ha chiesto di uscire.
  const logout = useCallback(async () => {
    const token = sessionRef.current?.access_token;
    if (token) await logoutUser(token).catch(() => null);
    persist(null);
    setUser(null);
  }, [persist]);

  // Scadenza della sessione: è un logout, ma la pagina di login spiega all'utente cosa è successo.
  const expireSession = useCallback(async () => {
    setSessionExpired(true);
    await logout();
  }, [logout]);

  // Mentre l'utente è loggato registra la sua attività e controlla se la sessione è scaduta:
  useEffect(() => {
    if (!user) return;

    // Evita di chiudere la sessione più volte mentre il logout è in corso.
    let ended = false;
    function checkExpiry() {
      if (!ended && isSessionExpired(sessionRef.current, getLastActivity())) {
        ended = true;
        expireSession();
      }
      return ended;
    }

    let lastSaved = 0;
    function handleActivity() {
      const now = Date.now();
      if (now - lastSaved < ACTIVITY_SAVE_INTERVAL_MS) return;
      lastSaved = now;
      if (!checkExpiry()) setLastActivity(now);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') checkExpiry();
    }

    // capture: l'evento arriva qui anche se un componente ne blocca la propagazione.
    const options = { capture: true, passive: true };
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, handleActivity, options));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const timer = setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, handleActivity, options));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(timer);
    };
  }, [user, expireSession, getLastActivity, setLastActivity]);


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
          setSessionExpired(true);
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
      sessionExpired,
      login,
      logout,
      authFetch,
    }),
    [user, session, loading, sessionExpired, login, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
