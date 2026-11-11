import { Layer, Source } from 'react-map-gl/maplibre';
import { useFirstLabelLayerId } from '../../map/useFirstLabelLayerId.js';
import { LAYER_PAINT_COLOR, LAYER_PAINT_WIDTH } from '../../config/theme.js';

/**
 * Renders a GeoJSON track line on the map beneath text labels.
 *
 * @param {object} props
 * @param {object} props.data - GeoJSON object representing the track.
 * @param {string} [props.id] - Optional custom identifier prefix.
 */
export default function TrackLayer({ data, id = 'track' }) {
  const beforeId = useFirstLabelLayerId();

  if (!data) {
    return null;
  }

  const sourceId = `${id}-source`;
  const layerId = `${id}-layer`;
  const hitLayerId = `${id}-hit`;

  const layerPaint = {
    'line-color': LAYER_PAINT_COLOR,
    'line-width': LAYER_PAINT_WIDTH,
  };

  const layerLayout = {
    'line-cap': 'round',
    'line-join': 'round',
  };

  return (
    <Source id={sourceId} type="geojson" data={data}>
      <Layer
        id={layerId}
        type="line"
        beforeId={beforeId}
        paint={layerPaint}
        layout={layerLayout}
      />
      {/* Linea invisibile e più larga: rende il percorso facile da cliccare anche col dito */}
      <Layer
        id={hitLayerId}
        type="line"
        paint={{ 'line-color': '#000000', 'line-width': 20, 'line-opacity': 0 }}
        layout={layerLayout}
      />
    </Source>
  );
}
