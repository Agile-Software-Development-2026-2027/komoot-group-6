//test for hidelayers.js (can be extended)

import { expect, test } from 'vitest';
import { hideLayers } from './hideLayers.js';

test('hides only the specified layers, without touching the others', () => {
  const transform = hideLayers(['Country border']);
  const style = {
    version: 8,
    layers: [
      { id: 'Country border', type: 'line', layout: { 'line-cap': 'round' } },
      { id: 'Roads', type: 'line' },
    ],
  };

  const result = transform(undefined, style);

  expect(result.layers[0].layout).toEqual({ 'line-cap': 'round', visibility: 'none' });
  expect(result.layers[1]).toBe(style.layers[1]);
  expect(style.layers[0].layout.visibility).toBeUndefined();
});