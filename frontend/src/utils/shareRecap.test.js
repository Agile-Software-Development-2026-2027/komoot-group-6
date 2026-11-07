import { describe, expect, it } from 'vitest';
import {
  formatCompletedDate,
  projectRoute,
  recapFileName,
  recapStats,
  shareLinks,
  shareText,
  trailUrl,
} from './shareRecap.js';

const TRAIL = { name: 'Anello del Lago Arvo', lengthM: 14500, ascentM: 250 };

describe('trailUrl', () => {
  it('uses the public address of the site when it is set, otherwise the one of the page', () => {
    expect(trailUrl('abc', 'https://hike.test/')).toBe('https://hike.test/trails/abc');
    expect(trailUrl('abc', '')).toBe(`${window.location.origin}/trails/abc`);
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
  it('lists distance, estimated time and ascent', () => {
    expect(recapStats(TRAIL, 240)).toEqual([
      { label: 'Distance', value: '14.5 km' },
      { label: 'Est. time', value: '4:00 h' },
      { label: 'Ascent', value: '250 m' },
    ]);
  });
});

describe('shareText', () => {
  it('puts the name and the numbers in one line', () => {
    expect(shareText(TRAIL, 240)).toBe('I completed "Anello del Lago Arvo"! 🥾 14.5 km · est. 4:00 h · 250 m ascent');
  });

  it('leaves out the missing values', () => {
    expect(shareText({ name: 'Sentiero', lengthM: 8000, ascentM: null }, 120)).toBe(
      'I completed "Sentiero"! 🥾 8 km · est. 2:00 h'
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

  it('works with very long routes', () => {
    // Math.min(...points) would throw here: too many arguments for one call
    const coordinates = Array.from({ length: 300000 }, (_, i) => [i / 100000, 0]);

    const [line] = projectRoute({ type: 'LineString', coordinates }, box);

    expect(line).toHaveLength(300000);
    expect(line[0][0]).toBe(0);
    expect(line.at(-1)[0]).toBeCloseTo(100);
  });

  it('returns [] when there is no route', () => {
    expect(projectRoute({ type: 'Point', coordinates: [1, 1] }, box)).toEqual([]);
    expect(projectRoute(null, box)).toEqual([]);
  });
});
