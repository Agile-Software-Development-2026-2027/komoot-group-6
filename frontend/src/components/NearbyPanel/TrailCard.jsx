import { useEffect, useState } from 'react';
import { SAVE_MESSAGE_MS } from '../../config/ui.config.js';
import {
  estimateDurationMin,
  formatDistance,
  formatDuration,
  formatElevation,
} from '../../utils/formatTrail.js';
import TrailDetailsLink from '../TrailPage/TrailDetailsLink.jsx';
import { DIFFICULTY_LABELS } from './difficulty.js';
import { BookmarkIcon, CheckIcon, ClimbIcon, ClockIcon, DistanceIcon, PinIcon } from './icons.jsx';
import styles from './NearbyPanel.module.css';


const SAVE_LABELS = { save: 'Save', saving: 'Saving...', saved: 'Saved', removing: 'Removing...' };

// Message shown under the card after clicking the bookmark
const SAVE_MESSAGES = {
  saved: 'Trail saved',
  'already-saved': 'Trail already saved',
  removed: 'Trail removed from saved',
};

// Error shown under the card, based on the action that failed
const SAVE_ERRORS = {
  save: 'Could not save the trail. Try again.',
  remove: 'Could not remove the trail. Try again.',
};

// Cover drawing colors by difficulty: sky, far mountains, near mountains
const ART_COLORS = {
  easy: ['#e6f2e8', '#b5d9bd', '#6fae7f'],
  moderate: ['#e0eeef', '#a7cdd0', '#4f8f95'],
  hard: ['#e7eaf1', '#b4bdd1', '#5d6b8a'],
};

// Mountain skylines: each trail uses one, chosen from its id
const SKYLINES = [
  ['0,120 60,70 120,105 190,55 260,100 320,75 320,180 0,180', '0,150 70,110 140,140 210,100 280,135 320,120 320,180 0,180'],
  ['0,110 80,60 150,95 220,45 320,95 320,180 0,180', '0,140 90,120 160,95 240,130 320,105 320,180 0,180'],
  ['0,100 50,80 130,40 200,90 270,65 320,85 320,180 0,180', '0,135 60,125 120,100 200,140 260,115 320,130 320,180 0,180'],
];

