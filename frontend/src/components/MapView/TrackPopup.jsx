import { useEffect, useRef } from 'react';
import { Popup, useMap } from 'react-map-gl/maplibre';
import { getPanOffset } from '../../utils/panToFit.js';
import './TrackPopup.css';

function formatDistance(meters) {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function formatMeters(value) {
  return `${Math.round(value)} m`;
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { dateStyle: 'long' });
}

// Distanza minima tra il popup e il bordo della mappa dopo lo spostamento
const EDGE_MARGIN = 12;

// Piccola scheda con i dettagli di un percorso, attaccata al punto cliccato sulla mappa.
// "stats" arriva da getTrackStats() e "lngLat" è il punto del click: se manca uno dei due non compare.
// Si chiude con la X o con Esc. Se esce dal riquadro della mappa, la mappa scorre quanto basta per mostrarla tutta.
export default function TrackPopup({ stats, lngLat, onClose }) {
  const { current: map } = useMap();
  const popupRef = useRef(null);

  useEffect(() => {
    if (!stats) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [stats, onClose]);

  // A ogni nuovo click misura il popup e, se esce dal riquadro, sposta la mappa.
  // Il popup si muove insieme alla mappa, quindi basta calcolarlo una volta sola.
  useEffect(() => {
    if (!map || !stats || !lngLat) return undefined;

    // Aspetta che il popup sia stato disegnato per misurarlo
    const frame = requestAnimationFrame(() => {
      const element = popupRef.current?.getElement();
      if (!element) return;

      const [x, y] = getPanOffset(
        element.getBoundingClientRect(),
        map.getContainer().getBoundingClientRect(),
        EDGE_MARGIN
      );
      if (x !== 0 || y !== 0) map.panBy([x, y], { duration: 300 });
    });

    return () => cancelAnimationFrame(frame);
  }, [map, stats, lngLat]);

  if (!stats || !lngLat) return null;

  // Data e attività, se il file le contiene
  const subtitle = [stats.startTime && formatDate(stats.startTime), stats.activity].filter(Boolean).join(' · ');

  // Solo i dettagli che il file contiene davvero
  const rows = [
    ['Distance', formatDistance(stats.distance)],
    ['Total time', stats.duration != null && formatDuration(stats.duration)],
    ['Ascent', stats.ascent != null && formatMeters(stats.ascent)],
    ['Descent', stats.descent != null && formatMeters(stats.descent)],
    ['Highest point', stats.maxAltitude != null && formatMeters(stats.maxAltitude)],
    ['Lowest point', stats.minAltitude != null && formatMeters(stats.minAltitude)],
  ].filter(([, value]) => value);

  return (
    <Popup
      ref={popupRef}
      longitude={lngLat.lng}
      latitude={lngLat.lat}
      // Sempre sopra il punto cliccato: MapLibre non cambia lato mentre la mappa scorre
      anchor="bottom"
      offset={12}
      maxWidth="280px"
      // La X e Esc bastano: un clic altrove sulla mappa non deve chiuderla
      closeOnClick={false}
      closeButton
      onClose={onClose}
      className="track-popup"
    >
      <div role="group" aria-labelledby="track-popup-title">
        <h2 id="track-popup-title">{stats.name}</h2>
        {subtitle && <p className="track-popup-subtitle">{subtitle}</p>}
        <dl className="track-popup-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Popup>
  );
}
