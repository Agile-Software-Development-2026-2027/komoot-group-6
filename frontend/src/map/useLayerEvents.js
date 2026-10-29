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
      const canvas = map.getCanvas?.();
      if (canvas) canvas.style.cursor = '';
    };

    // ascolto eventi sul layer
    map.on('click', layerId, handleClick);
    map.on('mouseenter', layerId, handleMouseEnter);
    map.on('mouseleave', layerId, handleMouseLeave);

    // pulizia listener e cursore
    return () => {
      map.off('click', layerId, handleClick);
      map.off('mouseenter', layerId, handleMouseEnter);
      map.off('mouseleave', layerId, handleMouseLeave);

      const canvas = map.getCanvas?.();
      if (canvas) canvas.style.cursor = '';
    };
  }, [map, layerId]);
}
