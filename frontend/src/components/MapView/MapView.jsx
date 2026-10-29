import { useRef } from 'react';
import { setWorkerUrl } from 'maplibre-gl';
import Map, {
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre';

import workerUrl from
  'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
  DEFAULT_MAP_SETTINGS,
  HIDDEN_BASE_LAYERS,
  MAP_BASE_STYLES,
  MAPTILER_API_KEY,
} from '../../config/map.config.js';
import { hideLayers } from '../../map/hideLayers.js';
import UserLocationControl from './UserLocationControl.jsx';

import styles from './MapView.module.css';

setWorkerUrl(workerUrl);

// Starting view in the right format for react map gl "ricentra"(recenter) comes back here
const [longitude, latitude] = DEFAULT_MAP_SETTINGS.center;
const HOME_VIEW = {
  longitude,
  latitude,
  zoom: DEFAULT_MAP_SETTINGS.zoom,
  pitch: DEFAULT_MAP_SETTINGS.pitch,
  bearing: 0, 
};

//function that ACTUALLY hides the layers in HIDDEN_BASE_LAYERS (see map/hideLayers.js).
const hideBaseLayers = hideLayers(HIDDEN_BASE_LAYERS);

// the actual map, baseStyleId chooses the base map. 
// The children (Source, Layer, Popup, panels...) go inside <Map> and there they can use useMap() from react-map-gl. 
// so you can use it to add your own layers, popups, etc. on top of the base map.

export default function MapView({ baseStyleId = MAP_BASE_STYLES[0].id, children }) {
  const mapRef = useRef(null);
  const baseStyle = MAP_BASE_STYLES.find((style) => style.id === baseStyleId) ?? MAP_BASE_STYLES[0];

  if (!MAPTILER_API_KEY) {
    return (
      <p>
        Errore nel caricamento della mappa.
      </p>
    );
  }

  // Torna alla vista iniziale.
  const recenterMap = () => {
    const map = mapRef.current;
    if (!map) return;

    // If the location button is following the user, "unlock" it first.
    // MapLibre stops following only after a move without zoom, and this empty
    // jumpTo is one: the dot stays, but the map no longer chases the GPS.
    // Without it, the next GPS update would pull the map back to the user.
    map.jumpTo({});

    map.easeTo({
      center: [HOME_VIEW.longitude, HOME_VIEW.latitude],
      zoom: HOME_VIEW.zoom,
      pitch: HOME_VIEW.pitch,
      bearing: HOME_VIEW.bearing,
      duration: 1000, // 1 second, we can try to modify this
    });
  };

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.map} aria-label="Map">
        <Map
          ref={mapRef}
          initialViewState={HOME_VIEW}
          maxPitch={DEFAULT_MAP_SETTINGS.maxPitch}
          mapStyle={baseStyle.url}
          transformStyle={hideBaseLayers}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Pulsanti +, − e bussola. */}
          <NavigationControl position="bottom-right" showZoom showCompass visualizePitch />
          <UserLocationControl />
          <ScaleControl position="bottom-left" maxWidth={100} unit="metric" />
          {children}
        </Map>
      </div>

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