import { describe, expect, it } from 'vitest';
import { formatLikes, likesText } from './formatLikes.js';

describe('formatLikes', () => {
  it('shortens big numbers like social networks do', () => {
    expect(formatLikes(0)).toBe('0');
    expect(formatLikes(950)).toBe('950');
    expect(formatLikes(1234)).toBe('1.2K');
    expect(formatLikes(15000)).toBe('15K');
  });
});

describe('likesText', () => {
  it('writes the sentence from the user\'s point of view', () => {
    expect(likesText(0, false)).toBe('Be the first to like this trail');
    expect(likesText(1, false)).toBe('1 person likes this trail');
    expect(likesText(12, false)).toBe('12 people like this trail');
    expect(likesText(1, true)).toBe('You like this trail');
    expect(likesText(2, true)).toBe('You and 1 other like this trail');
    expect(likesText(12, true)).toBe('You and 11 others like this trail');
  });
});
