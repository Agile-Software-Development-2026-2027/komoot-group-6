import { Layer, Source } from 'react-map-gl/maplibre';

/**
 * Renders a GeoJSON track line on the map.
 *
 * @param {object} props
 * @param {object} props.data - GeoJSON object representing the track.
 * @param {string} [props.id] - Optional custom identifier prefix.
 */
export default function TrackLayer({ data, id = 'track' }) {
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
        paint={layerPaint}
        layout={layerLayout}
      />
    </Source>
  );
}
