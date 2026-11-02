import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TrackPopup from './TrackPopup.jsx';

// Dimensioni del popup e del riquadro della mappa, modificabili da ogni test
const rects = vi.hoisted(() => ({
  popup: { left: 100, top: 100, right: 300, bottom: 250 },
  container: { left: 0, top: 0, right: 400, bottom: 400 },
}));
const panBy = vi.hoisted(() => vi.fn());
const popupProps = vi.hoisted(() => vi.fn());

// Il vero Popup e la vera mappa non servono: basta mostrare il contenuto e simulare le misure
vi.mock('react-map-gl/maplibre', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    Popup: forwardRef((props, ref) => {
      popupProps(props);
      useImperativeHandle(ref, () => ({ getElement: () => ({ getBoundingClientRect: () => rects.popup }) }));
      return <div data-testid="popup">{props.children}</div>;
    }),
    useMap: () => ({
      current: { getContainer: () => ({ getBoundingClientRect: () => rects.container }), panBy },
    }),
  };
});

beforeEach(() => {
  // Esegue subito il callback di requestAnimationFrame
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    callback();
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  rects.popup = { left: 100, top: 100, right: 300, bottom: 250 };
});

const stats = {
  name: 'Test trail',
  activity: 'hike',
  startTime: '2025-08-17T10:00:00Z',
  distance: 12345,
  duration: 90 * 60 * 1000,
  ascent: 400,
  descent: 380,
  minAltitude: 100,
  maxAltitude: 900,
};
const lngLat = { lng: 16.17, lat: 39.27 };

describe('TrackPopup', () => {
  it('renders nothing without stats or position', () => {
    expect(render(<TrackPopup stats={null} lngLat={lngLat} onClose={() => {}} />).container.firstChild).toBeNull();
    cleanup();
    expect(render(<TrackPopup stats={stats} lngLat={null} onClose={() => {}} />).container.firstChild).toBeNull();
  });

  it('places the popup at the clicked point, above it, and shows the details', () => {
    render(<TrackPopup stats={stats} lngLat={lngLat} onClose={() => {}} />);

    expect(popupProps).toHaveBeenCalledWith(
      expect.objectContaining({ longitude: 16.17, latitude: 39.27, anchor: 'bottom' })
    );
    expect(screen.getByText('Test trail')).toBeTruthy();
    expect(screen.getByText('12.35 km')).toBeTruthy();
    expect(screen.getByText('1 h 30 min')).toBeTruthy();
    expect(screen.getByText('400 m')).toBeTruthy();
  });

  it('hides the details the file has no data for', () => {
    render(<TrackPopup stats={{ ...stats, duration: null, ascent: null, descent: null }} lngLat={lngLat} onClose={() => {}} />);
    expect(screen.queryByText('Total time')).toBeNull();
    expect(screen.queryByText('Ascent')).toBeNull();
    expect(screen.getByText('Distance')).toBeTruthy();
  });

  it('does not move the map when the popup is fully visible', () => {
    render(<TrackPopup stats={stats} lngLat={lngLat} onClose={() => {}} />);
    expect(panBy).not.toHaveBeenCalled();
  });

  it('pans the map when the popup sticks out of the map', () => {
    // esce di 50 px in alto: con il margine di 12 px la mappa deve scorrere di 62 px
    rects.popup = { left: 100, top: -50, right: 300, bottom: 100 };
    render(<TrackPopup stats={stats} lngLat={lngLat} onClose={() => {}} />);
    expect(panBy).toHaveBeenCalledWith([0, -62], { duration: 300 });
  });

  it('closes with Esc', () => {
    const onClose = vi.fn();
    render(<TrackPopup stats={stats} lngLat={lngLat} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
