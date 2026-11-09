// Backend calls about the logged-in user's profile settings.
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
