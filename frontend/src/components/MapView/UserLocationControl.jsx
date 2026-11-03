import { useEffect, useRef } from 'react';
import { GeolocateControl, useMap } from 'react-map-gl/maplibre';

// User position button, bottom-right of the map.
// Starts on load and follows the user if they move, until the user moves the map (then it stops following).
// react-map-gl adds and removes the control: when the map is destroyed (e.g. leaving the page)
// MapLibre already removes it, and react-map-gl does not try to remove it a second time.
export default function UserLocationControl() {
  const { current } = useMap();
  const geolocateRef = useRef(null);

  // Ask for the user's location as soon as the map has loaded
  useEffect(() => {
    const map = current?.getMap();
    if (!map) return undefined;

    const start = () => geolocateRef.current?.trigger();
    if (map.loaded()) start();
    else map.once('load', start);

    return () => map.off('load', start);
  }, [current]);

  return (
    <GeolocateControl
      ref={geolocateRef}
      position="bottom-right"
      positionOptions={{ enableHighAccuracy: true }}
      trackUserLocation
      showUserLocation
    />
  );
}