import { describe, expect, it } from 'vitest';
import {
  averageSpeedKmh,
  formatCompletedDate,
  formatSpeed,
  projectRoute,
  recapFileName,
  recapStats,
  shareLinks,
  shareText,
} from './shareRecap.js';

const TRAIL = { name: 'Anello del Lago Arvo', lengthM: 14500, ascentM: 250 };

describe('averageSpeedKmh / formatSpeed', () => {
  it('computes the average speed from length and duration', () => {
    expect(averageSpeedKmh(14500, 240)).toBeCloseTo(3.625);
    expect(formatSpeed(averageSpeedKmh(14500, 240))).toBe('3.6 km/h');
  });

  it('returns null / "—" when a value is missing or the duration is zero', () => {
    expect(averageSpeedKmh(null, 60)).toBeNull();
    expect(averageSpeedKmh(5000, null)).toBeNull();
    expect(averageSpeedKmh(5000, 0)).toBeNull();
    expect(formatSpeed(null)).toBe('—');
  });
});

describe('formatCompletedDate', () => {
  it('writes the date as "6 Nov 2026"', () => {
    expect(formatCompletedDate('2026-11-06T10:00:00Z')).toBe('6 Nov 2026');
  });

  it('returns null for a missing or invalid date', () => {
    expect(formatCompletedDate(null)).toBeNull();
    expect(formatCompletedDate('not a date')).toBeNull();
  });
});

describe('recapStats', () => {
  it('lists distance, estimated time, average speed and ascent', () => {
    expect(recapStats(TRAIL, 240)).toEqual([
      { label: 'Distance', value: '14.5 km' },
      { label: 'Est. time', value: '4:00 h' },
      { label: 'Avg speed', value: '3.6 km/h' },
      { label: 'Ascent', value: '250 m' },
    ]);
  });
});

describe('shareText', () => {
  it('puts the name and the numbers in one line', () => {
    expect(shareText(TRAIL, 240)).toBe('I completed "Anello del Lago Arvo"! 🥾 14.5 km · 4:00 h · 3.6 km/h · 250 m ascent');
  });

  it('leaves out the missing values', () => {
    expect(shareText({ name: 'Sentiero', lengthM: 8000, ascentM: null }, 120)).toBe(
      'I completed "Sentiero"! 🥾 8 km · 2:00 h · 4.0 km/h'
    );
    expect(shareText({ name: 'Sentiero' }, null)).toBe('I completed "Sentiero"! 🥾');
  });
});

describe('shareLinks', () => {
  it('builds the share links with text and url encoded', () => {
    const links = shareLinks('Hi & bye', 'https://site.test/trails/1');

    expect(links.whatsapp).toBe('https://wa.me/?text=Hi%20%26%20bye%0Ahttps%3A%2F%2Fsite.test%2Ftrails%2F1');
    expect(links.telegram).toBe('https://t.me/share/url?url=https%3A%2F%2Fsite.test%2Ftrails%2F1&text=Hi%20%26%20bye');
    expect(links.x).toBe('https://x.com/intent/post?text=Hi%20%26%20bye&url=https%3A%2F%2Fsite.test%2Ftrails%2F1');
    expect(links.facebook).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsite.test%2Ftrails%2F1');
  });
});

describe('recapFileName', () => {
  it('builds a file name without spaces and accents', () => {
    expect(recapFileName('Anello del Lago Arvo')).toBe('hike-anello-del-lago-arvo.png');
    expect(recapFileName('')).toBe('hike.png');
  });
});

describe('projectRoute', () => {
  const box = { x: 0, y: 0, width: 100, height: 100 };

  it('fits the route in the box, centered, with north at the top', () => {
    // Centered on the equator cos(lat) = 1: a route 2° wide and 1° tall
    const lines = projectRoute({ type: 'LineString', coordinates: [[0, -0.5], [2, 0.5]] }, box);

    // The width decides (100 px for 2°): 50 px per degree, 25 px of space above and below
    expect(lines).toEqual([[[0, 75], [100, 25]]]);
  });

  it('keeps the lines of a MultiLineString separate and skips broken points', () => {
    const lines = projectRoute(
      { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[null, 2], [1, 0]]] },
      box
    );

    expect(lines).toHaveLength(2);
    expect(lines[1]).toHaveLength(1);
  });

  it('shrinks longitudes away from the equator', () => {
    // At 60° N a degree of longitude is half a degree of latitude: 2° x 1° becomes a square
    const [[start, end]] = projectRoute({ type: 'LineString', coordinates: [[0, 59.5], [2, 60.5]] }, box);

    expect(end[0] - start[0]).toBeCloseTo(start[1] - end[1], 0);
  });

  it('returns [] when there is no route', () => {
    expect(projectRoute({ type: 'Point', coordinates: [1, 1] }, box)).toEqual([]);
    expect(projectRoute(null, box)).toEqual([]);
  });
});
