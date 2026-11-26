import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PublicProfilePage from './PublicProfilePage.jsx';
import { ApiError } from '../services/api.js';
import { getPublicProfile } from '../services/profileService.js';
import { getTrail } from '../services/trailsService.js';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }) => <p>Redirected to {to}</p>,
  useParams: () => ({ username: 'alba_trek' }),
}));
// Same function at every render, as in the real AuthProvider
const authFetch = vi.fn();
vi.mock('../context/useAuth.js', () => ({ useAuth: () => ({ authFetch }) }));
vi.mock('../services/profileService.js', () => ({ getPublicProfile: vi.fn() }));
vi.mock('../services/trailsService.js', () => ({
  CAI_TO_DIFFICULTY: { T: 'easy', E: 'moderate', EE: 'hard', EEA: 'hard' },
  getTrail: vi.fn(),
}));

const profile = {
  username: 'alba_trek',
  displayName: 'Alba',
  bio: 'Weekend hiker',
  createdAt: '2026-01-05T10:00:00Z',
  isMine: false,
  totalPoints: 150,
  completedTrails: [
    { trailId: 'a', completedAt: '2026-03-01T10:00:00Z' },
    { trailId: 'b', completedAt: '2026-03-02T10:00:00Z' },
  ],
  level: { number: 2, name: 'Hiker', minPoints: 100, nextLevelPoints: 200, nextLevelName: 'Explorer', pointsToNext: 50 },
};

beforeEach(() => {
  getTrail.mockImplementation(async (id) => ({
    type: 'Feature',
    properties: { id, name: `Trail ${id}`, difficulty: 'E', lengthM: 5000, ascentM: 300 },
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const stat = (label) => screen.getByText(label).parentElement.querySelector('dd').textContent;

it('shows name, level, totals and completed trails of a public profile', async () => {
  getPublicProfile.mockResolvedValue(profile);

  render(<PublicProfilePage />);

  expect(await screen.findByRole('heading', { name: 'Alba' })).toBeTruthy();
  expect(screen.getByText('@alba_trek')).toBeTruthy();
  expect(screen.getByText('Weekend hiker')).toBeTruthy();
  expect(screen.getByText('Hiker')).toBeTruthy();
  expect(screen.getByText('50 points to Explorer')).toBeTruthy();
  expect(await screen.findByRole('link', { name: /Trail a/ })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Trail b/ })).toBeTruthy();
  expect(stat('Completed trails')).toBe('2');
  expect(stat('Total points')).toBe('150');
  expect(stat('Total distance')).toBe('10 km');
  expect(getPublicProfile.mock.calls[0][1]).toBe('alba_trek');
  expect(screen.getByRole('button', { name: 'Share profile' })).toBeTruthy();
});

it('shows a message for a private profile', async () => {
  getPublicProfile.mockRejectedValue(new ApiError('Profile is private', 403));

  render(<PublicProfilePage />);

  expect((await screen.findByRole('alert')).textContent).toBe('This profile is private');
});

it('shows a message for an unknown profile', async () => {
  getPublicProfile.mockRejectedValue(new ApiError('Profile not found', 404));

  render(<PublicProfilePage />);

  expect((await screen.findByRole('alert')).textContent).toBe('Profile not found');
});

it('offers to try again after a server error', async () => {
  getPublicProfile.mockRejectedValueOnce(new ApiError('Cannot reach the server.', 0));
  getPublicProfile.mockResolvedValueOnce(profile);

  render(<PublicProfilePage />);

  expect((await screen.findByRole('alert')).textContent).toContain('Could not load this profile.');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('heading', { name: 'Alba' })).toBeTruthy();
});

it('sends the user to their own profile page when the link is their own', async () => {
  getPublicProfile.mockResolvedValue({ ...profile, isMine: true });

  render(<PublicProfilePage />);

  expect(await screen.findByText('Redirected to /profile')).toBeTruthy();
});
