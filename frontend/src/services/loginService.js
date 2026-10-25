import { apiRequest } from './api.js';


// Come nella registrazione, l'email viene ripulita dagli spazi e la password no.
export function loginUser({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
}

// Il backend revoca il token su Supabase.
export function logoutUser(token) {
  return apiRequest('/auth/logout', { method: 'POST', token });
}

// Restituisce l'utente a cui appartiene il token.
export function getCurrentUser(token) {
  return apiRequest('/auth/me', { token });
}

// Con il refresh token ottiene una sessione nuova,senza che l'utente debba rifare il login.
export function refreshSession(refreshToken) {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}
