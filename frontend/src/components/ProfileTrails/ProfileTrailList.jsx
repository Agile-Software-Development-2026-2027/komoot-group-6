import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate.js';
import { formatDistance, formatElevation } from '../../utils/formatTrail.js';
import { DIFFICULTY_LABELS } from '../NearbyPanel/difficulty.js';
import './ProfileTrailList.css';

// Small compass for the empty state: it takes the color of the surrounding text
function CompassIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

// List of profile trails, read-only. Each row is a link to the trail page,
// with a fixed grid: name and difficulty, then length, ascent and date aligned.
// emptyText is shown, with an invitation to explore trails, when the list is empty.
export default function ProfileTrailList({ trails, emptyText }) {
  if (trails.length === 0) {
    return (
      <div className="trail-empty">
        <CompassIcon />
        <p>{emptyText}</p>
        <Link to="/" className="trail-empty-action">Esplora percorsi</Link>
      </div>
    );
  }

  return (
    <ul className="trail-list">
      {trails.map((trail) => (
        <li key={trail.id}>
          <Link to={`/trails/${encodeURIComponent(trail.id)}`} className="trail-row">
            <span className="trail-row-title">
              <span className="trail-row-name">{trail.name}</span>
              {trail.difficulty && (
                <span className={`trail-badge trail-badge--${trail.difficulty}`}>
                  {DIFFICULTY_LABELS[trail.difficulty] ?? trail.difficulty}
                </span>
              )}
            </span>
            <span className="trail-row-num">{formatDistance(trail.lengthM)}</span>
            <span className="trail-row-num" aria-label={`Dislivello ${formatElevation(trail.ascentM)}`}>
              ↑ {formatElevation(trail.ascentM)}
            </span>
            <span className="trail-row-date">{formatDate(trail.date) ?? ''}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
