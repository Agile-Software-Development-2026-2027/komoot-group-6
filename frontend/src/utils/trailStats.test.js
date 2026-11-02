import { describe, it, expect } from 'vitest';
import { calculateTrailStats } from './trailStats';

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