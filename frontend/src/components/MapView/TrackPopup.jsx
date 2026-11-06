import { useEffect, useRef } from 'react';
import { Popup, useMap } from 'react-map-gl/maplibre';
import { getPanOffset } from '../../utils/panToFit.js';
import TrailDetailsLink from '../TrailPage/TrailDetailsLink.jsx';
import './TrackPopup.css';

function formatDistance(meters) {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(totalMinutes) {
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function formatMeters(value) {
  return `${Math.round(value)} m`;
}

// "trail_running" -> "trail running"
function formatType(type) {
  return type.replaceAll('_', ' ');
}

// Distanza minima tra il popup e il bordo della mappa dopo lo spostamento
const EDGE_MARGIN = 12;

// Piccola scheda con i dettagli di un sentiero, attaccata al suo punto di partenza sulla mappa.
// "trail" sono le proprietà del sentiero restituite da /api/trails e "lngLat" è il suo punto di partenza: se manca uno dei due non compare.
// Si chiude con la X o con Esc. Se esce dal riquadro della mappa, la mappa scorre quanto basta per mostrarla tutta.
export default function TrackPopup({ trail, lngLat, onClose }) {
  const { current: map } = useMap();
  const popupRef = useRef(null);

  useEffect(() => {
    if (!trail) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [trail, onClose]);

  // A ogni nuovo click misura il popup e, se esce dal riquadro, sposta la mappa.
  // Il popup si muove insieme alla mappa, quindi basta calcolarlo una volta sola.
  useEffect(() => {
    if (!map || !trail || !lngLat) return undefined;

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
  }, [map, trail, lngLat]);

  if (!trail || !lngLat) return null;

  // Solo i dettagli che il sentiero ha davvero
  const rows = [
    ['Distance', trail.lengthM != null && formatDistance(trail.lengthM)],
    ['Est. time', trail.estDurationMin != null && formatDuration(trail.estDurationMin)],
    ['Ascent', trail.ascentM != null && formatMeters(trail.ascentM)],
    ['Descent', trail.descentM != null && formatMeters(trail.descentM)],
    ['Highest point', trail.maxElevationM != null && formatMeters(trail.maxElevationM)],
    ['Difficulty', trail.difficulty],
  ].filter(([, value]) => value);

  return (
    <Popup
      ref={popupRef}
      longitude={lngLat.lng}
      latitude={lngLat.lat}
      // Sempre sopra il punto di partenza: MapLibre non cambia lato mentre la mappa scorre
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
        <h2 id="track-popup-title">{trail.name}</h2>
        {trail.trailType && <p className="track-popup-subtitle">{formatType(trail.trailType)}</p>}
        {trail.description && <p className="track-popup-description">{trail.description}</p>}
        <dl className="track-popup-grid">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
               </dl>
        {/* Opens the page of the trail, with map, profile and all the details */}
        <TrailDetailsLink trailId={trail.id} className="track-popup-details">
          View trail details 
        </TrailDetailsLink>
      </div>
    </Popup>
  );
}
