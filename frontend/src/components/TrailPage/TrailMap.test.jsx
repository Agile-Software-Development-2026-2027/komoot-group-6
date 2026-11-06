// Tests for TrailMap. MapLibre cannot run in tests, so react-map-gl is replaced
// by simple components that remember the props they receive.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import TrailMap from './TrailMap.jsx';

const mock = vi.hoisted(() => ({ mapProps: null, trackProps: null, layers: [] }));

vi.mock('maplibre-gl', () => ({ setWorkerUrl: vi.fn() }));
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: 'worker.js' }));
vi.mock('../../config/map.config.js', () => ({
  MAPTILER_API_KEY: 'test-key',
  MAP_BASE_STYLES: [{ id: 'outdoor', label: 'Outdoor', url: 'outdoor.json' }],
  HIDDEN_BASE_LAYERS: [],
}));
vi.mock('react-map-gl/maplibre', () => ({
  default: (props) => {
    mock.mapProps = props;
    return <div data-testid="map">{props.children}</div>;
  },
  Marker: ({ longitude, latitude, children }) => (
    <div data-testid="marker" data-position={`${longitude},${latitude}`}>{children}</div>
  ),
  NavigationControl: () => null,
  ScaleControl: () => null,
  Source: ({ children }) => <>{children}</>,
  Layer: (props) => {
    mock.layers.push(props);
    return null;
  },
}));
vi.mock('../../map/useFirstLabelLayerId.js', () => ({ useFirstLabelLayerId: () => 'labels' }));
vi.mock('../MapView/TrackLayer.jsx', () => ({
  default: (props) => {
    mock.trackProps = props;
    return <div data-testid="track" />;
  },
}));

// A trail as returned by GET /api/trails/:id
function makeTrail(geometry, startPoint = [16.23, 39.36]) {
  return { type: 'Feature', id: 't1', geometry, properties: { id: 't1', name: 'Test', startPoint } };
}

const ROUTE = { type: 'LineString', coordinates: [[16.23, 39.36], [16.25, 39.35], [16.21, 39.37]] };

afterEach(() => {
  cleanup();
  mock.mapProps = null;
  mock.trackProps = null;
  mock.layers = [];
});

describe('TrailMap', () => {
  it('opens already zoomed on the whole route', () => {
    render(<TrailMap trail={makeTrail(ROUTE)} />);

    expect(mock.mapProps.initialViewState).toEqual({
      bounds: [[16.21, 39.35], [16.25, 39.37]],
      fitBoundsOptions: { padding: 64 },
    });
    expect(mock.mapProps.mapStyle).toBe('outdoor.json');
    // Scrolling the page does not zoom the map by mistake
    expect(mock.mapProps.cooperativeGestures).toBe(true);
  });

  it('draws the route with a white border under it, below the labels', () => {
    const trail = makeTrail(ROUTE);
    render(<TrailMap trail={trail} />);

    expect(mock.trackProps.data).toBe(trail);
    expect(mock.layers).toHaveLength(1);
    expect(mock.layers[0]).toMatchObject({ type: 'line', beforeId: 'labels' });
    expect(mock.layers[0].paint['line-color']).toBe('#ffffff');
  });

  it('marks start and end of a one-way route', () => {
    render(<TrailMap trail={makeTrail(ROUTE)} />);

    const positions = screen.getAllByTestId('marker').map((marker) => marker.dataset.position);
    // End first (drawn below), then start
    expect(positions).toEqual(['16.21,39.37', '16.23,39.36']);
    expect(screen.getByRole('img', { name: 'Start of the trail' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'End of the trail' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Map legend' }).textContent).toBe('StartEnd');
  });

  it('shows only the start marker for a loop', () => {
    const loop = { type: 'LineString', coordinates: [[16.23, 39.36], [16.25, 39.35], [16.2301, 39.3601]] };
    render(<TrailMap trail={makeTrail(loop)} />);

    expect(screen.getAllByTestId('marker')).toHaveLength(1);
    expect(screen.queryByRole('img', { name: 'End of the trail' })).toBeNull();
  });

  it('centers on the start when the trail has no route (only a point)', () => {
    render(<TrailMap trail={makeTrail({ type: 'Point', coordinates: [16.2, 39.3] }, [16.2, 39.3])} />);

    expect(mock.mapProps.initialViewState).toEqual({ longitude: 16.2, latitude: 39.3, zoom: 14 });
    expect(screen.queryByTestId('track')).toBeNull();
    expect(mock.layers).toHaveLength(0);
  });

  it('shows a message when there is nothing to draw', () => {
    render(<TrailMap trail={makeTrail({ type: 'LineString', coordinates: [] })} />);

    expect(screen.getByText('Map not available')).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
  });
});