import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';

import UserLocationControl from './UserLocationControl.jsx';

// FOR NOW there are 6 tests, if you add some update this comment
// 1 Renders the button in the bottom-right, with the options from before
// 2 Asks for the location immediately if the map is already loaded
// 3 Otherwise asks for it when the map finishes loading
// 4 With StrictMode it asks for the location only once
// 5 When it disappears it stops waiting for the load
// 6 Without a map it does nothing
// 
const mock = vi.hoisted(() => ({ map: null, control: null, props: null }));

// Mock of react-map-gl: useMap returns the fake map,
// GeolocateControl records its props and exposes a fake control through the ref
vi.mock('react-map-gl/maplibre', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    useMap: () => ({ current: mock.map && { getMap: () => mock.map } }),
    GeolocateControl: forwardRef(function FakeGeolocateControl(props, ref) {
      useImperativeHandle(ref, () => mock.control, []);
      mock.props = props;
      return null;
    }),
  };
});

// Creates a fake map with the functions needed by the tests.
function createFakeMap({ loaded }) {
  const map = {
    isLoaded: loaded,
    onLoad: null,
    loaded: () => map.isLoaded,
    once: vi.fn((type, handler) => { if (type === 'load') map.onLoad = handler; }),
    off: vi.fn((type, handler) => { if (type === 'load' && map.onLoad === handler) map.onLoad = null; }),
  };
  return map;
}

beforeEach(() => {
  mock.control = { trigger: vi.fn() };
});

afterEach(() => {
  cleanup();
  mock.map = null;
  mock.control = null;
  mock.props = null;
});

test('renders the button in the bottom-right, with the options from before', () => {
  mock.map = createFakeMap({ loaded: true });
  render(<UserLocationControl />);

  expect(mock.props).toMatchObject({
    position: 'bottom-right',
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserLocation: true,
  });
});

test('asks for the location immediately if the map is already loaded', () => {
  mock.map = createFakeMap({ loaded: true });
  render(<UserLocationControl />);

  expect(mock.control.trigger).toHaveBeenCalledTimes(1);
});

test('otherwise asks for it when the map finishes loading', () => {
  mock.map = createFakeMap({ loaded: false });
  render(<UserLocationControl />);
  expect(mock.control.trigger).not.toHaveBeenCalled();

  mock.map.onLoad();

  expect(mock.control.trigger).toHaveBeenCalledTimes(1);
});

test('with StrictMode it asks for the location only once', () => {
  mock.map = createFakeMap({ loaded: false });
  render(<StrictMode><UserLocationControl /></StrictMode>);

  // StrictMode runs the effect twice: the first load listener must be gone
  mock.map.onLoad();

  expect(mock.control.trigger).toHaveBeenCalledTimes(1);
});

test('when it disappears it stops waiting for the load', () => {
  mock.map = createFakeMap({ loaded: false });
  const { unmount } = render(<UserLocationControl />);

  unmount();

  expect(mock.map.onLoad).toBeNull();
  expect(mock.control.trigger).not.toHaveBeenCalled();
});

test('without a map it does nothing', () => {
  render(<UserLocationControl />);

  expect(mock.control.trigger).not.toHaveBeenCalled();
});