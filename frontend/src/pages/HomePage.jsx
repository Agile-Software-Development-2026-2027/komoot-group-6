import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import MapView from '../components/MapView/MapView.jsx';
import MapToolbar, { ToolbarButton } from '../components/MapView/MapToolbar.jsx';
import TrackLayer from '../components/MapView/TrackLayer.jsx';
import TrackPopup from '../components/MapView/TrackPopup.jsx';
import TrailStartsLayer from '../components/MapView/TrailStartsLayer.jsx';
import NearbyPanel from '../components/NearbyPanel/NearbyPanel.jsx';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../context/useAuth.js';
import ElevationProfile from '../components/ElevationChart/ElevationChart.jsx';
import { CloseIcon, TrailsIcon } from '../components/NearbyPanel/icons.jsx';
import {
  BOUNDS_DEBOUNCE_MS,
  FIT_TRACK_DURATION_MS,
  FIT_TRACK_PADDING,
} from '../config/map.config.js';
import { useLayerEvents } from '../map/useLayerEvents.js';
import { getTrail, getTrailsInBounds } from '../services/trailsService.js';
import { buildElevationProfile } from '../utils/trailStats.js';
import './HomePage.css';

// Keeps the trails of the visible area up to date: it asks for them at start and after every map move.
// It must be placed inside <MapView> so it can use useMap().
function TrailsInView({ onLoad }) {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return undefined;

    let timer;
    // Number of the latest request: older responses are discarded
    let lastRequest = 0;

    const load = () => {
      const request = ++lastRequest;
      getTrailsInBounds(map.getBounds().toArray().flat())
        .then((trails) => {
          if (request === lastRequest) onLoad(trails);
        })
        // Backend down or error: the trails already shown stay.
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

// Centers the map on the route (a Feature with a LineString) and, when the movement ends, calls onDone.
// If the route has no lines to frame it calls onDone right away.
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
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], {
      padding: FIT_TRACK_PADDING,
      duration: FIT_TRACK_DURATION_MS,
    });
    return () => map.off('moveend', onDone);
  }, [map, data, onDone]);

  return null;
}

// Calls onSelect when a start point is clicked (layer of TrailStartsLayer).
function TrailClick({ onSelect }) {
  useLayerEvents('trail-starts', { onClick: onSelect });
  return null;
}

// Map fullscreen view with toolbar, nearby trails panel and elevation profile chart.
// Components that draw on the map (trails, panels, popups)
// are added as children of <MapView>.
export default function HomePage() {
  const { user } = useAuth();
  const name = user?.displayName || user?.username || user?.email || '?';
  // FeatureCollection of the start points of the visible area
  const [trails, setTrails] = useState(null);
  // { id, lngLat, properties } of the clicked trail, null if none
  const [selected, setSelected] = useState(null);
  // Feature with the full route of the selected trail
  const [route, setRoute] = useState(null);
  // The popup opens when the map has finished framing the route
  const [popupOpen, setPopupOpen] = useState(false);
  const selectedIdRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const elevationData = useMemo(() => buildElevationProfile(route), [route]);
    // Panel opened from the map toolbar: only one at a time (null = none)
  const [openPanel, setOpenPanel] = useState(null);
  // The user can hide the elevation chart; it comes back when another trail is selected
  const [elevationOpen, setElevationOpen] = useState(true);

  const handleSelect = useCallback(
    (feature) => {
      const trail = trails?.features.find((item) => item.properties.id === feature.properties?.id);
      if (!trail) return;

      const [lng, lat] = trail.geometry.coordinates;
      const { id } = trail.properties;
      selectedIdRef.current = id;
      setSelected({ id, lngLat: { lng, lat }, properties: trail.properties });
      setRoute(null);
      setHoveredPoint(null);
      setElevationOpen(true);
      setPopupOpen(false);

      getTrail(id)
        .then((detail) => {
          if (selectedIdRef.current === id) setRoute(detail);
        })
        // Route cannot be downloaded: the details are shown anyway.
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
    setHoveredPoint(null);
    setPopupOpen(false);
  }, []);

  const handleFitted = useCallback(() => setPopupOpen(true), []);
  
  // A second click on the same button closes its panel
  const togglePanel = useCallback(
    (name) => setOpenPanel((current) => (current === name ? null : name)),
    []
  );
  const closePanel = useCallback(() => setOpenPanel(null), []);

  // Closing the chart also removes its marker from the map
  const hideElevation = useCallback(() => {
    setElevationOpen(false);
    setHoveredPoint(null);
  }, []);

  return (
    <main className="home">
      <h1 className="visually-hidden">Home</h1>
      {/* Profile icon, top-right: links to the profile page */}
      <Link to="/profile" className="home-profile" aria-label="Profile">
        <Avatar name={name} />
      </Link>
      <section className="home-map" aria-label="Map">
        <MapView>
          <TrailsInView onLoad={setTrails} />
          <TrailStartsLayer data={trails} />
          {trails && <TrailClick onSelect={handleSelect} />}
          <TrackLayer data={route} />
          {hoveredPoint && (
            <Marker
              longitude={hoveredPoint.coordinates[0]}
              latitude={hoveredPoint.coordinates[1]}
              anchor="center"
              color="#16803c"
              style={{ pointerEvents: 'none' }}
            />
          )}
          <FitToTrack data={route} onDone={handleFitted} />
          <TrackPopup
            trail={popupOpen ? selected?.properties : null}
            lngLat={selected?.lngLat}
            onClose={handleClose}
          />
          <MapToolbar>
            <ToolbarButton
              label="Trails nearby"
              icon={<TrailsIcon />}
              isActive={openPanel === 'nearby'}
              onClick={() => togglePanel('nearby')}
            />
            {/* Next buttons go here: leaderboard, filters... each with its own openPanel name */}
          </MapToolbar>
          {/* Trails near the center of the map, with filters and saving to the profile */}
          <NearbyPanel isOpen={openPanel === 'nearby'} onClose={closePanel} />
        </MapView>
      </section>
      {route && (elevationOpen ? (
        // Elevation chart floating over the bottom of the full-screen map
        <div className="home-elevation">
          <button
            type="button"
            className="home-elevation-close"
            aria-label="Hide elevation profile"
            onClick={hideElevation}
          >
            <CloseIcon />
          </button>
          <ElevationProfile
            key={selected?.id}
            data={elevationData}
            onHover={setHoveredPoint}
          />
        </div>
      ) : (
        <button
          type="button"
          className="home-elevation-show"
          aria-label="Show elevation profile"
          onClick={() => setElevationOpen(true)}
        >
          Elevation profile
        </button>
      ))}
    </main>
  );
}
