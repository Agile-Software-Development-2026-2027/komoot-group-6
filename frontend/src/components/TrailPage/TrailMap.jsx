import { setWorkerUrl } from 'maplibre-gl';
import Map, { Layer, Marker, NavigationControl, ScaleControl, Source } from 'react-map-gl/maplibre';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  HIDDEN_BASE_LAYERS,
  MAP_BASE_STYLES,
  MAPTILER_API_KEY,
  POINT_ZOOM,
  ROUTE_PADDING,
} from '../../config/map.config.js';
import { hideLayers } from '../../map/hideLayers.js';
import { useFirstLabelLayerId } from '../../map/useFirstLabelLayerId.js';
import { routeBounds } from '../../utils/routeBounds.js';
import { isLoop, lastPoint } from '../../utils/routeShape.js';
import TrackLayer from '../MapView/TrackLayer.jsx';
import styles from './TrailPage.module.css';

// Same setup as MapView: MapLibre draws the map in a separate "worker"
setWorkerUrl(workerUrl);

// Same base map as the home page, with the same layers hidden
const hideBaseLayers = hideLayers(HIDDEN_BASE_LAYERS);

// White border drawn UNDER the red route: it makes the route stand out on any background,
// like the highlighted tours on Komoot. Drawn below the text labels (place names stay readable).
function RouteCasing({ data }) {
  const beforeId = useFirstLabelLayerId();

  return (
    <Source id="trail-route-casing-source" type="geojson" data={data}>
      <Layer
        id="trail-route-casing"
        type="line"
        beforeId={beforeId}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 }}
      />
    </Source>
  );
}

// Map of one trail: the whole route highlighted in red with a white border,
// a marker on the start and (for one-way routes) one on the end, already zoomed
// so that the route fits. "trail" = the GeoJSON Feature returned by GET /api/trails/:id.
export default function TrailMap({ trail }) {
  const bounds = routeBounds(trail.geometry);
  const start = trail.properties.startPoint;
  const end = lastPoint(trail.geometry);
  const hasStart = Number.isFinite(start?.[0]) && Number.isFinite(start?.[1]);
  const isRoute = trail.geometry?.type === 'LineString' || trail.geometry?.type === 'MultiLineString';
  
  // A loop ends where it starts: one marker is enough. Only a one-way route gets the end marker.
  const showEnd = isLoop(start, trail.geometry) === false;
  if (!MAPTILER_API_KEY || !bounds) {
    return <p className={styles.mapMessage}>Map not available</p>;
  }

  // The route has a real size: fit it. A single point: center on it.
  const [[west, south], [east, north]] = bounds;
  const initialViewState =
    west === east && south === north
      ? { longitude: west, latitude: south, zoom: POINT_ZOOM }
      : { bounds, fitBoundsOptions: { padding: ROUTE_PADDING } };

  return (
    <div className={styles.map}>
      <Map
        initialViewState={initialViewState}
        mapStyle={MAP_BASE_STYLES[0].url}
        transformStyle={hideBaseLayers}
        // Scrolling the page over the map does not zoom it: Ctrl + scroll (two fingers on phones) does
        cooperativeGestures
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-left" maxWidth={100} unit="metric" />

        {/* Order matters: the border first (below), then the red route on top */}
        {isRoute && <RouteCasing data={trail} />}
        {isRoute && <TrackLayer data={trail} id="trail-route" />}

        {showEnd && (
          <Marker longitude={end[0]} latitude={end[1]} anchor="center">
            <span className={`${styles.marker} ${styles.endMarker}`} role="img" aria-label="End of the trail" />
          </Marker>
        )}
        {hasStart && (
          <Marker longitude={start[0]} latitude={start[1]} anchor="center">
            <span className={`${styles.marker} ${styles.startMarker}`} role="img" aria-label="Start of the trail" />
          </Marker>
        )}
      </Map>

      {/* Small legend in the corner of the map */}
      {isRoute && (
        <ul className={styles.mapLegend} aria-label="Map legend">
          <li><span className={`${styles.marker} ${styles.startMarker}`} aria-hidden="true" />Start</li>
          {showEnd && <li><span className={`${styles.marker} ${styles.endMarker}`} aria-hidden="true" />End</li>}
        </ul>
      )}
    </div>
  );
}