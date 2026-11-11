import { useEffect, useRef, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { GPS_GRACE_MS, TRAIL_ZOOM } from '../../config/map.config.js';
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  SEARCH_DELAY_MS,
} from '../../config/trails.config.js';
import { useAuth } from '../../context/useAuth.js';
import {
  completeTrail,
  getCompletedTrails,
  getNearbyTrails,
  getSavedTrails,
  saveTrail,
  uncompleteTrail,
  unsaveTrail,
} from '../../services/trailsService.js';
import { DIFFICULTIES } from './difficulty.js';
import { CloseIcon, MapPinIcon } from './icons.jsx';
import TrailCard from './TrailCard.jsx';
import styles from './NearbyPanel.module.css';
import { NARROW_SCREEN_WIDTH } from '../../config/theme.js';

// Tag for map movements made by the panel.
// MapLibre passes it to the events, so we know the search must not restart.
const FROM_PANEL = { fromNearbyPanel: true };


// Moves the map to the trail.
function flyToTrail(map, trail) {
  map.jumpTo({}, FROM_PANEL);
  map.flyTo({ center: trail.start, zoom: TRAIL_ZOOM, essential: true }, FROM_PANEL);
}

// Map center rounded to 3 decimals:
// small movements, for example the GPS updating, do not repeat the search.
function readCenter(map) {
  const { lng, lat } = map.getCenter();
  return { lng: Number(lng.toFixed(3)), lat: Number(lat.toFixed(3)) };
}

// Sentence under the title: search in progress, error, no results or how many trails there are.
function statusMessage(search, shownCount) {
  if (search.status === 'loading') return 'Searching for trails...';
  if (search.status === 'error') return search.error;

  const where = `within ${search.radiusKm} km of the map center`;
  if (search.trails.length === 0) return `No trails ${where}`;
  if (shownCount === 0) return `No trails with the selected difficulty ${where}`;
  return `${shownCount} ${shownCount === 1 ? 'trail' : 'trails'} ${where}`;
}

