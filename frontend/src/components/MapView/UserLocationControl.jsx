import { useEffect } from 'react';
import { GeolocateControl } from 'maplibre-gl';
import { useMap } from 'react-map-gl/maplibre';

// User position button, bottom-right of the map.
// Starts on load and follows the user if they move, until the user moves the map (then it stops following).

export default function UserLocationControl() {
  const { current } = useMap();

  useEffect(() => {
    const map = current?.getMap();
    if (!map) return undefined;

    const control = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(control, 'bottom-right');

    // This is when he asks for the user's location, which is what we want to do on load.
    const start = () => control.trigger();
    if (map.loaded()) start();
    else map.once('load', start);

    return () => {
      map.off('load', start);
      map.removeControl(control);
    };
  }, [current]);

  return null;
}