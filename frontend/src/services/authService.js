import { apiRequest } from './api.js';

// Chiama POST /auth/register sul backend.
// I campi opzionali vengono inviati solo se compilati.
export function registerUser({ email, password, username, displayName }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email: email.trim(),
      // La password non viene ripulita dagli spazi.
      password,
      // Un campo vuoto diventa undefined, pertanto viene escluso dal JSON.
      username: username.trim() || undefined,
      displayName: displayName.trim() || undefined,
    },
  });
}