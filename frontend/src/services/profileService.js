import { LEADERBOARD_SIZE } from '../config/leaderboard.config.js';

// Backend calls for profile settings, public profile search and the leaderboard.
// As in trailsService.js, authFetch comes from useAuth(): it adds the token and renews it if it has expired.

// true if the profile is public, false if it is private (the initial value is private).
export async function getProfileVisibility(authFetch) {
  const data = await authFetch('/profile/visibility');
  return Boolean(data?.isPublic);
}

// Makes the profile public (true) or private (false). Returns the saved value.
export async function setProfileVisibility(authFetch, isPublic) {
  const data = await authFetch('/profile/visibility', { method: 'PUT', body: { isPublic } });
  return Boolean(data?.isPublic);
}

export function searchPublicProfiles(authFetch, username, after = null) {
  const query = new URLSearchParams({ q: username });
  if (after !== null) query.set('after', after);
  return authFetch(`/profile/search?${query}`);
}

// Public page of a profile, found by username. Answers { username, displayName, bio, createdAt, isMine,
// totalPoints, completedTrails: [{ trailId, completedAt }], level }. Throws ApiError: 404 = no such
// profile, 403 = the profile is private.
export function getPublicProfile(authFetch, username) {
  return authFetch(`/profile/users/${encodeURIComponent(username)}`);
}

// Global leaderboard: the public profiles with the most points, first place first.
// Each entry: { rank, username, displayName, level, totalPoints, completedTrails, isMine }.
export async function getLeaderboard(authFetch, limit = LEADERBOARD_SIZE) {
  const data = await authFetch(`/leaderboard?limit=${limit}`);
  return data?.leaderboard ?? [];
}