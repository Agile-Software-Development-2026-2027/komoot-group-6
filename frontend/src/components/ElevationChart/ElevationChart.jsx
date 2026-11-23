
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


function validNonNegative(value) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0;
}

function formatDuration(minutes) {
  if (!validNonNegative(minutes)) return '—';

  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const remaining = total % 60;

  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;

  return `${hours}h ${remaining}m`;
}

function formatMeters(value) {
  if (!validNonNegative(value)) return '—';
  return `${Math.round(value).toLocaleString()} m`;
}

function formatKilometers(value) {
  if (!validNonNegative(value)) return '—';
  return `${(value / 1000).toFixed(1)} km`;
}

function formatSpeed(distanceM, durationMin) {
  if (
    !validNonNegative(distanceM) ||
    !validNonNegative(durationMin) ||
    durationMin === 0
  ) {
    return '—';
  }

  const speed = (distanceM / 1000) / (durationMin / 60);

  return `${speed.toFixed(1)} km/h`;
}

function TrailStatistics({ stats }) {
  const distanceM = stats?.distanceM;
  const durationMin = stats?.durationMin;

  const items = [
    {
      label: 'Distance',
      value: formatKilometers(distanceM),
    },
    {
      label: 'Est. time',
      value: formatDuration(durationMin),
    },
    {
      label: 'Elevation gain',
      value: formatMeters(stats?.ascentM),
    },
    {
      label: 'Elevation loss',
      value: formatMeters(stats?.descentM),
    },
    {
      label: 'Avg. speed',
      value: formatSpeed(distanceM, durationMin),
    },
  ];

  return (
    <div className={styles.statistics}>
      {items.map(({ label, value }) => (
        <div className={styles.statItem} key={label}>
          <strong className={styles.statValue}>{value}</strong>
          <span className={styles.statLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}


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

export default function ElevationProfile({ data = [], stats = null, onHover }) {
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
      
    <TrailStatistics stats={stats} />
      {valid.length < 2 ? (
        <p className={styles.emptyState} role="status">
          Elevation data unavailable for this route.
        </p>
      ) : (
        <>
          <div className={styles.routeEndpoints} aria-hidden="true">
            <span className={styles.startMarker}>S</span>
            <span className={styles.endMarker}>D</span>
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
                  width={65}
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
