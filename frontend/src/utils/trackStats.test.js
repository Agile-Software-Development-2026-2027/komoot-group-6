import { describe, expect, it } from 'vitest';
import { getTrackStats } from './trackStats.js';

describe('getTrackStats', () => {
  // ~111 m per 0.001° di latitudine
  const feature = {
    type: 'Feature',
    properties: {
      name: 'Test trail',
      type: 'hike',
      coordinateProperties: { times: ['2025-08-17T10:00:00Z', '2025-08-17T10:30:00Z', '2025-08-17T11:00:00Z'] },
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [16, 39, 100],
        [16, 39.001, 150],
        [16, 39.002, 120],
      ],
    },
  };

  it('computes distance, ascent, descent and altitude range', () => {
    const stats = getTrackStats(feature);
    expect(stats.name).toBe('Test trail');
    expect(stats.activity).toBe('hike');
    expect(stats.distance).toBeGreaterThan(220);
    expect(stats.distance).toBeLessThan(224);
    expect(stats.ascent).toBe(50);
    expect(stats.descent).toBe(30);
    expect(stats.minAltitude).toBe(100);
    expect(stats.maxAltitude).toBe(150);
  });

  it('computes the total time from the timestamps', () => {
    expect(getTrackStats(feature).duration).toBe(60 * 60 * 1000);
  });

  it('returns null for altitude and time when the file has none', () => {
    const stats = getTrackStats({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[16, 39], [16, 39.001]] },
    });
    expect(stats.name).toBe('Untitled track');
    expect(stats.ascent).toBeNull();
    expect(stats.maxAltitude).toBeNull();
    expect(stats.duration).toBeNull();
    expect(stats.distance).toBeGreaterThan(0);
  });
});
