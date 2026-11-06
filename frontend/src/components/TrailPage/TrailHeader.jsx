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

// Top of the trail page, like the cover of a Komoot tour: the photo in big,
// with type, difficulty and name written over its lower part.
// Without a photo the same texts are shown on a soft colored background.
// "trail" = the properties returned by GET /api/trails/:id
export default function TrailHeader({ trail }) {
  const imageUrl = trailImageUrl(trail.name);
  // The backend uses the CAI scale (T, E, EE, EEA): the page shows Easy / Intermediate / Difficult
  const difficulty = CAI_TO_DIFFICULTY[trail.difficulty];

  return (
    <header className={`${styles.hero} ${imageUrl ? styles.heroWithPhoto : ''}`}>
      {imageUrl && <img className={styles.heroImage} src={imageUrl} alt="" />}

      <div className={styles.heroText}>
        <p className={styles.kicker}>
          {formatType(trail.trailType)}
          {difficulty && (
            <span className={`${styles.badge} ${styles[difficulty]}`}>
              {DIFFICULTY_LABELS[difficulty]} · {trail.difficulty}
            </span>
          )}
        </p>
        <h1 className={styles.title}>{trail.name}</h1>
      </div>
    </header>
  );
}