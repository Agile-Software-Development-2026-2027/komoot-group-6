import { apiRequest } from './api.js';

export function registerUser({ email, password, username, displayName, birthDate }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      email: email.trim(),
      password,
      username: username.trim(),
      displayName: displayName.trim() || undefined,
      birthDate,
    },
  });
}