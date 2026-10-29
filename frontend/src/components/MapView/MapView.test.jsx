import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import MapView from './MapView.jsx';

//basically FOR NOW there are 7 tests, if you add some update this comment
// 1 Show the map container
// 2 Use the first base map, or the requested one
// 3 Hide the layers indicated in HIDDEN_BASE_LAYERS
// 4 Show the location button inside the map (its behavior is tested in UserLocationControl.test.jsx)
// 5 The re-center button brings the map back to the initial view
// 6 Before re-centering, stop following the user's location
// 7 Shows the children inside the map

vi.mock('../../config/map.config.js', () => ({
  MAPTILER_API_KEY: 'test-key',
  DEFAULT_MAP_SETTINGS: { center: [16.25, 39.35], zoom: 12, pitch: 0, maxPitch: 0 },
  MAP_BASE_STYLES: [
    { id: 'outdoor', label: 'Outdoor', url: 'outdoor.json' },
    { id: 'other', label: 'Other', url: 'other.json' },
  ],
  HIDDEN_BASE_LAYERS: ['Country border'],
}));

const mock = vi.hoisted(() => ({ mapProps: null, easeTo: null, jumpTo: null }));

vi.mock('react-map-gl/maplibre', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    default: forwardRef(function FakeMap(props, ref) {
      mock.mapProps = props;
      useImperativeHandle(ref, () => ({ easeTo: mock.easeTo, jumpTo: mock.jumpTo }));
      return <div data-testid="map" data-style={props.mapStyle}>{props.children}</div>;
    }),
    NavigationControl: () => null,
    ScaleControl: () => null,
  };
});

// The location button has its own tests (UserLocationControl.test.jsx),
// here it is replaced by a placeholder.
vi.mock('./UserLocationControl.jsx', () => ({
  default: () => <div data-testid="user-location" />,
}));

vi.mock('maplibre-gl', () => ({ setWorkerUrl: vi.fn() }));

vi.mock(
  'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url',
  () => ({ default: 'mock-worker' })
);

afterEach(() => {
  cleanup();
  mock.mapProps = null;
});

test('Shows the map container', () => {
  render(<MapView />);

  expect(screen.getByLabelText('Map')).toBeInTheDocument();
});

test('Uses the first base map, or the requested one', () => {
  render(<MapView />);
  expect(screen.getByTestId('map')).toHaveAttribute('data-style', 'outdoor.json');
  cleanup();

  render(<MapView baseStyleId="other" />);
  expect(screen.getByTestId('map')).toHaveAttribute('data-style', 'other.json');
});

test('Hides the layers indicated in HIDDEN_BASE_LAYERS', () => {
  render(<MapView />);

  const style = { layers: [{ id: 'Country border', type: 'line' }, { id: 'Roads', type: 'line' }] };
  const result = mock.mapProps.transformStyle(undefined, style);

  expect(result.layers[0].layout.visibility).toBe('none');
  expect(result.layers[1].layout).toBeUndefined();
});

test('Shows the location button inside the map', () => {
  render(<MapView />);

  expect(screen.getByTestId('map')).toContainElement(screen.getByTestId('user-location'));
});

test('The re-center button brings the map back to the initial view', () => {
  mock.easeTo = vi.fn();
  mock.jumpTo = vi.fn();
  render(<MapView />);

  fireEvent.click(screen.getByRole('button', { name: 'Re-center map' }));

  expect(mock.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [16.25, 39.35], zoom: 12, bearing: 0, pitch: 0 })
  );
});

test('Before re-centering, stops following the user\'s location', () => {
  mock.easeTo = vi.fn();
  mock.jumpTo = vi.fn();
  render(<MapView />);

  fireEvent.click(screen.getByRole('button', { name: 'Re-center map' }));

  // jumpTo({}) must come before easeTo, otherwise it doesn't unlock anything.
  expect(mock.jumpTo).toHaveBeenCalledWith({});
  expect(mock.jumpTo.mock.invocationCallOrder[0])
    .toBeLessThan(mock.easeTo.mock.invocationCallOrder[0]);
});

test('Shows the children inside the map', () => {
  render(<MapView><p>Controls</p></MapView>);

  expect(screen.getByTestId('map')).toContainElement(screen.getByText('Controls'));
});