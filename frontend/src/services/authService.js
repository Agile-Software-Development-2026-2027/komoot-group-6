import { apiRequest } from './api.js';

// Calls POST /auth/register on the backend.
// Optional fields are sent only when filled in.
export function registerUser({ email, password, username, displayName }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email: email.trim(),
      // The password is not trimmed: spaces can be part of it on purpose
      password,
      // An empty field becomes undefined, so it is left out of the JSON
      username: username.trim() || undefined,
      displayName: displayName.trim() || undefined,
    },
  });
}