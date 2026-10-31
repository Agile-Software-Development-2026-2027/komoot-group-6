
import { useEffect, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';

/**
 * Returns the ID of the first text-label layer in the current map style.
 *
 * Example usage inside a <Map> component:
 *
 * const beforeId = useFirstLabelLayerId();
 *
 * <Layer
 *   id="hiking-route"
 *   type="line"
 *   beforeId={beforeId}
 *   paint={{ 'line-color': '#16803c', 'line-width': 4 }}
 * />
 */

export function useFirstLabelLayerId() {
  const { current } = useMap();
  const map = current?.getMap();

  const [firstLabelLayerId, setFirstLabelLayerId] =
    useState(undefined);

  useEffect(() => {
    if (!map) {
      setFirstLabelLayerId(undefined);
      return undefined;
    }

    // Find the first layer containing text labels.
    const updateLabelLayerId = () => {
      const layers = map.getStyle()?.layers ?? [];

      const firstLabelLayer = layers.find(
        (layer) =>
          layer.type === 'symbol' &&
          layer.layout?.['text-field'] != null
      );

      setFirstLabelLayerId(firstLabelLayer?.id);
    };

    // Check the current style immediately.
    updateLabelLayerId();

    // Check again whenever the map style changes.
    map.on('style.load', updateLabelLayerId);

    // Remove the listener when the component unmounts.
    return () => {
      map.off('style.load', updateLabelLayerId);
    };
  }, [map]);

  return firstLabelLayerId;
}
