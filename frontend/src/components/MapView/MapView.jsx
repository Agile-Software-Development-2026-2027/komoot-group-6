import { useEffect, useRef, useState } from 'react';
import {
  GeolocateControl,
  Map as LibreMap,
  NavigationControl,
  setWorkerUrl,
  ScaleControl,
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
  const mapRef = useRef(null);
const [homeView, setHomeView] = useState(null);

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

    mapRef.current = map;

setHomeView({
  center: map.getCenter().toArray(),
  zoom: map.getZoom(),
  bearing: map.getBearing(),
  pitch: map.getPitch(),
});

    // Pulsanti +, − e bussola.
    map.addControl(new NavigationControl({
    showZoom: true,
    showCompass: true,
    visualizePitch: true,
  }), 'bottom-right');

    const geolocate = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, 'bottom-right');

map.addControl(
  new ScaleControl({
    maxWidth: 100,
    unit: 'metric',
  }),
  'bottom-left'
);

//layers to hide
map.on('style.load', () => {
  const layersToHide = [
    // Administrative boundaries
    'Other border',
    'Disputed border',
    'Country border',

    // Colored hiking trails
    'Purple trail',
    'Orange trail',
    'Red trail',
    'Yellow trail',
    'Green trail',
    'Blue trail',
    'Brown trail',
    'Black trail',

    // Cycling routes
    'Bicycle local',
    'Bicycle longdistance',

    // Other trail routes
    'Longdistance trail',
    'Longdistance trail outline',
  ];

  layersToHide.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        'visibility',
        'none'
      );

      console.log('Hidden:', layerId);
    }
  });
});


    map.on('load', () => { 
      geolocate.trigger(); // pos all avvio

    });

    // Libera la mappa quando si cambia pagina.
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Add the Re-center button
    const recenterMap = () => {
  if (!mapRef.current || !homeView) return;

  mapRef.current.easeTo({
    ...homeView,
    duration: 1000,
  });
};

  if (!MAPTILER_API_KEY) {
    return (
      <p>
        Errore nel caricamento della mappa.
      </p>
    );
  }

 /*  return (
    <div
      ref={containerRef}
      className={styles.map}
      aria-label="Map"
    />
  ); */
  return (
  
<div className={styles.mapWrapper}>
  <div
    ref={containerRef}
    className={styles.map}
    aria-label="Map"
  />

  <button
    type="button"
    className={styles.recenterButton}
    onClick={recenterMap}
    title="Re-center map"
    aria-label="Re-center map"
  >
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Four corners */}
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />

      {/* Center plus */}
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  </button>
</div>

);
}