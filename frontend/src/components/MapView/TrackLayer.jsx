import { Layer, Source } from 'react-map-gl/maplibre';
import { useFirstLabelLayerId } from '../../map/useFirstLabelLayerId.js';

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

  const layerPaint = {
    'line-color': '#E63946',
    'line-width': 4,
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
    </Source>
  );
}
