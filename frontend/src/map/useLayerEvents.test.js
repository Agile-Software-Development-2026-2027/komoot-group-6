import { expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLayerEvents } from './useLayerEvents.js';

// fake map per simulare maplibre senza canvas webgl reale
function createFakeMap() {
  const listeners = {};
  const canvas = { style: { cursor: '' } };

  return {
    listeners,
    canvas,
    getCanvas: () => canvas,
    on: (event, ...args) => {
      const layerId = typeof args[0] === 'string' ? args[0] : null;
      const cb = typeof args[0] === 'function' ? args[0] : args[1];
      const key = layerId ? `${event}:${layerId}` : event;
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(cb);
    },
    off: (event, ...args) => {
      const layerId = typeof args[0] === 'string' ? args[0] : null;
      const cb = typeof args[0] === 'function' ? args[0] : args[1];
      const key = layerId ? `${event}:${layerId}` : event;
      if (listeners[key]) {
        listeners[key] = listeners[key].filter((fn) => fn !== cb);
      }
    },
    emit: (event, layerId, eventData) => {
      const key = layerId ? `${event}:${layerId}` : event;
      listeners[key]?.forEach((cb) => cb(eventData));
    },
  };
}

test('calls onClick with the clicked feature when the layer is clicked', () => {
  const map = createFakeMap();
  const onClick = vi.fn();
  const feature = { id: 'route-1', properties: { name: 'trail' } };

  renderHook(() => useLayerEvents('trail-layer', { onClick }, map));

  map.emit('click', 'trail-layer', { features: [feature] });

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onClick).toHaveBeenCalledWith(feature, expect.anything());
});

test('changes cursor to pointer on mouseenter and resets on mouseleave', () => {
  const map = createFakeMap();

  renderHook(() => useLayerEvents('trail-layer', {}, map));

  map.emit('mouseenter', 'trail-layer');
  expect(map.canvas.style.cursor).toBe('pointer');

  map.emit('mouseleave', 'trail-layer');
  expect(map.canvas.style.cursor).toBe('');
});

test('removes listeners and resets cursor when component unmounts', () => {
  const map = createFakeMap();
  map.canvas.style.cursor = 'pointer';

  const { unmount } = renderHook(() => useLayerEvents('trail-layer', {}, map));

  unmount();

  expect(map.listeners['click:trail-layer']).toHaveLength(0);
  expect(map.listeners['mouseenter:trail-layer']).toHaveLength(0);
  expect(map.listeners['mouseleave:trail-layer']).toHaveLength(0);
  expect(map.canvas.style.cursor).toBe('');
});

test('keeps click listener working after base map style reload', () => {
  const map = createFakeMap();
  const onClick = vi.fn();
  const feature = { id: 'route-2' };

  renderHook(() => useLayerEvents('trail-layer', { onClick }, map));

  // simula il ricaricamento dello stile della mappa base
  map.emit('style.load');

  map.emit('click', 'trail-layer', { features: [feature] });

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onClick).toHaveBeenCalledWith(feature, expect.anything());
});
