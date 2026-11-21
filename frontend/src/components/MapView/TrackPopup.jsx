import { useEffect, useRef, useState } from 'react';
import { trailImageUrl } from '../../utils/trailImages.js';
import { Popup, useMap } from 'react-map-gl/maplibre';
import { EDGE_MARGIN, POPUP_PAN_DURATION_MS } from '../../config/map.config.js';
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

// Piccola scheda con i dettagli di un sentiero, attaccata al suo punto di partenza sulla mappa.
// "trail" sono le proprietà del sentiero restituite da /api/trails e "lngLat" è il suo punto di partenza: se manca uno dei due non compare.
// Si chiude con la X o con Esc. Se esce dal riquadro della mappa, la mappa scorre quanto basta per mostrarla tutta.
export default function TrackPopup({ trail, lngLat, onClose }) {
  const { current: map } = useMap();
  const popupRef = useRef(null);

  //state in case there is no image for the trail
  const [imageError, setImageError] = useState(false);
  const imageUrl = !imageError && (trail?.imageUrl || trailImageUrl(trail?.name));


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
      if (x !== 0 || y !== 0) map.panBy([x, y], { duration: POPUP_PAN_DURATION_MS });
    });

    return () => cancelAnimationFrame(frame);
  }, [map, trail, lngLat]);

  if (!trail || !lngLat) return null;

  // Solo i dettagli che il sentiero ha davvero
  const stats = [
    { label: 'Distance', value: trail.lengthM != null && formatDistance(trail.lengthM) },
    { label: 'Est. time', value: trail.estDurationMin != null && formatDuration(trail.estDurationMin) },
    { label: 'Ascent', value: (trail.ascentM ?? trail.elevationGainM) != null && formatMeters(trail.ascentM ?? trail.elevationGainM) },
  ].filter((item) => item.value);

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
    >      <div className="track-popup-card">
        {/* Immagine di copertina */}
        {imageUrl ? (
          <div className="track-popup-image-container">
            <img
              src={imageUrl}
              alt=""
              className="track-popup-image"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="track-popup-image-placeholder" aria-hidden="true" />
        )}

        <div className="track-popup-body">
          <div className="track-popup-header">
            <h2 id="track-popup-title" className="track-popup-title">
              {trail.name}
            </h2>
            {trail.difficulty && (
              <span className="track-popup-badge" title="Difficulty">
                {trail.difficulty}
              </span>
            )}
          </div>

          {trail.trailType && (
            <p className="track-popup-subtitle">{formatType(trail.trailType)}</p>
          )}

          {/* Statistiche essenziali */}
          {stats.length > 0 && (
            <div className="track-popup-stats">
              {stats.map(({ label, value }) => (
                <div key={label} className="track-popup-stat-item">
                  <span className="track-popup-stat-label">{label}</span>
                  <span className="track-popup-stat-value">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Link alla pagina completa del sentiero */}
          <TrailDetailsLink trailId={trail.id} className="track-popup-details">
            View trail details &rarr;
          </TrailDetailsLink>
        </div>
      </div>
    </Popup>
  );
}
