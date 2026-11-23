import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HomePage from './HomePage.jsx';
import { LEADERBOARD_SIZE } from '../config/leaderboard.config.js';
import { getTrail, getTrailsInBounds } from '../services/trailsService.js';

// jsdom does not implement the native modal methods.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
}

const map = vi.hoisted(() => ({
  onSelect: null,
  instance: {
    getBounds: () => ({ toArray: () => [[16, 39], [17, 40]] }),
    on: vi.fn(), off: vi.fn(),
    once: (_event, callback) => callback(),
    fitBounds: vi.fn(),
  },
}));

vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({ current: map.instance }),
  Marker: ({ longitude, latitude, anchor }) => (
    <div data-testid="hover-marker" data-longitude={longitude} data-latitude={latitude} data-anchor={anchor} />
  ),
}));
vi.mock('../map/useLayerEvents.js', () => ({
  useLayerEvents: (_layer, events) => { map.onSelect = events.onClick; },
}));
vi.mock('../components/MapView/MapView.jsx', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/MapView/TrackLayer.jsx', () => ({ default: () => null }));
vi.mock('../components/MapView/TrailStartsLayer.jsx', () => ({
  default: ({ data }) => data?.features.map((feature) => (
    <button key={feature.id} onClick={() => map.onSelect(feature)}>{feature.properties.name}</button>
  )),
}));
vi.mock('../components/MapView/TrackPopup.jsx', () => ({
  default: ({ trail, onClose }) => trail ? <button onClick={onClose}>Close selected trail</button> : null,
}));
const nearbyTrail = { id: 'nearby-private', name: 'Nearby private trail', start: [18, 39] };
vi.mock('../components/NearbyPanel/NearbyPanel.jsx', () => ({
  default: ({ isOpen, onSelectTrail }) => isOpen && (
    <button onClick={() => onSelectTrail(nearbyTrail)}>{nearbyTrail.name}</button>
  ),
}));
const authFetch = vi.fn();
vi.mock('../context/useAuth.js', () => ({ useAuth: () => ({ user: { username: 'mario.rossi' }, authFetch }) }));
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('../components/ElevationChart/ElevationChart.jsx', () => ({
  default: ({ data, onHover }) => (
    <button onClick={() => onHover(data[1])} onMouseLeave={() => onHover(null)}>Hover profile</button>
  ),
}));
vi.mock('../services/trailsService.js', () => ({ getTrail: vi.fn(), getTrailsInBounds: vi.fn() }));

const routes = ['First trail', 'Second trail'].map((name, i) => ({
  type: 'Feature', id: String(i), properties: { id: String(i), name },
  geometry: { type: 'LineString', coordinates: [[16 + i * 0.1, 39, 100], [16.01 + i * 0.1, 39.01, 120]] },
}));

beforeEach(() => {
  getTrailsInBounds.mockResolvedValue({
    type: 'FeatureCollection',
    features: routes.map((route) => ({ ...route, geometry: { type: 'Point', coordinates: route.geometry.coordinates[0].slice(0, 2) } })),
  });
  getTrail.mockImplementation(async (id) => routes.find((route) => route.id === id));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('places the marker at the hovered route coordinate and clears it on leave, route change and close', async () => {
  render(<HomePage />);
  fireEvent.click(await screen.findByRole('button', { name: 'First trail' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Hover profile' }));
  let marker = screen.getByTestId('hover-marker');
  expect(Number(marker.dataset.longitude)).toBe(routes[0].geometry.coordinates[1][0]);
  expect(Number(marker.dataset.latitude)).toBe(routes[0].geometry.coordinates[1][1]);
  expect(marker.dataset.anchor).toBe('center');

  fireEvent.mouseLeave(screen.getByRole('button', { name: 'Hover profile' }));
  expect(screen.queryByTestId('hover-marker')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hover profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Second trail' }));
  await waitFor(() => expect(getTrail).toHaveBeenLastCalledWith('1', authFetch, { includeCover: true }));
  expect(screen.queryByTestId('hover-marker')).toBeNull();

  fireEvent.click(await screen.findByRole('button', { name: 'Hover profile' }));
  marker = screen.getByTestId('hover-marker');
  expect(Number(marker.dataset.longitude)).toBe(routes[1].geometry.coordinates[1][0]);
  fireEvent.click(screen.getByRole('button', { name: 'Close selected trail' }));
  expect(screen.queryByTestId('hover-marker')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Hover profile' })).toBeNull();
});

it('loads and frames a nearby private trail outside the current map bounds', async () => {
  getTrail.mockResolvedValueOnce({
    type: 'Feature',
    id: nearbyTrail.id,
    properties: { id: nearbyTrail.id, name: nearbyTrail.name, hasLocalCover: true },
    geometry: { type: 'LineString', coordinates: [[18, 39, 100], [18.01, 39.01, 120]] },
  });

  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Trails nearby' }));
  fireEvent.click(screen.getByRole('button', { name: nearbyTrail.name }));
  await screen.findByRole('button', { name: 'Close selected trail' });

  expect(getTrail).toHaveBeenCalledWith(nearbyTrail.id, authFetch, { includeCover: true });
  expect(map.instance.fitBounds).toHaveBeenCalledWith(
    [[18, 39], [18.01, 39.01]], expect.any(Object), { fromNearbyPanel: true }
  );
});

it('shows the profile icon in the top-right, linking to the profile page', () => {
  render(<HomePage />);
  expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
});

it('waits for a username and shows the current public profiles', async () => {
  let finishOlderSearch;
  authFetch
    .mockImplementationOnce(() => new Promise((resolve) => { finishOlderSearch = resolve; }))
    .mockResolvedValueOnce({
      profiles: [{ username: 'alba_trek', displayName: 'Alba', level: 2, bio: 'Weekend hiker', isMine: true, totalPoints: 205 }],
      nextCursor: 'alba_trek',
    })
    .mockResolvedValueOnce({
      profiles: [{ username: 'alba_walker', displayName: null, level: 0, bio: null, isMine: false, totalPoints: null }],
      nextCursor: null,
    });
  render(<HomePage />);

  const trigger = screen.getByRole('button', { name: 'Find public profiles' });
  fireEvent.click(trigger);
  const input = screen.getByRole('searchbox', { name: 'Search by username' });
  expect(document.activeElement).toBe(input);
  expect(screen.queryByRole('list', { name: 'Public profiles' })).toBeNull();
  expect(authFetch).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: 'older' } });
  await waitFor(() => expect(authFetch).toHaveBeenCalledWith('/profile/search?q=older'));
  fireEvent.change(input, { target: { value: ' Alba ' } });
  const result = await screen.findByText('@alba_trek');
  expect(within(result.closest('li')).getByText('You')).toBeTruthy();
  const details = result.closest('details');
  fireEvent.click(result.closest('summary'));
  expect(details.open).toBe(true);
  expect(screen.getByText('Weekend hiker')).toBeTruthy();
  expect(within(result.closest('li')).getByText('Points earned')).toBeTruthy();
  expect(within(result.closest('li')).getByText('205')).toBeTruthy();

  await act(async () => finishOlderSearch({ profiles: [], nextCursor: null }));
  expect(screen.getByText('@alba_trek')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  const otherResult = await screen.findByText('@alba_walker');
  expect(within(otherResult.closest('li')).queryByText('You')).toBeNull();
  expect(within(otherResult.closest('li')).queryByText('Points earned')).toBeNull();
  expect(screen.getByText('@alba_trek')).toBeTruthy();
  expect(authFetch).toHaveBeenLastCalledWith('/profile/search?q=Alba&after=alba_trek');

  fireEvent.change(input, { target: { value: ' ' } });
  expect(screen.queryByRole('list', { name: 'Public profiles' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('opens the leaderboard from the toolbar and closes it', async () => {
  authFetch.mockResolvedValueOnce({
    leaderboard: [
      { rank: 1, username: 'elena_b', displayName: 'Elena', level: 5, totalPoints: 450, completedTrails: 8, isMine: false },
      { rank: 2, username: 'mario.rossi', displayName: null, level: 2, totalPoints: 130, completedTrails: 2, isMine: true },
    ],
  });
  render(<HomePage />);

  const trigger = screen.getByRole('button', { name: 'Leaderboard' });
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');

  const list = await screen.findByRole('list', { name: 'Leaderboard' });
  const [first, second] = within(list).getAllByRole('listitem');
  expect(within(first).getByText('Elena')).toBeTruthy();
  expect(within(second).getByText('You')).toBeTruthy();
  expect(authFetch).toHaveBeenCalledWith(`/leaderboard?limit=${LEADERBOARD_SIZE}`);

  fireEvent.click(screen.getByRole('button', { name: 'Close leaderboard' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
