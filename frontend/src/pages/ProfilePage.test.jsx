import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProfilePage from './ProfilePage.jsx';
import { useAuth } from '../context/useAuth.js';
import { getProfileVisibility, setProfileVisibility } from '../services/profileService.js';
import { getCompletedTrails, getProfilePoints, getSavedTrails, getTrail } from '../services/trailsService.js';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useInRouterContext: () => false,
}));
vi.mock('../components/LogoutButton.jsx', () => ({ default: () => <button>Log out</button> }));
vi.mock('../context/useAuth.js', () => ({ useAuth: vi.fn() }));
vi.mock('../services/trailsService.js', () => ({
  CAI_TO_DIFFICULTY: { T: 'easy', E: 'moderate', EE: 'hard', EEA: 'hard' },
  getSavedTrails: vi.fn(),
  getCompletedTrails: vi.fn(),
  getTrail: vi.fn(),
  getProfilePoints: vi.fn(),
}));
vi.mock('../services/profileService.js', () => ({
  getProfileVisibility: vi.fn(),
  setProfileVisibility: vi.fn(),
}));

const fullUser = {
  email: 'mario@esempio.it',
  username: 'mario_rossi',
  displayName: 'Mario',
  birthDate: '1990-05-17',
  createdAt: '2026-01-15T10:00:00Z',
};

const feature = (id, name) => ({
  type: 'Feature',
  properties: { id, name, difficulty: 'E', lengthM: 5000, ascentM: 300 },
});

// The value (dd) of the row with this label
const valueOf = (label) => within(screen.getByText(label).closest('.profile-row')).getByRole('definition');

