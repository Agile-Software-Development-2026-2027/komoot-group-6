// Unit tests for routeBounds: the rectangle around a route
import { describe, expect, it } from 'vitest';
import { routeBounds } from './routeBounds.js';

describe('routeBounds', () => {
  it('returns [[minLng, minLat], [maxLng, maxLat]] of a LineString', () => {
    const route = {
      type: 'LineString',
      coordinates: [[16.23, 39.36, 210], [16.25, 39.35, 240], [16.21, 39.37, 220]],
    };
    expect(routeBounds(route)).toEqual([[16.21, 39.35], [16.25, 39.37]]);
  });

  it('uses every segment of a MultiLineString', () => {
    const route = {
      type: 'MultiLineString',
      coordinates: [[[16.2, 39.3], [16.3, 39.4]], [[16.1, 39.5], [16.15, 39.45]]],
    };
    expect(routeBounds(route)).toEqual([[16.1, 39.3], [16.3, 39.5]]);
  });

  it('turns a single Point into a rectangle of zero size', () => {
    expect(routeBounds({ type: 'Point', coordinates: [16.2, 39.3] })).toEqual([[16.2, 39.3], [16.2, 39.3]]);
  });

  it('skips points that are not numbers', () => {
    const route = { type: 'LineString', coordinates: [[16.2, 39.3], [null, 39.9], [16.3, 39.4]] };
    expect(routeBounds(route)).toEqual([[16.2, 39.3], [16.3, 39.4]]);
  });

  it('returns null when there is nothing to show', () => {
    expect(routeBounds(null)).toBeNull();
    expect(routeBounds({ type: 'LineString', coordinates: [] })).toBeNull();
  });
});