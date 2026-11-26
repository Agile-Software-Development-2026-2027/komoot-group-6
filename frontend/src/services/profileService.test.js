import { expect, it, vi } from 'vitest';
import { LEADERBOARD_SIZE } from '../config/leaderboard.config.js';
import { getLeaderboard, getProfileVisibility, getPublicProfile, setProfileVisibility } from './profileService.js';

it('reads the public profile of a username, encoding it in the path', async () => {
  const authFetch = vi.fn().mockResolvedValue({ username: 'a/b' });

  expect(await getPublicProfile(authFetch, 'a/b')).toEqual({ username: 'a/b' });
  expect(authFetch).toHaveBeenCalledWith('/profile/users/a%2Fb');
});

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

it('reads the leaderboard with the size of the config', async () => {
  const entry = { rank: 1, username: 'elena_b' };
  const authFetch = vi.fn().mockResolvedValue({ leaderboard: [entry] });

  expect(await getLeaderboard(authFetch)).toEqual([entry]);
  expect(authFetch).toHaveBeenCalledWith(`/leaderboard?limit=${LEADERBOARD_SIZE}`);
});

it('treats a missing leaderboard as empty', async () => {
  expect(await getLeaderboard(vi.fn().mockResolvedValue(null))).toEqual([]);
});