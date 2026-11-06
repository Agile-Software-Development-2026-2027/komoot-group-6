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

// Proprietà di un sentiero come le restituisce GET /api/trails
const trail = {
  id: 'f3c1d2a0-0000-4000-8000-000000000001',
  name: 'Test trail',
  description: 'A nice loop.',
  trailType: 'trail_running',
  difficulty: 'E',
  lengthM: 12345,
  ascentM: 400,
  descentM: 380,
  maxElevationM: 900,
  estDurationMin: 90,
  startPoint: [16.17, 39.27],
};
const lngLat = { lng: 16.17, lat: 39.27 };

describe('TrackPopup', () => {
  it('renders nothing without trail or position', () => {
    expect(render(<TrackPopup trail={null} lngLat={lngLat} onClose={() => {}} />).container.firstChild).toBeNull();
    cleanup();
    expect(render(<TrackPopup trail={trail} lngLat={null} onClose={() => {}} />).container.firstChild).toBeNull();
  });

  it('places the popup at the start point, above it, and shows the details', () => {
    render(<TrackPopup trail={trail} lngLat={lngLat} onClose={() => {}} />);

    expect(popupProps).toHaveBeenCalledWith(
      expect.objectContaining({ longitude: 16.17, latitude: 39.27, anchor: 'bottom' })
    );
    expect(screen.getByText('Test trail')).toBeTruthy();
    expect(screen.getByText('A nice loop.')).toBeTruthy();
    expect(screen.getByText('trail running')).toBeTruthy();
    expect(screen.getByText('12.35 km')).toBeTruthy();
    expect(screen.getByText('1 h 30 min')).toBeTruthy();
    expect(screen.getByText('400 m')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('hides the details the trail has no data for', () => {
    render(
      <TrackPopup
        trail={{ ...trail, description: null, estDurationMin: null, ascentM: null, descentM: null }}
        lngLat={lngLat}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText('Est. time')).toBeNull();
    expect(screen.queryByText('Ascent')).toBeNull();
    expect(screen.queryByText('A nice loop.')).toBeNull();
    expect(screen.getByText('Distance')).toBeTruthy();
  });

  it('does not move the map when the popup is fully visible', () => {
    render(<TrackPopup trail={trail} lngLat={lngLat} onClose={() => {}} />);
    expect(panBy).not.toHaveBeenCalled();
  });

  it('pans the map when the popup sticks out of the map', () => {
    // esce di 50 px in alto: con il margine di 12 px la mappa deve scorrere di 62 px
    rects.popup = { left: 100, top: -50, right: 300, bottom: 100 };
    render(<TrackPopup trail={trail} lngLat={lngLat} onClose={() => {}} />);
    expect(panBy).toHaveBeenCalledWith([0, -62], { duration: 300 });
  });

  it('closes with Esc', () => {
    const onClose = vi.fn();
    render(<TrackPopup trail={trail} lngLat={lngLat} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has a link to the page of the trail', () => {
    render(<TrackPopup trail={trail} lngLat={lngLat} onClose={() => {}} />);

    const link = screen.getByRole('link', { name: /view trail details/i });
    expect(link.getAttribute('href')).toBe(`/trails/${trail.id}`);
  });
});
