import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ApiError } from '../../services/api.js';
import NearbyPanel from './NearbyPanel.jsx';

// Tests in this file:
// 1 Searches around the map center with the initial radius and shows the cards
// 2 The slider repeats the search only once, when it stops moving
// 3 When the map moves it searches around the new center (but not for a few meters)
// 4 The difficulty filter (multiple choice) works on the results, without new requests
// 5 If the search fails it shows the error and "Try again" repeats it
// 6 The bookmark saves the trail to the profile
// 7 The arrow hides and shows the list, but the number of trails remains visible
// 8 Clicking a trail the map flies there, the marker appears and the list does not change
// 9 If the first GPS position arrives after the click, the map goes back to the trail (only once)
// 10 With closed panel, the search still works and the number of trails is shown
// 11 With a logged-in user, trails already saved in the profile have a filled bookmark
// 12 Clicking the filled bookmark removes the trail from the saved ones

const mock = vi.hoisted(() => ({ map: null, authFetch: null, user: null }));

vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({ current: { getMap: () => mock.map } }),
  // The fake marker shows where it was placed
  Marker: ({ longitude, latitude, children }) => (
    <div data-testid="trail-marker" data-lng={longitude} data-lat={latitude}>{children}</div>
  ),
}));

vi.mock('../../context/useAuth.js', () => ({
  useAuth: () => ({ authFetch: mock.authFetch, user: mock.user }),
}));

const TRAILS = [
  { id: 't1', name: 'Sentiero del Crati', difficulty: 'easy', lengthM: 8400, elevationGainM: 320, distanceM: 850, start: [16.24, 39.37] },
  { id: 't2', name: 'Monte Cocuzzo', difficulty: 'hard', lengthM: 14200, elevationGainM: 1150, distanceM: 6300, start: [16.3, 39.4] },
];

// How the backend answers: a FeatureCollection, with the difficulty in the CAI scale
const CAI = { easy: 'T', moderate: 'E', hard: 'EE' };
function nearbyResponse(trails) {
  return {
    type: 'FeatureCollection',
    features: trails.map(({ start, difficulty, elevationGainM, ...props }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: start },
      properties: { ...props, difficulty: CAI[difficulty], ascentM: elevationGainM },
    })),
  };
}


function createFakeMap(center) {
  const handlers = {};
  const map = {
    center,
    zoom: 10,
    getCenter: () => map.center,
    getZoom: () => map.zoom,
    on: (type, handler) => { handlers[type] = handler; },
    off: (type, handler) => { if (handlers[type] === handler) delete handlers[type]; },
    moveTo: (next) => {
      map.center = next;
      handlers.moveend?.({});
    },
    // Like moveTo, but the GPS moves the map (MapLibre signals it with geolocateSource)
    gpsMoveTo: (next) => {
      map.center = next;
      handlers.moveend?.({ geolocateSource: true });
    },
    jumpTo: vi.fn((options, eventData) => handlers.moveend?.({ ...eventData })),
    flyTo: vi.fn((options, eventData) => {
      map.center = { lng: options.center[0], lat: options.center[1] };
      handlers.moveend?.({ ...eventData });
    }),
  };
  return map;
}

// Lets the wait before the search pass and lets the response arrive
async function waitForSearch() {
  await act(() => vi.advanceTimersByTimeAsync(1000));
}

beforeEach(() => {
  vi.useFakeTimers();
  mock.map = createFakeMap({ lng: 16.2281, lat: 39.3562 });
  mock.authFetch = vi.fn().mockResolvedValue(nearbyResponse(TRAILS));
  // By default no user: saved and completed trails are not loaded
  mock.user = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('searches around the map center with the default radius and shows the cards', async () => {
  render(<NearbyPanel />);
  expect(screen.getByRole('status')).toHaveTextContent('Searching for trails...');
  expect(screen.queryAllByRole('article')).toHaveLength(0);

  await waitForSearch();

  // Center rounded to 3 decimals, initial radius of 25 km in meters
  expect(mock.authFetch).toHaveBeenCalledTimes(1);
  expect(mock.authFetch).toHaveBeenCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=25000');
  expect(screen.getByRole('status')).toHaveTextContent('2 trails within 25 km of the map center');

  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByRole('heading', { name: 'Sentiero del Crati' })).toBeInTheDocument();
  expect(cards[0]).toHaveTextContent('850 m away');
  expect(cards[0]).toHaveTextContent('Easy');
  expect(cards[0]).toHaveTextContent('2:38 h');
  expect(cards[1]).toHaveTextContent('14.2 km');
  expect(cards[1]).toHaveTextContent('1150 m');
});

test('the radius slider searches again only once, after it stops moving', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  const slider = screen.getByRole('slider', { name: 'Search radius' });
  fireEvent.change(slider, { target: { value: '30' } });
  fireEvent.change(slider, { target: { value: '35' } });
  expect(screen.getByText('35 km')).toBeInTheDocument();

  await waitForSearch();

  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(mock.authFetch).toHaveBeenLastCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=35000');
  expect(screen.getByRole('status')).toHaveTextContent('within 35 km');
});

