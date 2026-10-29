import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';

export function useLayerEvents(layerId, { onClick } = {}, mapInstance) {
  const { current } = useMap?.() ?? {};
  const map = mapInstance ?? current?.getMap?.() ?? current;

  // riferimento sempre aggiornato alla callback
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!map || !layerId) return undefined;

    const resetCursor = () => {
      const canvas = map.getCanvas?.();
      if (canvas) canvas.style.cursor = '';
    };

    const handleClick = (e) => {
      const feature = e.features?.[0];
      if (feature && onClickRef.current) {
        onClickRef.current(feature, e);
      }
    };

    const handleMouseEnter = () => {
      const canvas = map.getCanvas?.();
      if (canvas) canvas.style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      resetCursor();
    };

    // registrazione e risincronizzazione listener sul layer
    const syncListeners = () => {
      resetCursor();

      map.off('click', layerId, handleClick);
      map.off('mouseenter', layerId, handleMouseEnter);
      map.off('mouseleave', layerId, handleMouseLeave);

      map.on('click', layerId, handleClick);
      map.on('mouseenter', layerId, handleMouseEnter);
      map.on('mouseleave', layerId, handleMouseLeave);
    };

    syncListeners();

    // riaggancio al cambio stile della mappa
    map.on('style.load', syncListeners);

    // pulizia finale listener e cursore
    return () => {
      map.off('style.load', syncListeners);
      map.off('click', layerId, handleClick);
      map.off('mouseenter', layerId, handleMouseEnter);
      map.off('mouseleave', layerId, handleMouseLeave);
      resetCursor();
    };
  }, [map, layerId]);
}
