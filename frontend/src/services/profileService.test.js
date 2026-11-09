import { expect, it, vi } from 'vitest';
import { getProfileVisibility, setProfileVisibility } from './profileService.js';

it('reads the visibility of the profile', async () => {
  const authFetch = vi.fn().mockResolvedValue({ isPublic: true });

  expect(await getProfileVisibility(authFetch)).toBe(true);
  expect(authFetch).toHaveBeenCalledWith('/profile/visibility');
});

it('treats a missing answer as private', async () => {
  expect(await getProfileVisibility(vi.fn().mockResolvedValue(null))).toBe(false);
});

it('sends the new visibility with PUT and returns the saved value', async () => {
  const authFetch = vi.fn().mockResolvedValue({ isPublic: false });

  expect(await setProfileVisibility(authFetch, false)).toBe(false);
  expect(authFetch).toHaveBeenCalledWith('/profile/visibility', { method: 'PUT', body: { isPublic: false } });
});
