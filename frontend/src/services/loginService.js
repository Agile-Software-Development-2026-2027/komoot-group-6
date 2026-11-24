import { apiRequest } from './api.js';


// As in sign-up, spaces are trimmed from the email but not from the password.
// rememberMe: true if the user checked "Remember me" (stays logged in).
export function loginUser({ email, password, rememberMe = false }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password, rememberMe },
  });
}

// The backend revokes the token on Supabase.
export function logoutUser(token) {
  return apiRequest('/auth/logout', { method: 'POST', token });
}

// Returns the user the token belongs to.
export function getCurrentUser(token) {
  return apiRequest('/auth/me', { token });
}

// Uses the refresh token to get a new session, without the user having to log in again.
export function refreshSession(refreshToken) {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}

// Password recovery, step 1: asks the backend to email the link to reset the password.
// The backend always answers the same way, even if the email is not registered.
export function requestPasswordReset(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
  });
}

// Password recovery, step 2: sends the new password together with the access_token taken from the email link.
export function resetPassword({ accessToken, password }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { access_token: accessToken, password },
  });
}
