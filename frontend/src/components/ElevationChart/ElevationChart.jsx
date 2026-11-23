
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { addSlopeToProfile, SLOPE_COLORS } from '../../utils/elevationSlope.js';
import styles from './ElevationChart.module.css';

const formatDistance = (value) => `${Number(value).toFixed(2)} km`;
const formatElevation = (value) => `${Math.round(Number(value))} m`;

function ElevationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload.find((entry) => entry.dataKey === 'elevation')?.payload;
  if (!point) return null;

  return (
    <div className={styles.tooltip}>
      <strong>{formatDistance(point.distance)}</strong>
      <span>Elevation: {formatElevation(point.elevation)}</span>
      {Number.isFinite(point.slopePercent) && (
        <span>Slope: {Math.abs(point.slopePercent).toFixed(1)}%</span>
      )}
    </div>
  );
}

/**
 * Creates contiguous slope-colored runs.
 * Every run shares its boundary point with the previous run,
 * so there are no gaps between colored sections.
 */
function buildColoredChartData(points) {
  const rows = points.map((point) => ({ ...point }));
  const runs = [];

  for (let index = 1; index < points.length; index += 1) {
    const category = points[index].slopeCategory;
    const previousRun = runs[runs.length - 1];

    if (previousRun && previousRun.category === category) {
      previousRun.end = index;
    } else {
      runs.push({
        category,
        start: index - 1,
        end: index,
      });
    }
  }

  runs.forEach((run, index) => {
    const key = `slopeSegment${index}`;
    run.key = key;
    run.color = SLOPE_COLORS[run.category] ?? SLOPE_COLORS.unknown;

    for (let pointIndex = run.start; pointIndex <= run.end; pointIndex += 1) {
      rows[pointIndex][key] = points[pointIndex].elevation;
    }
  });

  return { rows, runs };
}

export default function ElevationProfile({ data = [], onHover }) {
  const valid = useMemo(
    () =>
      Array.isArray(data)
        ? data.filter(
            (point) =>
              Number.isFinite(point?.distance) &&
              Number.isFinite(point?.elevation)
          )
        : [],
    [data]
  );

 const { rows, runs } = useMemo(() => {
  const MAX_POINTS = 180;

  const sampled =
    valid.length <= MAX_POINTS
      ? valid
      : Array.from({ length: MAX_POINTS }, (_, index) => {
          const originalIndex = Math.round(
            (index * (valid.length - 1)) / (MAX_POINTS - 1)
          );

          return valid[originalIndex];
        });

  return buildColoredChartData(addSlopeToProfile(sampled));
}, [valid]);

  const handleMouseMove = (state) => {
    const index = state?.activeTooltipIndex;
    const numericIndex = Number(index);

    const point =
      state?.isTooltipActive &&
      index != null &&
      Number.isInteger(numericIndex) &&
      numericIndex >= 0 &&
      numericIndex < rows.length
  ? rows[numericIndex]
  : null;

    // Keep original coordinates for the existing map hover marker.
    onHover?.(point);
  };

  return (
    <section className={styles.profile} aria-label="Elevation profile">
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Elevation profile</h2>
          <p className={styles.subtitle}>
            Altitude and slope along the selected trail
          </p>
        </div>
        <span className={styles.unitBadge}>km / m</span>
      </div>

      {valid.length < 2 ? (
        <p className={styles.emptyState} role="status">
          Elevation data unavailable for this route.
        </p>
      ) : (
        <>
          <div className={styles.routeEndpoints} aria-hidden="true">
            <span className={styles.startMarker}>A</span>
            <span className={styles.endMarker}>B</span>
          </div>

          <div
            className={styles.chart}
            role="img"
            aria-label="Elevation in meters by distance in kilometers"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ top: 8, right: 12, left: -12, bottom: 8 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => onHover?.(null)}
              >
                <CartesianGrid
                  stroke="#d7ddd8"
                  strokeDasharray="5 5"
                  vertical
                />

                <XAxis
                  dataKey="distance"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => Number(value).toFixed(1)}
                  tick={{ fontSize: 11, fill: '#66746b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5ce' }}
                  minTickGap={20}
                  unit=" km"
                />

                <YAxis
                  dataKey="elevation"
                  type="number"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => Math.round(value)}
                  tick={{ fontSize: 11, fill: '#66746b' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  unit=" m"
                />

                <Tooltip
                  content={<ElevationTooltip />}
                  cursor={{
                    stroke: '#567b58',
                    strokeDasharray: '4 4',
                  }}
                />

                {/* Base series provides continuous tooltip interaction. */}
                <Area
                  type="linear"
                  dataKey="elevation"
                  stroke="none"
                  fill="transparent"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#236c35',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                  legendType="none"
                />

                {/* Each contiguous run receives its own slope color. */}
                {runs.map((run) => (
                  <Area
                    key={run.key}
                    type="linear"
                    dataKey={run.key}
                    stroke={run.color}
                    strokeWidth={2.5}
                    fill={run.color}
                    fillOpacity={0.17}
                    dot={false}
                    activeDot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend} aria-label="Slope legend">
            <span><i className={styles.gentle} />Gentle</span>
            <span><i className={styles.moderate} />Moderate</span>
            <span><i className={styles.steep} />Steep</span>
            <span><i className={styles.verySteep} />Very steep</span>
          </div>
        </>
      )}
    </section>
  );
}
