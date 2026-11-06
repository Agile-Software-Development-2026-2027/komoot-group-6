import { CAI_TO_DIFFICULTY } from '../../services/trailsService.js';
import { DIFFICULTY_LABELS } from '../NearbyPanel/difficulty.js';
import { trailImageUrl } from '../../utils/trailImages.js';
import styles from './TrailPage.module.css';

// "trail_running" -> "Trail running"
function formatType(type) {
  if (!type) return null;
  const words = type.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Top of the trail page: photo and map side by side, then type, name and difficulty.
// "trail" = the properties returned by GET /api/trails/:id.
// "children" = what goes next to the photo (the map, from TrailPage).
// Without a photo the map takes the whole width.
export default function TrailHeader({ trail, children }) {
  const imageUrl = trailImageUrl(trail.name);
  // The backend uses the CAI scale (T, E, EE, EEA): the page shows Easy / Intermediate / Difficult
  const difficulty = CAI_TO_DIFFICULTY[trail.difficulty];

  return (
    <header className={styles.header}>
      <div className={styles.hero}>
        {imageUrl && (
          <div className={styles.cover}>
            <img src={imageUrl} alt="" />
          </div>
        )}
        {children}
        {!imageUrl && !children && (
          // Neither a photo nor a map: a soft colored box with the first letter of the name
          <div className={styles.cover}>
            <span className={styles.coverFallback} aria-hidden="true">
              {trail.name?.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className={styles.titleRow}>
        <div>
          {trail.trailType && <p className={styles.kicker}>{formatType(trail.trailType)}</p>}
          <h1 className={styles.title}>{trail.name}</h1>
        </div>
        {difficulty && (
          <span className={`${styles.badge} ${styles[difficulty]}`}>
            {DIFFICULTY_LABELS[difficulty]}
            <span className={styles.badgeCode}> · {trail.difficulty}</span>
          </span>
        )}
      </div>
    </header>
  );
}