import { describe, expect, it } from 'vitest';
import { getPanOffset } from './panToFit.js';

const rect = (left, top, right, bottom) => ({ left, top, right, bottom });
const container = rect(0, 0, 400, 400);

describe('getPanOffset', () => {
  it('does not move the map when the element is fully inside', () => {
    expect(getPanOffset(rect(100, 100, 300, 250), container)).toEqual([0, 0]);
  });

  it('pans up (negative y) when the element sticks out of the top', () => {
    expect(getPanOffset(rect(100, -50, 300, 100), container, 12)).toEqual([0, -62]);
  });

  it('pans down (positive y) when the element sticks out of the bottom', () => {
    expect(getPanOffset(rect(100, 300, 300, 450), container, 12)).toEqual([0, 62]);
  });

  it('pans sideways when the element sticks out of the left or the right', () => {
    expect(getPanOffset(rect(-20, 100, 180, 200), container, 12)).toEqual([-32, 0]);
    expect(getPanOffset(rect(250, 100, 430, 200), container, 12)).toEqual([42, 0]);
  });

  it('keeps the margin from the edges', () => {
    // dentro il contenitore, ma a 5 px dal bordo alto: deve restare a 12 px
    expect(getPanOffset(rect(100, 5, 300, 100), container, 12)).toEqual([0, -7]);
  });

  it('favours the top edge when the element is taller than the container', () => {
    expect(getPanOffset(rect(100, -20, 300, 500), container, 12)).toEqual([0, -32]);
  });
});
