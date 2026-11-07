import { expect, it } from 'vitest';
import { routeToSvgPath } from './routePath.js';

const line = (coordinates) => ({ type: 'LineString', coordinates });

it('returns null when there is no usable route', () => {
  expect(routeToSvgPath(null)).toBeNull();
  expect(routeToSvgPath({ type: 'Point', coordinates: [16, 39] })).toBeNull();
  expect(routeToSvgPath(line([[16, 39]]))).toBeNull();
  // all the points coincide
  expect(routeToSvgPath(line([[16, 39], [16, 39]]))).toBeNull();
  // invalid points are discarded
  expect(routeToSvgPath(line([[16, 39], [NaN, 39]]))).toBeNull();
});

it('draws north up and keeps the route inside the box with its padding', () => {
  const route = routeToSvgPath(line([[16, 39], [16, 39.1], [16.1, 39.1]]), { width: 200, height: 100, padding: 10 });

  expect(route.d.startsWith('M')).toBe(true);
  // the start (south) is below the end (north): y grows downwards
  expect(route.start[1]).toBeGreaterThan(route.end[1]);
  for (const [x, y] of [route.start, route.end]) {
    expect(x).toBeGreaterThanOrEqual(10);
    expect(x).toBeLessThanOrEqual(190);
    expect(y).toBeGreaterThanOrEqual(10);
    expect(y).toBeLessThanOrEqual(90);
  }
});

it('joins the lines of a MultiLineString with a new M for each one', () => {
  const route = routeToSvgPath({
    type: 'MultiLineString',
    coordinates: [[[16, 39], [16.1, 39]], [[16.2, 39.1], [16.3, 39.1]]],
  });

  expect(route.d.match(/M/g)).toHaveLength(2);
});

it('keeps at most 400 points on very long routes, including first and last', () => {
  const coordinates = Array.from({ length: 5000 }, (_, i) => [16 + i * 0.0001, 39 + Math.sin(i / 50) * 0.01]);
  const route = routeToSvgPath(line(coordinates));

  expect(route.d.split(' ').filter((part) => /^[ML]/.test(part))).toHaveLength(400);
});
