import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import MapView from '../components/MapView/MapView.jsx';
import TrackLayer from '../components/MapView/TrackLayer.jsx';
import TrackPopup from '../components/MapView/TrackPopup.jsx';
import TrailStartsLayer from '../components/MapView/TrailStartsLayer.jsx';
import NearbyPanel from '../components/NearbyPanel/NearbyPanel.jsx';
import SideMenu from '../components/SideMenu.jsx';
import { useLayerEvents } from '../map/useLayerEvents.js';
import { getTrail, getTrailsInBounds } from '../services/trailsService.js';
import './HomePage.css';

// Attesa dopo l'ultimo spostamento della mappa prima di chiedere i sentieri dell'area
const BOUNDS_DEBOUNCE_MS = 300;

// Tiene aggiornati i sentieri dell'area visibile: li chiede all'avvio e a ogni spostamento della mappa.
// Va messo dentro <MapView> per poter usare useMap().
function TrailsInView({ onLoad }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return undefined;

    let timer;
    // Numero dell'ultima richiesta: le risposte più vecchie vengono scartate
    let lastRequest = 0;

    const load = () => {
      const request = ++lastRequest;
      getTrailsInBounds(map.getBounds().toArray().flat())
        .then((trails) => {
          if (request === lastRequest) onLoad(trails);
        })
        // Backend spento o errore: restano i sentieri già mostrati.
        .catch(() => {});
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(load, BOUNDS_DEBOUNCE_MS);
    };

    schedule();
    map.on('moveend', schedule);
    return () => {
      clearTimeout(timer);
      lastRequest += 1;
      map.off('moveend', schedule);
    };
  }, [map, onLoad]);

  return null;
}

// Centra la mappa sul percorso (una Feature con una LineString) e, a fine movimento, chiama onDone.
// Se il percorso non ha linee da inquadrare chiama subito onDone.
function FitToTrack({ data, onDone }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !data) return undefined;

    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    const extend = ([lng, lat]) => {
      bounds[0] = Math.min(bounds[0], lng);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lng);
      bounds[3] = Math.max(bounds[3], lat);
    };
    const { type, coordinates } = data.geometry ?? {};
    if (type === 'LineString') coordinates.forEach(extend);
    if (type === 'MultiLineString') coordinates.flat().forEach(extend);

    if (!Number.isFinite(bounds[0])) {
      onDone();
      return undefined;
    }

    map.once('moveend', onDone);
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 40, duration: 800 });
    return () => map.off('moveend', onDone);
  }, [map, data, onDone]);

  return null;
}

// Chiama onSelect quando si clicca su un punto di partenza (layer di TrailStartsLayer).
function TrailClick({ onSelect }) {
  useLayerEvents('trail-starts', { onClick: onSelect });
  return null;
}

// Homepage: menu laterale e mappa in un riquadro.
// I componenti che disegnano sulla mappa (sentieri, pannelli, popup)
// vanno aggiunti come children di <MapView>.
export default function HomePage() {
  // FeatureCollection dei punti di partenza dell'area visibile
  const [trails, setTrails] = useState(null);
  // { id, lngLat, properties } del sentiero cliccato, null se nessuno
  const [selected, setSelected] = useState(null);
  // Feature con il percorso completo del sentiero selezionato
  const [route, setRoute] = useState(null);
  // Il popup si apre quando la mappa ha finito di inquadrare il percorso
  const [popupOpen, setPopupOpen] = useState(false);
  const selectedIdRef = useRef(null);

  const handleSelect = useCallback(
    (feature) => {
      const trail = trails?.features.find((item) => item.properties.id === feature.properties?.id);
      if (!trail) return;

      const [lng, lat] = trail.geometry.coordinates;
      const { id } = trail.properties;
      selectedIdRef.current = id;
      setSelected({ id, lngLat: { lng, lat }, properties: trail.properties });
      setRoute(null);
      setPopupOpen(false);

      getTrail(id)
        .then((detail) => {
          if (selectedIdRef.current === id) setRoute(detail);
        })
        // Percorso non scaricabile: i dettagli si vedono comunque.
        .catch(() => {
          if (selectedIdRef.current === id) setPopupOpen(true);
        });
    },
    [trails]
  );

  const handleClose = useCallback(() => {
    selectedIdRef.current = null;
    setSelected(null);
    setRoute(null);
    setPopupOpen(false);
  }, []);

  const handleFitted = useCallback(() => setPopupOpen(true), []);

  return (
    <main className="home">
      <h1 className="visually-hidden">Home</h1>
      <SideMenu />
      <section className="home-map" aria-label="Map">
        <MapView>
          <TrailsInView onLoad={setTrails} />
          <TrailStartsLayer data={trails} />
          {trails && <TrailClick onSelect={handleSelect} />}
          <TrackLayer data={route} />
          <FitToTrack data={route} onDone={handleFitted} />
          <TrackPopup
            trail={popupOpen ? selected?.properties : null}
            lngLat={selected?.lngLat}
            onClose={handleClose}
          />
          {/* Sentieri vicini al centro della mappa, con filtri e salvataggio nel profilo */}
          <NearbyPanel />
        </MapView>
      </section>
    </main>
  );
}
