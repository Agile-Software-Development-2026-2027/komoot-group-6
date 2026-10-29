import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';

import UserLocationControl from './UserLocationControl.jsx';

//basically FOR NOW there are 5 tests, if you add some update this comment
// 1 Adds the button in the bottom-right, with the options from before
// 2 Asks for the location immediately if the map is already loaded
// 3 Otherwise asks for it when the map finishes loading
// 4 With StrictMode there is only one control, the new one, and the old one doesn't start
// 5 When it disappears it removes the button and stops waiting for the load
const mock = vi.hoisted(() => ({ map: null, controls: [] }));

// Mock di GeolocateControl: ricorda le opzioni e la funzione trigger.
vi.mock('maplibre-gl', () => ({
  GeolocateControl: class {
    constructor(options) {
      this.options = options;
      this.trigger = vi.fn();
      mock.controls.push(this);
    }
  },
}));

vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({ current: mock.map && { getMap: () => mock.map } }),
}));

// Crea una mappa finta con le funzioni necessarie per i test.
function createFakeMap({ loaded }) {
  const map = {
    isLoaded: loaded,
    onLoad: null,
    added: [],
    addControl: vi.fn((control, position) => map.added.push({ control, position })),
    removeControl: vi.fn((control) => { map.added = map.added.filter((a) => a.control !== control); }),
    loaded: () => map.isLoaded,
    once: vi.fn((type, handler) => { if (type === 'load') map.onLoad = handler; }),
    off: vi.fn((type, handler) => { if (type === 'load' && map.onLoad === handler) map.onLoad = null; }),
  };
  return map;
}

afterEach(() => {
  cleanup();
  mock.map = null;
  mock.controls = [];
});

test('adds the button in the bottom-right, with the options from before', () => {
  mock.map = createFakeMap({ loaded: true });
  render(<UserLocationControl />);

  expect(mock.map.added).toHaveLength(1);
  expect(mock.map.added[0].position).toBe('bottom-right');
  expect(mock.controls[0].options).toEqual({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserLocation: true,
  });
});

test('asks for the location immediately if the map is already loaded', () => {
  mock.map = createFakeMap({ loaded: true });
  render(<UserLocationControl />);

  expect(mock.controls[0].trigger).toHaveBeenCalledTimes(1);
});

test('otherwise asks for it when the map finishes loading', () => {
  mock.map = createFakeMap({ loaded: false });
  render(<UserLocationControl />);
  expect(mock.controls[0].trigger).not.toHaveBeenCalled();

  mock.map.onLoad();

  expect(mock.controls[0].trigger).toHaveBeenCalledTimes(1);
});

test('with StrictMode there is only one control, the new one, and the old one doesn\'t start', () => {
  mock.map = createFakeMap({ loaded: false });
  render(<StrictMode><UserLocationControl /></StrictMode>);

  // Simulate the map loading, which would normally trigger the old control if it were still there.
  expect(mock.controls).toHaveLength(2);
  expect(mock.map.added).toHaveLength(1);
  expect(mock.map.added[0].control).toBe(mock.controls[1]);

  mock.map.onLoad();
  expect(mock.controls[0].trigger).not.toHaveBeenCalled();
  expect(mock.controls[1].trigger).toHaveBeenCalledTimes(1);
});

test('when it disappears it removes the button and stops waiting for the load', () => {
  mock.map = createFakeMap({ loaded: false });
  const { unmount } = render(<UserLocationControl />);

  unmount();

  expect(mock.map.added).toHaveLength(0);
  expect(mock.map.onLoad).toBeNull();
});