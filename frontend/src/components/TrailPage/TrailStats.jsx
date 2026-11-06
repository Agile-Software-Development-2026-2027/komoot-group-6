import {
  estimateDurationMin,
  formatDistance,
  formatDuration,
  formatElevation,
} from '../../utils/formatTrail.js';
import styles from './TrailPage.module.css';

// Card with the numbers of the trail, like on Komoot: duration, distance,
// ascent, descent, highest point. A missing value is shown as "—".
// "trail" = the properties returned by GET /api/trails/:id
export default function TrailStats({ trail }) {
  // Not every trail has an estimated duration: we estimate it from length and ascent
  const durationMin = trail.estDurationMin ?? estimateDurationMin(trail.lengthM, trail.ascentM);

  const stats = [
    { label: 'Duration', value: formatDuration(durationMin) },
    { label: 'Distance', value: formatDistance(trail.lengthM) },
    { label: 'Ascent', value: formatElevation(trail.ascentM) },
    { label: 'Descent', value: formatElevation(trail.descentM) },
    { label: 'Highest point', value: formatElevation(trail.maxElevationM) },
  ];

  return (
    <section className={styles.card} aria-labelledby="trail-stats">
      <h2 id="trail-stats">Trail details</h2>
      <dl className={styles.stats}>
        {stats.map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}