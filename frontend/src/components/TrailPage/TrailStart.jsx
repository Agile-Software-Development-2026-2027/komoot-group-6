import { directionsUrl, formatCoordinates } from '../../utils/trailSummary.js';
import { DirectionsIcon, PinIcon } from './icons.jsx';
import styles from './TrailPage.module.css';

// Section with the start of the trail: coordinates and a button that opens
// Google Maps with the directions from where the user is to the start.
// "startPoint" = [lng, lat] from GET /api/trails/:id
export default function TrailStart({ startPoint }) {
  const [lng, lat] = startPoint ?? [];
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return (
    <section className={styles.section} aria-labelledby="trail-start">
      <h2 id="trail-start">Starting point</h2>
      <p className={styles.coordinates}>
        <PinIcon />
        {formatCoordinates([lng, lat])}
      </p>
      {/* A new tab: the trail page stays open */}
      <a className={styles.directions} href={directionsUrl([lng, lat])} target="_blank" rel="noopener noreferrer">
        <DirectionsIcon />
        Get directions
      </a>
    </section>
  );
}