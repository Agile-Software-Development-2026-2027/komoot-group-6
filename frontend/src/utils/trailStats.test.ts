import { describe, it, expect } from 'vitest';
import { calculateTrailStats } from './trailStats';

describe('Trail Statistics Utility', () => {
  const mockGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [16.228, 39.3561, 210],
            [16.2295, 39.3570, 224],
            [16.2300, 39.3600, 230],
            [16.2310, 39.3610, 215]
          ]
        }
      }
    ]
  };

  it('correctly calculates elevation gains, losses, and max/min altitudes', () => {
    const stats = calculateTrailStats(mockGeoJson);

    expect(stats.elevationGain).toBe(20);
    expect(stats.elevationLoss).toBe(15);
    expect(stats.maxAltitude).toBe(230);
    expect(stats.minAltitude).toBe(210);
    expect(stats.distanceKm).toBeGreaterThan(0);
  });

  it('throws an error if the GeoJSON is empty or malformed', () => {
    const badData = { type: "FeatureCollection", features: [] };
    
    expect(() => calculateTrailStats(badData)).toThrow();
  });
});