test('searches around the new center when the map moves (but not for a few meters)', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  // A few meters: after rounding the center is the same
  act(() => mock.map.moveTo({ lng: 16.22812, lat: 39.35618 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);

  act(() => mock.map.moveTo({ lng: 16.5, lat: 39.4 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(mock.authFetch).toHaveBeenLastCalledWith('/trails/nearby?lat=39.4&lng=16.5&radius=25000');
});

test('the multi-select difficulty filter works on the results without new requests', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Difficult' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Monte Cocuzzo' })).toBeInTheDocument();

  // Difficulties add up
  fireEvent.click(screen.getByRole('checkbox', { name: 'Easy' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);

  // Only Intermediate: no trails
  fireEvent.click(screen.getByRole('checkbox', { name: 'Difficult' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Easy' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Intermediate' }));
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  expect(screen.getByRole('status')).toHaveTextContent('No trails with the selected difficulty within 25 km');

  // None selected = all
  fireEvent.click(screen.getByRole('checkbox', { name: 'Intermediate' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);

  expect(mock.authFetch).toHaveBeenCalledTimes(1);
});

test('shows the error when the search fails and "Try again" repeats it', async () => {
  mock.authFetch.mockRejectedValueOnce(new ApiError('Cannot reach the server. Please try again later.', 0));
  render(<NearbyPanel />);
  await waitForSearch();

  expect(screen.getByRole('status')).toHaveTextContent('Cannot reach the server. Please try again later.');
  expect(screen.queryAllByRole('article')).toHaveLength(0);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitForSearch();

  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
});

test('the bookmark saves the trail to the profile', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  mock.authFetch.mockResolvedValueOnce({ trailId: 't1' });
  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(mock.authFetch).toHaveBeenLastCalledWith('/profile/saved-trails', {
    method: 'POST',
    body: { trailId: 't1' },
  });
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByText('Trail saved')).toBeInTheDocument();
});

test('with a logged-in user, trails already saved in the profile show the full bookmark', async () => {
  mock.user = { id: 'u1' };
  // The fake backend answers based on the path
  mock.authFetch = vi.fn((path) => {
    if (path === '/profile/saved-trails') return Promise.resolve([{ trail_id: 't2', created_at: '2026-11-06T10:00:00Z' }]);
    if (path === '/profile/completed-trails') return Promise.resolve([]);
    return Promise.resolve(nearbyResponse(TRAILS));
  });

  render(<NearbyPanel />);
  await waitForSearch();

  expect(mock.authFetch).toHaveBeenCalledWith('/profile/saved-trails');
  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Saved Monte Cocuzzo' })).toBeInTheDocument();
});

test('clicking the full bookmark removes the trail from the saved ones', async () => {
  mock.user = { id: 'u1' };
  // The fake backend answers based on the path
  mock.authFetch = vi.fn((path) => {
    if (path === '/profile/saved-trails') return Promise.resolve([{ trail_id: 't2', created_at: '2026-11-06T10:00:00Z' }]);
    if (path === '/profile/completed-trails') return Promise.resolve([]);
    if (path === '/profile/saved-trails/t2') return Promise.resolve(null);
    return Promise.resolve(nearbyResponse(TRAILS));
  });

  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('button', { name: 'Saved Monte Cocuzzo' }));
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(mock.authFetch).toHaveBeenLastCalledWith('/profile/saved-trails/t2', { method: 'DELETE' });
  expect(screen.getByRole('button', { name: 'Save Monte Cocuzzo' })).toBeInTheDocument();
  expect(screen.getByText('Trail removed from saved')).toBeInTheDocument();
});

test('the close button calls onClose', async () => {
  const onClose = vi.fn();
  render(<NearbyPanel isOpen onClose={onClose} />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('button', { name: 'Close trail list' }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('when closed it shows nothing and does not search', async () => {
  render(<NearbyPanel isOpen={false} />);
  await waitForSearch();

  expect(screen.queryByRole('heading', { name: 'Trails nearby' })).not.toBeInTheDocument();
  expect(mock.authFetch).not.toHaveBeenCalled();
});

test('clicking a trail flies the map there, shows the pin and keeps the list', async () => {
  render(<NearbyPanel />);
  await waitForSearch();
  expect(screen.queryByTestId('trail-marker')).not.toBeInTheDocument();
  // The map is zoomed in a lot 
  mock.map.zoom = 16;

  fireEvent.click(screen.getByRole('button', { name: 'Monte Cocuzzo' }));

  // First it stops any GPS tracking, then it flies to the starting point
  expect(mock.map.jumpTo).toHaveBeenCalledWith({}, expect.anything());
  expect(mock.map.flyTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [16.3, 39.4], zoom: 13 }),
    expect.anything()
  );
  expect(mock.map.jumpTo.mock.invocationCallOrder[0]).toBeLessThan(mock.map.flyTo.mock.invocationCallOrder[0]);

  const marker = screen.getByTestId('trail-marker');
  expect(marker).toHaveAttribute('data-lng', '16.3');
  expect(marker).toHaveAttribute('data-lat', '39.4');
  expect(screen.getByRole('button', { name: 'Monte Cocuzzo' })).toHaveAttribute('aria-current', 'true');

  // The flight made by the panel does not repeat the search: the list stays the same
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole('article')).toHaveLength(2);

  // If the user then moves the map, the search restarts from the new center
  act(() => mock.map.moveTo({ lng: 16.5, lat: 39.5 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
});

test('if the first GPS fix arrives after the click, the map goes back to the trail (only once)', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('button', { name: 'Monte Cocuzzo' }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(1);

  // The GPS finds the user and moves the map to them: the map goes back to the trail, the list does not change
  act(() => mock.map.gpsMoveTo({ lng: 16.2, lat: 39.3 }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(2);
  expect(mock.map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [16.3, 39.4] }), expect.anything());
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);

  // Another GPS movement (for example the user presses the location button) counts normally
  act(() => mock.map.gpsMoveTo({ lng: 16.2, lat: 39.3 }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(2);
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
});
