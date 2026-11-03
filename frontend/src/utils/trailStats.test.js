import { describe, it, expect } from 'vitest';
import length from '@turf/length';
import { buildElevationProfile, calculateTrailStats } from './trailStats';

describe('Trail Statistics Utility', () => {
  it('1. standard case with LineString and FeatureCollection', () => {
    const data = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[16.2, 39.3, 210], [16.2, 39.4, 224], [16.2, 39.5, 230], [16.2, 39.6, 215]]
        }
      }]
    };
    const stats = calculateTrailStats(data);
    expect(stats.elevationGain).toBe(20);
    expect(stats.maxAltitude).toBe(230);
  });

  it('2. supports multi-segment GPX (MultiLineString)', () => {
    const data = {
      type: "MultiLineString",
      coordinates: [
        [[0, 0, 100], [0, 1, 110]], 
        [[0, 1, 110], [0, 2, 105]]
      ]
    };
    const stats = calculateTrailStats(data);
    expect(stats.elevationGain).toBe(10);
  });

  it('3. supports single Feature format (API response)', () => {
    const data = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[0,0,10], [0,1,20]] }
    };
    const stats = calculateTrailStats(data);
    expect(stats.distanceKm).toBeGreaterThan(0);
  });

  it('4. returns null for missing altitudes', () => {
    const data = {
      type: "LineString", coordinates: [[0,0], [0,1]] 
    };
    const stats = calculateTrailStats(data);
    expect(stats.maxAltitude).toBeNull();
    expect(stats.minAltitude).toBeNull();
  });

  it('5. ignores missing initial altitude and uses subsequent points', () => {
    const data = {
      type: "LineString", coordinates: [[0,0], [0,1, 800], [0,2, 850]]
    };
    const stats = calculateTrailStats(data);
    expect(stats.minAltitude).toBe(800);
    expect(stats.maxAltitude).toBe(850);
  });

  it('6. throws an error with only one valid point', () => {
    const data = { type: "LineString", coordinates: [[0,0,10]] };
    expect(() => calculateTrailStats(data)).toThrow("Unable to extract coordinates");
  });

  it('7. ignores GPS noise on flat routes (5m threshold)', () => {
    const data = {
      type: "LineString", 
      coordinates: [[0,0, 100], [0,1, 102], [0,2, 98], [0,3, 101]] 
    };
    const stats = calculateTrailStats(data);
    expect(stats.elevationGain).toBe(0);
    expect(stats.elevationLoss).toBe(0);
  });
});

describe('Elevation profile points for chart-to-map synchronization', () => {
  it('rounds only the profile values to meters and decimeters, retaining the original GPS coordinate', () => {
    const coordinates = [Object.freeze([16, 39, 1234.56789]), Object.freeze([16.001, 39.001, 1200.12345])];
    const route = { type: 'LineString', coordinates };
    const profile = buildElevationProfile(route);
    const expectedDistance = Math.round(length(route, { units: 'kilometers' }) * 1000) / 1000;

    expect(profile[0]).toEqual({ distance: 0, elevation: 1234.6, coordinates: coordinates[0] });
    expect(profile[1].distance).toBe(expectedDistance);
    expect(profile[1].elevation).toBe(1200.1);
    expect(profile[0].coordinates).toBe(coordinates[0]);
    expect(profile[1].coordinates).toBe(coordinates[1]);
    expect(coordinates[0][2]).toBe(1234.56789);
    expect(coordinates[1][2]).toBe(1200.12345);
  });

  it('accumulates 10,000 sub-meter segments without rounding each increment or dropping profile points', () => {
    const coordinates = Array.from({ length: 10001 }, (_, i) => [16 + i * 0.000001, 39, 1234.56789]);
    const route = { type: 'LineString', coordinates };
    const profile = buildElevationProfile(route);
    const expectedDistance = Math.round(length(route, { units: 'kilometers' }) * 1000) / 1000;

    expect(profile).toHaveLength(coordinates.length);
    expect(profile[1].distance).toBe(0);
    expect(profile.at(-1).distance).toBe(expectedDistance);
    expect(profile.at(-1).distance).toBeGreaterThan(0.8);
    expect(profile.every((point, i) => point.coordinates === coordinates[i])).toBe(true);
    expect(profile.every((point, i) => i === 0 || point.distance >= profile[i - 1].distance)).toBe(true);
  });

  it('keeps each original coordinate and zero elevation with progressive distances in kilometers', () => {
    const coordinates = [[16, 39, 0], [16.01, 39.01, 100], [16.02, 39.02, 120]];
    const route = { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} };
    const profile = buildElevationProfile(route);

    expect(profile.map((point) => point.elevation)).toEqual([0, 100, 120]);
    expect(profile[0]).toEqual({ distance: 0, elevation: 0, coordinates: coordinates[0] });
    profile.forEach((point, index) => expect(point.coordinates).toBe(coordinates[index]));
    expect(profile[1].distance).toBeGreaterThan(0);
    expect(profile[2].distance).toBeGreaterThan(profile[1].distance);
    expect(profile.at(-1).distance).toBeCloseTo(calculateTrailStats(route).distanceKm, 2);
    expect(buildElevationProfile({ type: 'FeatureCollection', features: [route] })).toEqual(profile);
    expect(buildElevationProfile(route.geometry)).toEqual(profile);
  });

  it('includes the distance traveled through points with missing elevation without inventing their altitude', () => {
    const route = { type: 'LineString', coordinates: [[0, 0, 100], [0, 1], [0, 2, 120]] };
    const profile = buildElevationProfile(route);

    expect(profile).toHaveLength(2);
    expect(profile[1].coordinates).toBe(route.coordinates[2]);
    expect(profile[1].distance).toBeCloseTo(calculateTrailStats(route).distanceKm, 2);
  });

  it('does not add a straight-line jump between separate MultiLineString segments', () => {
    const route = { type: 'MultiLineString', coordinates: [
      [[0, 0, 100], [0, 1, 110]], [[30, 30, 200], [30, 31, 210]],
    ] };
    const profile = buildElevationProfile(route);

    expect(profile).toHaveLength(4);
    expect(profile[2].distance).toBe(profile[1].distance);
    expect(profile[2].coordinates).toBe(route.coordinates[1][0]);
    expect(profile.at(-1).distance).toBeCloseTo(calculateTrailStats(route).distanceKm, 2);
  });

  it.each([null, { type: 'Point', coordinates: [16, 39] },
    { type: 'LineString', coordinates: [[16, 39], [16.01, 39.01]] }])(
    'has no profile for missing, point-only or two-dimensional routes: %j', (route) => {
      expect(buildElevationProfile(route)).toEqual([]);
    }
  );
});
