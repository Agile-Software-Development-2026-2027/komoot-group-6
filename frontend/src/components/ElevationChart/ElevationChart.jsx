import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import styles from './ElevationChart.module.css';
import {ELEVATION_CHART_LINE_COLOR, ELEVATION_CHART_AREA_COLOR} from '../../config/theme.js';

const tooltipValue = (value) => [`${Number(value).toFixed(1)} m`, 'Elevation'];
const tooltipDistance = (value) => `${Number(value).toFixed(2)} km`;

/** Accepts [{distance: number (km), elevation: number (m)}]. Parent controls placement. */
export default function ElevationProfile({ data = [], onHover }) {
  const valid = useMemo(() => Array.isArray(data) ? data.filter((p) =>
    Number.isFinite(p?.distance) && Number.isFinite(p?.elevation)) : [], [data]);

  const handleMouseMove = (state) => {
    const index = state?.activeTooltipIndex;
    const point = state?.isTooltipActive && index != null ? valid[Number(index)] : null;
    onHover?.(point ?? null);
  };

  return (
    <section className={styles.profile} aria-label="Elevation profile">
      <h2 className={styles.heading}>Elevation profile</h2>
      {valid.length < 2 ? (
        <p role="status">Elevation data unavailable for this route.</p>
      ) : (
        <div className={styles.chart} role="img" aria-label="Elevation in meters by distance in kilometers">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={valid} margin={{ top: 12, right: 16, left: 0, bottom: 18 }}
              onMouseMove={handleMouseMove} onMouseLeave={() => onHover?.(null)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="distance" type="number" domain={['dataMin', 'dataMax']}
                tickFormatter={(n) => Number(n).toFixed(1)}
                label={{ value: 'Distance (km)', position: 'insideBottom', offset: -10 }} />
              <YAxis dataKey="elevation" type="number" domain={['auto', 'auto']}
                tickFormatter={(n) => `${n}`} width={52}
                label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={tooltipValue} labelFormatter={tooltipDistance} />
              <Area type="linear" dataKey="elevation" stroke={ELEVATION_CHART_LINE_COLOR}
                fill={ELEVATION_CHART_AREA_COLOR} fillOpacity={0.25} strokeWidth={2.5} dot={false}
                activeDot={{ r: 5 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
