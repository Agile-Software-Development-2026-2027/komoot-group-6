import { describe, expect, it } from 'vitest';
import { getLevelName, LEVEL_NAMES, MAX_LEVEL } from './levels.config.js';

describe('levels config', () => {
  it('defines max level as 5 for trail master', () => {
    expect(MAX_LEVEL).toBe(5);
  });
  it('maps known level numbers to their names', () => {
    expect(LEVEL_NAMES[0]).toBe('Beginner');
    expect(LEVEL_NAMES[1]).toBe('Walker');
    expect(LEVEL_NAMES[2]).toBe('Hiker');
    expect(LEVEL_NAMES[3]).toBe('Explorer');
    expect(LEVEL_NAMES[4]).toBe('Mountaineer');
    expect(LEVEL_NAMES[5]).toBe('Trail master');
  });

  it('getLevelName returns level name or fallback', () => {
    expect(getLevelName(0)).toBe('Beginner');
    expect(getLevelName(3)).toBe('Explorer');
    expect(getLevelName(99)).toBe('Level 99');
    expect(getLevelName(null)).toBe('Level null');
  });
});
