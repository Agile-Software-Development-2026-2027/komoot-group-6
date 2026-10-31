import { useEffect, useRef, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { useAuth } from '../../context/useAuth.js';
import { getNearbyTrails, saveTrail } from '../../services/trailService.js';
import { DIFFICULTIES } from './difficulty.js';
import { ChevronIcon, MapPinIcon } from './icons.jsx';
import TrailCard from './TrailCard.jsx';
import styles from './NearbyPanel.module.css';

// Raggio di ricerca in km: minimo, massimo e valore iniziale dello slider.
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const DEFAULT_RADIUS_KM = 25;

// Attesa prima di cercare: mentre si trascina lo slider o la mappa non parte una richiesta a ogni passo
const SEARCH_DELAY_MS = 400;

// Zoom quando la mappa vola su un sentiero scelto dalla lista: si vede la zona attorno (qualche km)
const TRAIL_ZOOM = 13;

// Per quanto tempo dopo il click la scelta vince sul GPS
const GPS_GRACE_MS = 15000;

// Etichetta dei movimenti della mappa fatti dal pannello.
// MapLibre la passa agli eventi, così sappiamo che non deve ripartire la ricerca.
const FROM_PANEL = { fromNearbyPanel: true };
const NARROW_SCREEN = '(max-width: 720px)';

// Porta la mappa sul sentiero.
function flyToTrail(map, trail) {
  map.jumpTo({}, FROM_PANEL);
  map.flyTo({ center: trail.start, zoom: TRAIL_ZOOM, essential: true }, FROM_PANEL);
}

// Centro della mappa arrotondato a 3 decimali
// i piccoli spostamenti, per esempio il GPS che si aggiorna, non rifanno la ricerca.
function readCenter(map) {
  const { lng, lat } = map.getCenter();
  return { lng: Number(lng.toFixed(3)), lat: Number(lat.toFixed(3)) };
}

// Frase sotto il titolo: ricerca in corso, errore, nessun risultato o quanti sentieri ci sono.
function statusMessage(search, shownCount) {
  if (search.status === 'loading') return 'Searching for trails...';
  if (search.status === 'error') return search.error;

  const where = `within ${search.radiusKm} km of the map center`;
  if (search.trails.length === 0) return `No trails ${where}`;
  if (shownCount === 0) return `No trails with the selected difficulty ${where}`;
  return `${shownCount} ${shownCount === 1 ? 'trail' : 'trails'} ${where}`;
}

// Lista "Trails nearby" a sinistra della mappa: cerca i sentieri entro il raggio scelto attorno
// al centro della mappa, li filtra per difficoltà e permette di salvarli nel profilo.
export default function NearbyPanel() {
  const { current } = useMap();
  const { authFetch } = useAuth();
  const map = current?.getMap();

  const [center, setCenter] = useState(() => (map ? readCenter(map) : null));
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  // Difficoltà selezionate; nessuna selezionata = tutte
  const [difficulties, setDifficulties] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  // Risultato dell'ultima ricerca, con il raggio usato per farla
  const [search, setSearch] = useState({ status: 'loading', trails: [], radiusKm, error: null });
  // Aumenta quando si preme "Try again", così la ricerca riparte
  const [retryCount, setRetryCount] = useState(0);
  // Sentiero cliccato nella lista: la mappa è volata lì e c'è il segnaposto
  const [selectedTrail, setSelectedTrail] = useState(null);
  // Ultima scelta e quando è stata fatta
  const selectionRef = useRef(null);

  // Quando la mappa si ferma aggiorna il centro della ricerca
  useEffect(() => {
    if (!map) return undefined;

    const onMoveEnd = (event) => {
      // Dopo il click su un sentiero la lista resta com'è: si rifà la ricerca solo quando l'utente sposta la mappa
      if (event?.fromNearbyPanel) return;

      // La prima posizione GPS può arrivare dopo il click e spostare la mappa sull'utente
      const selection = selectionRef.current;
      if (event?.geolocateSource && selection && !selection.restored && Date.now() - selection.at < GPS_GRACE_MS) {
        selection.restored = true;
        flyToTrail(map, selection.trail);
        return;
      }

      const next = readCenter(map);
      // Se il centro arrotondato non cambia teniamo lo stesso oggetto: la ricerca non riparte
      setCenter((prev) => (prev?.lng === next.lng && prev?.lat === next.lat ? prev : next));
    };

    map.on('moveend', onMoveEnd);
    return () => map.off('moveend', onMoveEnd);
  }, [map]);

  // Cerca i sentieri quando cambiano centro o raggio
  useEffect(() => {
    if (!center) return undefined;
    // Diventa true se nel frattempo parte una ricerca più recente: il risultato vecchio si scarta
    let outdated = false;

    const timer = setTimeout(async () => {
      setSearch((prev) => ({ ...prev, status: 'loading' }));
      try {
        const trails = await getNearbyTrails(authFetch, { ...center, radiusKm });
        if (!outdated) setSearch({ status: 'ready', trails, radiusKm, error: null });
      } catch (err) {
        if (!outdated) setSearch({ status: 'error', trails: [], radiusKm, error: err.message });
      }
    }, SEARCH_DELAY_MS);

    return () => {
      outdated = true;
      clearTimeout(timer);
    };
  }, [authFetch, center, radiusKm, retryCount]);

  // Click su un sentiero: la mappa vola al suo punto di partenza, dove compare il segnaposto
  function showOnMap(trail) {
    setSelectedTrail(trail);
    selectionRef.current = { trail, at: Date.now(), restored: false };
    if (map) flyToTrail(map, trail);

    // Su schermi stretti la lista copre metà mappa: la chiudiamo per far vedere il posto
    if (window.matchMedia?.(NARROW_SCREEN)?.matches) setIsOpen(false);
  }

  function toggleDifficulty(value) {
    setDifficulties((selected) =>
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    );
  }

  // Il filtro per difficoltà lavora sui risultati già arrivati, senza nuove richieste
  const shownTrails = difficulties.length === 0
    ? search.trails
    : search.trails.filter((trail) => difficulties.includes(trail.difficulty));

  // Segnaposto grigi finché arriva la prima risposta
  const showSkeletons = search.status === 'loading' && search.trails.length === 0;

  return (
    <>
      {selectedTrail?.start && (
        <Marker longitude={selectedTrail.start[0]} latitude={selectedTrail.start[1]} anchor="bottom">
          <MapPinIcon className={styles.pin} />
        </Marker>
      )}

      <section className={`${styles.panel} ${isOpen ? '' : styles.collapsed}`} aria-labelledby="nearby-title">
        <div className={styles.header}>
          <h2 id="nearby-title">Trails nearby</h2>
          <p role="status" className={`${styles.status} ${search.status === 'error' ? styles.statusError : ''}`}>
            {statusMessage(search, shownTrails.length)}
          </p>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={isOpen}
            aria-controls="nearby-content"
            aria-label={isOpen ? 'Hide trail list' : 'Show trail list'}
            onClick={() => setIsOpen((open) => !open)}
          >
            <ChevronIcon up={isOpen} />
          </button>
        </div>

        <div id="nearby-content" className={styles.content} hidden={!isOpen}>
          <div className={styles.filters}>
            <div className={styles.radius}>
              <label htmlFor="nearby-radius">Search radius</label>
              <span aria-hidden="true">{radiusKm} km</span>
              <input
                id="nearby-radius"
                type="range"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={1}
                value={radiusKm}
                aria-valuetext={`${radiusKm} km`}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
              />
            </div>

            <fieldset className={styles.chips}>
              <legend className="visually-hidden">Difficulty</legend>
              {DIFFICULTIES.map(({ value, label }) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    value={value}
                    checked={difficulties.includes(value)}
                    onChange={() => toggleDifficulty(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>

          <div className={styles.results}>
            {search.status === 'error' && (
              <button type="button" className={styles.retry} onClick={() => setRetryCount((count) => count + 1)}>
                Try again
              </button>
            )}

            {showSkeletons && (
              <div className={styles.list} aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={styles.skeleton}>
                    <div className={styles.skeletonCover} />
                    <div className={styles.skeletonLine} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                  </div>
                ))}
              </div>
            )}

            <ul className={styles.list} aria-label="Nearby trails">
              {shownTrails.map((trail) => (
                <li key={trail.id}>
                  <TrailCard
                    trail={trail}
                    onSave={(trailId) => saveTrail(authFetch, trailId)}
                    onSelect={showOnMap}
                    isSelected={trail.id === selectedTrail?.id}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
