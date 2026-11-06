import { formatDistance, formatDuration, formatElevation } from '../../utils/formatTrail.js';
import { AscentIcon, ClockIcon, DescentIcon, DistanceIcon, PeakIcon } from './icons.jsx';
import styles from './TrailPage.module.css';

// The key numbers of the trail in one row, big and with an icon, like on Komoot:
// duration, distance, ascent, descent, highest point. A missing value is shown as "—".
// "trail" = the properties returned by GET /api/trails/:id,
// "durationMin" = the duration (from the database, or estimated by TrailPage).
export default function TrailStats({ trail, durationMin }) {
  const stats = [
    { label: 'Duration', value: formatDuration(durationMin), Icon: ClockIcon },
    { label: 'Distance', value: formatDistance(trail.lengthM), Icon: DistanceIcon },
    { label: 'Ascent', value: formatElevation(trail.ascentM), Icon: AscentIcon },
    { label: 'Descent', value: formatElevation(trail.descentM), Icon: DescentIcon },
    { label: 'Highest point', value: formatElevation(trail.maxElevationM), Icon: PeakIcon },
  ];

  return (
    <dl className={styles.stats} aria-label="Trail details">
      {stats.map(({ label, value, Icon }) => (
        <div key={label} className={styles.stat}>
          <dt>
            <Icon />
            {label}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}