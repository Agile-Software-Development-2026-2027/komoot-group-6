import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import LeaderboardDialog from './LeaderboardDialog.jsx';
import { getLeaderboard } from '../../services/profileService.js';

// jsdom does not implement the native modal methods.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}

// The same authFetch at every render, as in the real AuthProvider
const authFetch = vi.fn();
vi.mock('../../context/useAuth.js', () => ({ useAuth: () => ({ authFetch }) }));
vi.mock('../../services/profileService.js', () => ({ getLeaderboard: vi.fn() }));

const ELENA = {
  rank: 1,
  username: 'elena_b',
  displayName: 'Elena',
  level: 5,
  totalPoints: 450,
  completedTrails: 8,
  isMine: false,
};
const LUCA = {
  rank: 2,
  username: 'luca_v',
  displayName: null,
  level: 1,
  totalPoints: 35,
  completedTrails: 1,
  isMine: true,
};

function rows() {
  return within(screen.getByRole('list', { name: 'Leaderboard' })).getAllByRole('listitem');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('shows rank, name, level, points and trails of each public profile', async () => {
  getLeaderboard.mockResolvedValue([ELENA, LUCA]);

  render(<LeaderboardDialog onClose={() => {}} />);

  await screen.findByRole('list', { name: 'Leaderboard' });
  const [first, second] = rows();
  expect(first.textContent).toContain('Rank 1');
  expect(within(first).getByText('Elena')).toBeTruthy();
  expect(within(first).getByText('@elena_b · Level 5')).toBeTruthy();
  expect(within(first).getByText('450')).toBeTruthy();
  expect(within(first).getByText('8 trails')).toBeTruthy();
  expect(within(first).queryByText('You')).toBeNull();
  // Without a display name the username is shown, and "trail" is singular
  expect(within(second).getByText('luca_v')).toBeTruthy();
  expect(within(second).getByText('1 trail')).toBeTruthy();
  expect(within(second).getByText('You')).toBeTruthy();
  expect(getLeaderboard).toHaveBeenCalledWith(authFetch);
});

it('explains that only public profiles are ranked when the user is not in the list', async () => {
  getLeaderboard.mockResolvedValue([ELENA]);

  render(<LeaderboardDialog onClose={() => {}} />);

  expect(await screen.findByText(/only public profiles are ranked/)).toBeTruthy();
});

it('does not show the explanation when the user is in the list', async () => {
  getLeaderboard.mockResolvedValue([ELENA, LUCA]);

  render(<LeaderboardDialog onClose={() => {}} />);

  await screen.findByRole('list', { name: 'Leaderboard' });
  expect(screen.queryByText(/only public profiles are ranked/)).toBeNull();
});

it('shows a message when there are no public profiles', async () => {
  getLeaderboard.mockResolvedValue([]);

  render(<LeaderboardDialog onClose={() => {}} />);

  expect(await screen.findByText('No public profiles yet.')).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Leaderboard' })).toBeNull();
});

it('shows an error and loads the leaderboard again with Try again', async () => {
  getLeaderboard.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce([ELENA]);

  render(<LeaderboardDialog onClose={() => {}} />);

  expect((await screen.findByRole('alert')).textContent).toContain('Could not load the leaderboard');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Elena')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(getLeaderboard).toHaveBeenCalledTimes(2);
});

it('closes with the close button', async () => {
  getLeaderboard.mockResolvedValue([ELENA]);
  const onClose = vi.fn();

  render(<LeaderboardDialog onClose={onClose} />);
  await screen.findByText('Elena');
  fireEvent.click(screen.getByRole('button', { name: 'Close leaderboard' }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

it('closes with Escape', async () => {
  getLeaderboard.mockResolvedValue([ELENA]);
  const onClose = vi.fn();

  render(<LeaderboardDialog onClose={onClose} />);
  await screen.findByText('Elena');
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Leaderboard' }), { key: 'Escape' });

  expect(onClose).toHaveBeenCalledTimes(1);
});