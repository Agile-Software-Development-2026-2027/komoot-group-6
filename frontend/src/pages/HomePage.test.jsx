import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomePage from './HomePage.jsx';
import { getTrail, getTrailsInBounds } from '../services/trailsService.js';

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
vi.mock('../components/NearbyPanel/NearbyPanel.jsx', () => ({ default: () => null }));
vi.mock('../components/SideMenu.jsx', () => ({ default: () => null }));
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
  await waitFor(() => expect(getTrail).toHaveBeenLastCalledWith('1'));
  expect(screen.queryByTestId('hover-marker')).toBeNull();

  fireEvent.click(await screen.findByRole('button', { name: 'Hover profile' }));
  marker = screen.getByTestId('hover-marker');
  expect(Number(marker.dataset.longitude)).toBe(routes[1].geometry.coordinates[1][0]);
  fireEvent.click(screen.getByRole('button', { name: 'Close selected trail' }));
  expect(screen.queryByTestId('hover-marker')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Hover profile' })).toBeNull();
});
