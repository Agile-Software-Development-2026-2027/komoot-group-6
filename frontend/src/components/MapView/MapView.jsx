import { useEffect, useRef } from 'react';
import {
  GeolocateControl,
  Map as LibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl';

import workerUrl from
  'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
  DEFAULT_MAP_SETTINGS,
  MAPTILER_API_KEY,
} from '../../config/map.config.js';

import styles from './MapView.module.css';

setWorkerUrl(workerUrl);

export default function MapView() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!MAPTILER_API_KEY || !containerRef.current) return;

    const map = new LibreMap({
      ...DEFAULT_MAP_SETTINGS,
      container: containerRef.current,

      // Spostamento e zoom.
      dragPan: true,
      scrollZoom: true,
      touchZoomRotate: true,
    });

    // Pulsanti +, − e bussola.
    map.addControl(new NavigationControl(), 'bottom-right');

    const geolocate = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, 'bottom-right');

    map.on('load', () => { 
      geolocate.trigger(); // pos all avvio
    });
    // Libera la mappa quando si cambia pagina.
    return () => {
      map.remove();
    };
  }, []);

  if (!MAPTILER_API_KEY) {
    return (
      <p>
        Errore nel caricamento della mappa.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.map}
      aria-label="Map"
    />
  );
}