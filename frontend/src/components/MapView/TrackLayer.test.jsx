import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import TrackLayer from './TrackLayer.jsx';
import { useFirstLabelLayerId } from '../../map/useFirstLabelLayerId.js';

// Mock react-map-gl/maplibre Source and Layer components
vi.mock('react-map-gl/maplibre', () => ({
  Source: vi.fn(({ children }) => <div>{children}</div>),
  Layer: vi.fn(() => null),
}));

// Mock useFirstLabelLayerId hook
vi.mock('../../map/useFirstLabelLayerId.js', () => ({
  useFirstLabelLayerId: vi.fn(),
}));

describe('TrackLayer - Rendering and Styling', () => {
  const fakeGeoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [16.22, 39.35, 450],
            [16.23, 39.36, 480],
          ],
        },
        properties: { name: 'Test trail' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFirstLabelLayerId).mockReturnValue('city-labels');
  });

  it('renders nothing when data is null or undefined', () => {
    const { container } = render(<TrackLayer data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Source and Layer with GeoJSON data and correct line styling', async () => {
    const { Source, Layer } = await import('react-map-gl/maplibre');

    render(<TrackLayer data={fakeGeoJson} />);

    expect(Source).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'track-source',
        type: 'geojson',
        data: fakeGeoJson,
      }),
      undefined
    );

    expect(Layer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'track-layer',
        type: 'line',
        paint: {
          'line-color': '#E63946',
          'line-width': 4,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      }),
      undefined
    );
  });

  it("applies beforeId from useFirstLabelLayerId (Goitom's rule)", async () => {
    const { Layer } = await import('react-map-gl/maplibre');

    vi.mocked(useFirstLabelLayerId).mockReturnValue('first-label-layer-id');

    render(<TrackLayer data={fakeGeoJson} />);

    expect(useFirstLabelLayerId).toHaveBeenCalled();
    expect(Layer).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeId: 'first-label-layer-id',
      }),
      undefined
    );
  });
});
