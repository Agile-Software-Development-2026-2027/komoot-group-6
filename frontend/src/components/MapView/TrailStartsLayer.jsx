import { Layer, Source } from 'react-map-gl/maplibre';
import { STARTING_POINT_COLOR } from '../../config/theme.js';
/**
 * Draws a dot on the map for the start point of each trail.
 *
 * @param {object} props
 * @param {object} props.data - GeoJSON FeatureCollection of Points (GET /api/trails).
 * @param {string} [props.id] - Optional custom identifier prefix.
 */
export default function TrailStartsLayer({ data, id = 'trail-starts' }) {
  if (!data) {
    return null;
  }

  return (
    <Source id={`${id}-source`} type="geojson" data={data}>
      <Layer
        id={id}
        type="circle"
        paint={{
          'circle-radius': 10,
          'circle-color': STARTING_POINT_COLOR,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        }}
      />
    </Source>
  );
}