beforeEach(() => {
  useAuth.mockReturnValue({ user: fullUser, authFetch: vi.fn() });
  getSavedTrails.mockResolvedValue([]);
  getCompletedTrails.mockResolvedValue([]);
  getTrail.mockImplementation(async (id) => feature(id, `Trail ${id}`));
  getProfilePoints.mockResolvedValue({ totalPoints: 0, completedRoutes: 0 });
  // By default the profile is private and saving succeeds
  getProfileVisibility.mockResolvedValue(false);
  setProfileVisibility.mockImplementation(async (_authFetch, isPublic) => isPublic);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('shows every account field', async () => {
  render(<ProfilePage />);

  expect(valueOf('Email').textContent).toBe('mario@esempio.it');
  expect(valueOf('Username').textContent).toBe('mario_rossi');
  expect(valueOf('Display name').textContent).toBe('Mario');
  expect(valueOf('Date of birth').textContent).not.toBe('—');
  expect(valueOf('Member since').textContent).not.toBe('—');
  await screen.findByRole('tab', { name: 'Saved (0)' });
});

it('shows a dash for missing account data', async () => {
  useAuth.mockReturnValue({ user: { email: 'mario@esempio.it' }, authFetch: vi.fn() });

  render(<ProfilePage />);

  for (const label of ['Username', 'Display name', 'Member since']) {
    expect(valueOf(label).textContent).toBe('—');
  }
  // Without a birth date there is "Add", disabled until profile editing exists
  const add = within(screen.getByText('Date of birth').closest('.profile-row')).getByRole('button', { name: 'Add' });
  expect(add.disabled).toBe(true);
  await screen.findByRole('tab', { name: 'Saved (0)' });
});

it('shows dates as "6 Nov 2026"', async () => {
  useAuth.mockReturnValue({
    user: { ...fullUser, birthDate: '1990-05-17', createdAt: '2026-11-06T12:00:00Z' },
    authFetch: vi.fn(),
  });

  render(<ProfilePage />);

  expect(valueOf('Date of birth').textContent).toBe('17 May 1990');
  expect(valueOf('Member since').textContent).toBe('6 Nov 2026');
  await screen.findByRole('tab', { name: 'Saved (0)' });
});

it('shows the totals of the completed trails in the stat cards', async () => {
  getSavedTrails.mockResolvedValue([{ trail_id: 'a', created_at: '2026-02-01T10:00:00Z' }]);
  getCompletedTrails.mockResolvedValue([
    { trail_id: 'c', completed_at: '2026-03-01T10:00:00Z' },
    { trail_id: 'd', completed_at: '2026-03-02T10:00:00Z' },
  ]);
  // Each trail: 5 km and 300 m of ascent (see feature)

  render(<ProfilePage />);

  await screen.findByRole('tab', { name: 'Saved (1)' });
  const stat = (label) => screen.getByText(label).parentElement.querySelector('dd').textContent;
  expect(stat('Completed trails')).toBe('2');
  expect(stat('Total distance')).toBe('10 km');
  expect(stat('Total ascent')).toBe('↑ 600 m');
  expect(stat('Saved trails')).toBe('1');
});

it('shows the difficulty as a badge on each trail row', async () => {
  getSavedTrails.mockResolvedValue([{ trail_id: 'a', created_at: '2026-02-01T10:00:00Z' }]);

  render(<ProfilePage />);

  const row = (await screen.findByRole('link', { name: /Trail a/ }));
  expect(within(row).getByText('Intermediate').className).toContain('trail-badge--moderate');
});

it('lists saved and completed trails in two tabs, with counts', async () => {
  getSavedTrails.mockResolvedValue([
    { trail_id: 'a', created_at: '2026-02-01T10:00:00Z' },
    { trail_id: 'b', created_at: '2026-02-02T10:00:00Z' },
  ]);
  getCompletedTrails.mockResolvedValue([{ trail_id: 'c', completed_at: '2026-03-01T10:00:00Z' }]);

  render(<ProfilePage />);

  await screen.findByRole('tab', { name: 'Saved (2)' });
  expect(screen.getByRole('tab', { name: 'Completed (1)' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Trail a/ }).getAttribute('href')).toBe('/trails/a');
  expect(screen.getByText(/Trail b/)).toBeTruthy();
  expect(screen.queryByText(/Trail c/)).toBeNull();

  fireEvent.click(screen.getByRole('tab', { name: 'Completed (1)' }));
  expect(screen.getByText(/Trail c/)).toBeTruthy();
  expect(screen.queryByText(/Trail a/)).toBeNull();
});

it('shows an empty message when there are no trails', async () => {
  render(<ProfilePage />);

  expect(await screen.findByText("You haven't saved any trails yet.")).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Explore trails' }).getAttribute('href')).toBe('/');
  fireEvent.click(screen.getByRole('tab', { name: 'Completed (0)' }));
  expect(screen.getByText("You haven't completed any trails yet.")).toBeTruthy();
});

it('skips a trail whose details cannot be loaded', async () => {
  getSavedTrails.mockResolvedValue([
    { trail_id: 'a', created_at: '2026-02-01T10:00:00Z' },
    { trail_id: 'gone', created_at: '2026-02-02T10:00:00Z' },
  ]);
  getTrail.mockImplementation(async (id) => {
    if (id === 'gone') throw new Error('not found');
    return feature(id, `Trail ${id}`);
  });

  render(<ProfilePage />);

  await screen.findByRole('tab', { name: 'Saved (1)' });
  expect(screen.getByText(/Trail a/)).toBeTruthy();
});

it('shows an error when the lists cannot be loaded', async () => {
  getSavedTrails.mockRejectedValue(new Error('offline'));

  render(<ProfilePage />);

  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not load your trails.'));
});

it('draws the route of the most recently completed trail at the top', async () => {
  getCompletedTrails.mockResolvedValue([
    { trail_id: 'new', completed_at: '2026-03-02T10:00:00Z' },
    { trail_id: 'old', completed_at: '2026-03-01T10:00:00Z' },
  ]);
  getTrail.mockImplementation(async (id) => ({
    ...feature(id, `Trail ${id}`),
    geometry: { type: 'LineString', coordinates: [[16, 39], [16.01, 39.01], [16.02, 39.01]] },
  }));

  render(<ProfilePage />);

  fireEvent.click(await screen.findByRole('tab', { name: 'Last route' }));

  expect(await screen.findByRole('img', { name: 'Route of Trail new' })).toBeTruthy();
  expect(screen.queryByRole('img', { name: 'Route of Trail old' })).toBeNull();
  expect(screen.getAllByRole('link', { name: 'Trail new' })[0].getAttribute('href')).toBe('/trails/new');
});

it('invites the user to complete a trail when there is no route to draw', async () => {
  render(<ProfilePage />);

  fireEvent.click(await screen.findByRole('tab', { name: 'Last route' }));

  expect(screen.getByText('Complete a trail and its route will appear here.')).toBeTruthy();
});

it('has the back-to-home link at the top', async () => {
  render(<ProfilePage />);

  expect(screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')).toBe('/');
  await screen.findByRole('tab', { name: 'Saved (0)' });
});

it('lets the user retry when the lists cannot be loaded', async () => {
  getSavedTrails.mockRejectedValueOnce(new Error('offline'));

  render(<ProfilePage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

  await screen.findByRole('tab', { name: 'Saved (0)' });
  expect(getSavedTrails).toHaveBeenCalledTimes(2);
});

// The visibility switch, which becomes enabled once the value has arrived from the backend
const visibilitySwitch = () => screen.getByRole('switch', { name: 'Public profile' });

it('shows the profile as private by default, with the switch ready once loaded', async () => {
  render(<ProfilePage />);

  await waitFor(() => expect(visibilitySwitch().disabled).toBe(false));
  expect(visibilitySwitch().getAttribute('aria-checked')).toBe('false');
  expect(screen.getByText('Private: only your basic info is visible to others.')).toBeTruthy();
});

it('reads the saved visibility from the backend', async () => {
  getProfileVisibility.mockResolvedValue(true);

  render(<ProfilePage />);

  await waitFor(() => expect(visibilitySwitch().getAttribute('aria-checked')).toBe('true'));
  expect(screen.getByText('Public: others can see your basic info and your activity.')).toBeTruthy();
});

it('keeps the switch disabled while the visibility is loading', async () => {
  getProfileVisibility.mockReturnValue(new Promise(() => {}));

  render(<ProfilePage />);

  expect(visibilitySwitch().disabled).toBe(true);
});

it('saves the new visibility when the switch is clicked', async () => {
  render(<ProfilePage />);
  await waitFor(() => expect(visibilitySwitch().disabled).toBe(false));

  fireEvent.click(visibilitySwitch());

  await waitFor(() => expect(visibilitySwitch().getAttribute('aria-checked')).toBe('true'));
  expect(setProfileVisibility).toHaveBeenCalledWith(expect.anything(), true);
});

it('goes back to the previous value and shows an error when saving fails', async () => {
  setProfileVisibility.mockRejectedValue(new Error('offline'));

  render(<ProfilePage />);
  await waitFor(() => expect(visibilitySwitch().disabled).toBe(false));

  fireEvent.click(visibilitySwitch());

  expect((await screen.findByRole('alert')).textContent).toContain('Could not update visibility');
  expect(visibilitySwitch().getAttribute('aria-checked')).toBe('false');
});

it('shows the hike score (total points) under the account card', async () => {
  getProfilePoints.mockResolvedValue({ totalPoints: 120, completedRoutes: 3 });

  render(<ProfilePage />);

  expect(await screen.findByText('120')).toBeTruthy();
  expect(screen.getByText('Hiking Progress')).toBeTruthy();
});