// "Trails nearby" list on the left of the map: searches for trails within the chosen radius around
// the map center, filters them by difficulty and lets the user save them to the profile.
export default function NearbyPanel({ isOpen = true, onClose }) {
  const { current } = useMap();
  const { authFetch, user } = useAuth();
  const map = current?.getMap();

  const [center, setCenter] = useState(() => (map ? readCenter(map) : null));
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  // Selected difficulties; none selected = all
  const [difficulties, setDifficulties] = useState([]);
  // Result of the last search, with the radius used for it
  const [search, setSearch] = useState({ status: 'loading', trails: [], radiusKm, error: null });
  // Increases when "Try again" is pressed, so the search restarts
  const [retryCount, setRetryCount] = useState(0);
  // Trail clicked in the list: the map flew there and the marker is shown
  const [selectedTrail, setSelectedTrail] = useState(null);
  // Last selection and when it was made
  const selectionRef = useRef(null);
  // IDs of the trails already saved in the profile: their bookmark is filled, even after a new login
  const [savedTrailIds, setSavedTrailIds] = useState(() => new Set());
  // IDs of the trails completed by the user 
  const [completedTrailIds, setCompletedTrailIds] = useState(() => new Set());

  
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    getCompletedTrails(authFetch)
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setCompletedTrailIds(new Set(data.map((item) => item.trail_id)));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authFetch, user]);

  // Loads the trails saved by the logged-in user (at every login or user change)
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;
    getSavedTrails(authFetch)
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setSavedTrailIds(new Set(data.map((item) => item.trail_id)));
        }
      })
      // If the list does not arrive the bookmarks stay empty, but saving still works
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authFetch, user]);

  // Saves the trail and adds it to the saved ones, so the bookmark stays filled
  // even if the card is recreated (for example after a new search)
  async function handleSave(trailId) {
    const result = await saveTrail(authFetch, trailId);
    setSavedTrailIds((prev) => new Set(prev).add(trailId));
    return result;
  }

  // Removes the trail from the saved ones, so the bookmark stays empty even if the card is recreated
  async function handleUnsave(trailId) {
    await unsaveTrail(authFetch, trailId);
    setSavedTrailIds((prev) => {
      const next = new Set(prev);
      next.delete(trailId);
      return next;
    });
  }

  const handleToggleComplete = async (trailId, targetDone) => {
    if (targetDone) {
      await completeTrail(authFetch, trailId);
      setCompletedTrailIds((prev) => new Set([...prev, trailId]));
    } else {
      await uncompleteTrail(authFetch, trailId);
      setCompletedTrailIds((prev) => {
        const next = new Set(prev);
        next.delete(trailId);
        return next;
      });
    }
  };

  // When the map stops, updates the search center
  useEffect(() => {
    if (!map) return undefined;

    const onMoveEnd = (event) => {
      // After clicking a trail the list stays as it is: the search runs again only when the user moves the map
      if (event?.fromNearbyPanel) return;

      // The first GPS position can arrive after the click and move the map to the user
      const selection = selectionRef.current;
      if (event?.geolocateSource && selection && !selection.restored && Date.now() - selection.at < GPS_GRACE_MS) {
        selection.restored = true;
        flyToTrail(map, selection.trail);
        return;
      }

      const next = readCenter(map);
      // If the rounded center does not change we keep the same object: the search does not restart
      setCenter((prev) => (prev?.lng === next.lng && prev?.lat === next.lat ? prev : next));
    };

    map.on('moveend', onMoveEnd);
    return () => map.off('moveend', onMoveEnd);
  }, [map]);

  // Searches for trails when the center or radius changes
  useEffect(() => {
    if (!isOpen || !center) return undefined;
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
  }, [authFetch, center, radiusKm, retryCount, isOpen]);

  // Click on a trail: the map flies to its starting point, where the marker appears
  function showOnMap(trail) {
    setSelectedTrail(trail);
    selectionRef.current = { trail, at: Date.now(), restored: false };
    if (map) flyToTrail(map, trail);

    // On narrow screens the list covers half the map: we close it to show the place
    if (window.matchMedia?.(NARROW_SCREEN_WIDTH)?.matches) onClose?.();
  }

  function toggleDifficulty(value) {
    setDifficulties((selected) =>
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
    );
  }

  // The difficulty filter works on the results already received, without new requests
  const shownTrails = difficulties.length === 0
    ? search.trails
    : search.trails.filter((trail) => difficulties.includes(trail.difficulty));

  // Grey placeholders until the first response arrives
  const showSkeletons = search.status === 'loading' && search.trails.length === 0;

  return (
    <>
      {selectedTrail?.start && (
        <Marker longitude={selectedTrail.start[0]} latitude={selectedTrail.start[1]} anchor="bottom">
          <MapPinIcon className={styles.pin} />
        </Marker>
      )}

            {isOpen && (
        <section className={styles.panel} aria-labelledby="nearby-title">
          <div className={styles.header}>
            <h2 id="nearby-title">Trails nearby</h2>
            <p role="status" className={`${styles.status} ${search.status === 'error' ? styles.statusError : ''}`}>
              {statusMessage(search, shownTrails.length)}
            </p>
            <button
              type="button"
              className={styles.toggle}
              aria-label="Close trail list"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>

          <div className={styles.content}>
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
                    isSaved={Boolean(user && savedTrailIds.has(trail.id))}
                    isCompleted={Boolean(user && completedTrailIds.has(trail.id))}
                    onToggleComplete={handleToggleComplete}
                    onComplete={(id) => handleToggleComplete(id, true)}
                    onUncomplete={(id) => handleToggleComplete(id, false)}
                    onSave={handleSave}
                    onUnsave={handleUnsave}
                    onSelect={showOnMap}
                    isSelected={trail.id === selectedTrail?.id}
                  />
                </li>
              ))}
            </ul>
          </div>
          </div>
        </section>
      )}
    </>
  );
}