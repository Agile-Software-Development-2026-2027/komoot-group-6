import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Layer, Source } from 'react-map-gl/maplibre';
import TrailStartsLayer from './TrailStartsLayer.jsx';

vi.mock('react-map-gl/maplibre', () => ({
  Source: vi.fn(({ children }) => <div>{children}</div>),
  Layer: vi.fn(() => null),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const collection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [16.2275, 39.359] },
      properties: { id: 'a', name: 'Test trail' },
    },
  ],
};

describe('TrailStartsLayer', () => {
  it('renders nothing without data', () => {
    render(<TrailStartsLayer data={null} />);
    expect(Source).not.toHaveBeenCalled();
  });

  it('draws the start points as circles in a layer called trail-starts', () => {
    render(<TrailStartsLayer data={collection} />);

    expect(Source.mock.calls[0][0]).toMatchObject({ type: 'geojson', data: collection });
    expect(Layer.mock.calls[0][0]).toMatchObject({ id: 'trail-starts', type: 'circle' });
  });
});
