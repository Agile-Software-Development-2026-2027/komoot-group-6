import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import MapView from '../components/MapView/MapView.jsx';
import TrackLayer from '../components/MapView/TrackLayer.jsx';
import TrackPopup from '../components/MapView/TrackPopup.jsx';
import SideMenu from '../components/SideMenu.jsx';
import { useLayerEvents } from '../map/useLayerEvents.js';
import { getTrackStats } from '../utils/trackStats.js';
import './HomePage.css';

// Percorso provvisorio: finché non c'è l'upload dal frontend, si legge un GeoJSON
// salvato in frontend/public/track.geojson (vedi la risposta di POST /api/gpx/parse).
const TRACK_URL = '/track.geojson';

// Centra la mappa sul percorso. Va messo dentro <MapView> per poter usare useMap().
function FitToTrack({ data }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map || !data) return;

    const bounds = [Infinity, Infinity, -Infinity, -Infinity];
    const extend = ([lng, lat]) => {
      bounds[0] = Math.min(bounds[0], lng);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lng);
      bounds[3] = Math.max(bounds[3], lat);
    };
    for (const feature of data.features ?? []) {
      const { type, coordinates } = feature.geometry ?? {};
      if (type === 'LineString') coordinates.forEach(extend);
      if (type === 'MultiLineString') coordinates.flat().forEach(extend);
    }
    if (!Number.isFinite(bounds[0])) return;

    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 40, duration: 800 });
  }, [map, data]);

  return null;
}

// Chiama onSelect quando si clicca sul percorso (usa il layer invisibile di TrackLayer).
function TrackClick({ onSelect }) {
  useLayerEvents('track-hit', { onClick: onSelect });
  return null;
}

// Homepage: menu laterale e mappa in un riquadro.
// I componenti che disegnano sulla mappa (tracce GPX, pannelli, popup)
// vanno aggiunti come children di <MapView>.
export default function HomePage() {
  const [track, setTrack] = useState(null);
  // { name, lngLat } del percorso cliccato, null se nessuno (il nome può mancare nel file)
  const [selected, setSelected] = useState(null);

  // MapLibre restituisce le proprietà della feature cliccata già semplificate (gli oggetti annidati
  // diventano stringhe): per i dettagli si riparte dalla feature originale, cercata per nome.
  const stats = useMemo(() => {
    if (!selected) return null;
    const features = track?.features ?? [];
    const feature = features.find((f) => f.properties?.name === selected.name) ?? features[0];
    return feature ? getTrackStats(feature) : null;
  }, [track, selected]);

  const handleSelect = useCallback(
    (feature, event) => setSelected({ name: feature.properties?.name, lngLat: event.lngLat }),
    []
  );
  const handleClose = useCallback(() => setSelected(null), []);

  useEffect(() => {
    let cancelled = false;
    fetch(TRACK_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setTrack(data);
      })
      // Nessun file o file non valido: la mappa resta senza percorso.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="home">
      <h1 className="visually-hidden">Home</h1>
      <SideMenu />
      <section className="home-map" aria-label="Map">
        <MapView>
          <TrackLayer data={track} />
          <FitToTrack data={track} />
          {track && <TrackClick onSelect={handleSelect} />}
          <TrackPopup stats={stats} lngLat={selected?.lngLat} onClose={handleClose} />
        </MapView>
      </section>
    </main>
  );
}