// Drawn cover, used when the trail has no photo (or the photo does not load)
function TrailArt({ trail }) {
  const [sky, far, near] = ART_COLORS[trail.difficulty] ?? ART_COLORS.moderate;
  const seed = [...String(trail.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [farPeaks, nearPeaks] = SKYLINES[seed % SKYLINES.length];

  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="180" fill={sky} />
      <circle cx="70" cy="50" r="18" fill="#fff" opacity="0.8" />
      <polygon points={farPeaks} fill={far} />
      <polygon points={nearPeaks} fill={near} />
      {/* Dashed trail climbing between the mountains */}
      <path
        d="M30 180 C90 165 110 150 150 155 S230 135 290 140"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

// Card of a nearby trail: cover with the bookmark to save it to the profile,
// button to mark/unmark it as completed, name and data (difficulty, estimated time, length, elevation gain).
// The bookmark works as a toggle:
// - trail not saved: the click calls onSave(trailId), which returns a Promise with 'saved' or 'already-saved';
// - trail already saved: the click calls onUnsave(trailId) and removes it from the saved ones.
// isSaved tells whether the trail is already in the user's profile (loaded by the parent): the bookmark starts filled.
// onComplete(trailId) marks the trail as completed and returns a Promise.
// onSelect(trail) shows the trail on the map; isSelected highlights the chosen card.
export default function TrailCard({
  trail,
  onSave,
  onUnsave,
  isSaved: isSavedInProfile = false,
  onComplete,
  onUncomplete,
  onToggleComplete,
  isCompleted = false,
  onSelect,
  isSelected = false,
}) {
  // Bookmark state set by a click on the card (null = the profile decides)
  const [localSaved, setLocalSaved] = useState(null);
  // Bookmark action in progress: 'saving', 'removing' or null
  const [saveAction, setSaveAction] = useState(null);
  // Failed bookmark action: 'save', 'remove' or null
  const [saveError, setSaveError] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [localDone, setLocalDone] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Until the user clicks, the profile decides:
  // so the bookmark fills in even when the saved list arrives after the card
  const isSaved = localSaved !== null ? localSaved : Boolean(isSavedInProfile || trail.saved);
  const bookmarkState = saveAction ?? (isSaved ? 'saved' : 'save');
  const isDone = localDone !== null ? localDone : Boolean(isCompleted || trail.completed);

  // The confirmation message disappears by itself after a few seconds
  useEffect(() => {
    if (!saveMessage) return undefined;
    const timer = setTimeout(() => setSaveMessage(null), SAVE_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  // Click on the bookmark: saves the trail if it is not saved, otherwise removes it from the saved ones
  async function handleBookmark() {
    if (saveAction) return;
    const removing = isSaved;
    setSaveAction(removing ? 'removing' : 'saving');
    setSaveMessage(null);
    setSaveError(null);
    try {
      if (removing) {
        await onUnsave(trail.id);
        setLocalSaved(false);
        setSaveMessage(SAVE_MESSAGES.removed);
      } else {
        const result = await onSave(trail.id);
        setLocalSaved(true);
        // If onSave does not say how it went, the trail is considered saved now
        setSaveMessage(SAVE_MESSAGES[result] ?? SAVE_MESSAGES.saved);
      }
    } catch {
      // The bookmark stays as it was and the user can try again
      setSaveError(removing ? 'remove' : 'save');
    } finally {
      setSaveAction(null);
    }
  }

  async function handleToggle() {
    if (actionLoading || (!onToggleComplete && !onComplete && !onUncomplete)) return;
    const targetDone = !isDone;
    setActionLoading(true);
    setHasError(false);
    try {
      if (onToggleComplete) {
        await onToggleComplete(trail.id, targetDone);
      } else if (targetDone && onComplete) {
        await onComplete(trail.id);
      } else if (!targetDone && onUncomplete) {
        await onUncomplete(trail.id);
      }
      setLocalDone(targetDone);
    } catch {
      setHasError(true);
    } finally {
      setActionLoading(false);
    }
  }

  const completeLabel = actionLoading
    ? (isDone ? 'Removing...' : 'Completing...')
    : (isDone ? 'Completed' : 'Mark as completed');

  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.cover}>
        {trail.imageUrl && !imageFailed ? (
          <img src={trail.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <TrailArt trail={trail} />
        )}

        {(onToggleComplete || onComplete) && (
          <button
            type="button"
            className={`${styles.completeBtn} ${isDone ? styles.isCompleted : ''}`}
            onClick={handleToggle}
            disabled={actionLoading}
            aria-label={`${completeLabel} ${trail.name}`}
            title={isDone ? 'Remove from completed' : 'Mark as completed'}
          >
            <CheckIcon />
          </button>
        )}

        <button
          type="button"
          className={`${styles.bookmark} ${isSaved ? styles.isSaved : ''}`}
          onClick={handleBookmark}
          disabled={saveAction !== null}
          aria-label={`${SAVE_LABELS[bookmarkState]} ${trail.name}`}
          aria-pressed={isSaved}
          title={isSaved ? 'Remove from your saved trails' : 'Save to your profile'}
        >
          <BookmarkIcon filled={isSaved} />
        </button>
      </div>

      <h3 className={styles.cardTitle}>
        {trail.start && onSelect ? (
          <button
            type="button"
            className={styles.cardLink}
            onClick={() => onSelect(trail)}
            aria-current={isSelected ? 'true' : undefined}
            title="Show on the map"
          >
            {trail.name}
          </button>
        ) : (
          trail.name
        )}
      </h3>

      <dl className={styles.stats}>
        <div title="Difficulty">
          <dt className="visually-hidden">Difficulty</dt>
          <dd>
            <span className={`${styles.dot} ${styles[trail.difficulty] ?? ''}`} aria-hidden="true" />
            {DIFFICULTY_LABELS[trail.difficulty] ?? trail.difficulty}
          </dd>
        </div>
        <div title="Estimated time">
          <dt className="visually-hidden">Estimated time</dt>
          <dd><ClockIcon />{formatDuration(estimateDurationMin(trail.lengthM, trail.elevationGainM))}</dd>
        </div>
        <div title="Length">
          <dt className="visually-hidden">Length</dt>
          <dd><DistanceIcon />{formatDistance(trail.lengthM)}</dd>
        </div>
        <div title="Elevation gain">
          <dt className="visually-hidden">Elevation gain</dt>
          <dd><ClimbIcon />{formatElevation(trail.elevationGainM)}</dd>
        </div>
      </dl>


      <div className={styles.cardFooter}>
        <p className={styles.away}>
          <PinIcon />
          {formatDistance(trail.distanceM)} away
        </p>
        <TrailDetailsLink trailId={trail.id} className={styles.detailsLink}>
          Details
        </TrailDetailsLink>
      </div>

      {saveMessage && (
        <p role="status" className={styles.cardNotice}>{saveMessage}</p>
      )}

      {saveError && (
        <p role="alert" className={styles.cardError}>{SAVE_ERRORS[saveError]}</p>
      )}

      {hasError && (
        <p role="alert" className={styles.cardError}>Could not update completed status. Try again.</p>
      )}
    </article>
  );
}
