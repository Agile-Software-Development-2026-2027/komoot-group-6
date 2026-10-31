
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMap } from 'react-map-gl/maplibre';

import { useFirstLabelLayerId } from './useFirstLabelLayerId.js';

// Mock the react-map-gl useMap hook.
vi.mock('react-map-gl/maplibre', () => ({
  useMap: vi.fn(),
}));

describe('useFirstLabelLayerId', () => {
  let layers;
  let listeners;
  let mockMap;

  beforeEach(() => {
    vi.clearAllMocks();

    listeners = new Map();

    layers = [
      {
        id: 'background',
        type: 'background',
      },
      {
        id: 'roads',
        type: 'line',
      },
      {
        id: 'icons',
        type: 'symbol',
        layout: {
          'icon-image': 'marker',
        },
      },
      {
        id: 'city-labels',
        type: 'symbol',
        layout: {
          'text-field': ['get', 'name'],
        },
      },
      {
        id: 'street-labels',
        type: 'symbol',
        layout: {
          'text-field': ['get', 'name'],
        },
      },
    ];

    mockMap = {
      getStyle: vi.fn(() => ({ layers })),

      on: vi.fn((event, callback) => {
        listeners.set(event, callback);
      }),

      off: vi.fn((event, callback) => {
        if (listeners.get(event) === callback) {
          listeners.delete(event);
        }
      }),
    };

    vi.mocked(useMap).mockReturnValue({
      current: {
        getMap: () => mockMap,
      },
    });
  });

  it('returns the ID of the first text-label layer', () => {
    const { result } = renderHook(
      () => useFirstLabelLayerId()
    );

    expect(result.current).toBe('city-labels');
  });

  it('updates when the map style changes', () => {
    const { result } = renderHook(
      () => useFirstLabelLayerId()
    );

    expect(result.current).toBe('city-labels');

    // Simulate switching to another map style.
    layers = [
      {
        id: 'new-background',
        type: 'background',
      },
      {
        id: 'new-place-labels',
        type: 'symbol',
        layout: {
          'text-field': ['get', 'name'],
        },
      },
    ];

    // Simulate MapLibre's style.load event.
    act(() => {
      listeners.get('style.load')();
    });

    expect(result.current).toBe('new-place-labels');
  });

  it('removes the style listener when unmounted', () => {
    const { unmount } = renderHook(
      () => useFirstLabelLayerId()
    );

    const callback = listeners.get('style.load');

    expect(mockMap.on).toHaveBeenCalledWith(
      'style.load',
      callback
    );

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith(
      'style.load',
      callback
    );

    expect(listeners.has('style.load')).toBe(false);
  });

  it('returns undefined when no label layer exists', () => {
    layers = [
      {
        id: 'background',
        type: 'background',
      },
      {
        id: 'roads',
        type: 'line',
      },
    ];

    const { result } = renderHook(
      () => useFirstLabelLayerId()
    );

    expect(result.current).toBeUndefined();
  });
});
