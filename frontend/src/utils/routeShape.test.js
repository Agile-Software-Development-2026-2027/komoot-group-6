// Unit tests for routeShape: last point of a route, loop or one way
import { describe, expect, it } from 'vitest';
import { isLoop, lastPoint } from './routeShape.js';

describe('lastPoint', () => {
  it('returns the last point of a LineString and of a MultiLineString', () => {
    expect(lastPoint({ type: 'LineString', coordinates: [[1, 2], [3, 4]] })).toEqual([3, 4]);
    expect(lastPoint({ type: 'MultiLineString', coordinates: [[[1, 2]], [[5, 6], [7, 8]]] })).toEqual([7, 8]);
  });

  it('returns null for a Point or no geometry', () => {
    expect(lastPoint({ type: 'Point', coordinates: [1, 2] })).toBeNull();
    expect(lastPoint(null)).toBeNull();
  });
});

describe('isLoop', () => {
  const start = [16.23, 39.36];

  it('is a loop when the end is within 100 m of the start', () => {
    // 0.0005° of latitude is about 55 m
    const route = { type: 'LineString', coordinates: [start, [16.25, 39.35], [16.23, 39.3605]] };
    expect(isLoop(start, route)).toBe(true);
  });

  it('is one way when the end is far from the start', () => {
    const route = { type: 'LineString', coordinates: [start, [16.25, 39.35]] };
    expect(isLoop(start, route)).toBe(false);
  });

  it('cannot tell without a route or without a start', () => {
    expect(isLoop(start, { type: 'Point', coordinates: start })).toBeNull();
    expect(isLoop(null, { type: 'LineString', coordinates: [start, [16.25, 39.35]] })).toBeNull();
  });
});