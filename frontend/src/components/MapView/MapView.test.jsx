import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import MapView from './MapView.jsx';

vi.mock('../../config/map.config.js', () => ({
  MAPTILER_API_KEY: 'test-key',
  DEFAULT_MAP_SETTINGS: {},
}));


vi.mock('maplibre-gl', () => ({
  Map: class {
    addControl() {}
    on() {}
    off() {}
    remove() {}
  },
  NavigationControl: class {},
  GeolocateControl: class {
    trigger() {}
  },
  setWorkerUrl: vi.fn(),
}));

vi.mock(
  'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url',
  () => ({ default: 'mock-worker' })
);

afterEach(cleanup);

test('Mostra il contenitore della mappa', () => {
 render(<MapView />);

 expect(screen.getByLabelText('Map')).toBeInTheDocument();
});