import { useState } from 'react';
import {
  estimateDurationMin,
  formatDistance,
  formatDuration,
  formatElevation,
} from '../../utils/formatTrail.js';
import { DIFFICULTY_LABELS } from './difficulty.js';
import { BookmarkIcon, CheckIcon, ClimbIcon, ClockIcon, DistanceIcon, PinIcon } from './icons.jsx';
import styles from './NearbyPanel.module.css';

// aria-label del segnalibro per ogni stato del salvataggio
const SAVE_LABELS = { idle: 'Save', saving: 'Saving...', saved: 'Saved', error: 'Save' };

// aria-label del pulsante per completare l'escursione (SCRUM-51)
const COMPLETE_LABELS = {
  idle: 'Mark as completed',
  completing: 'Completing...',
  completed: 'Completed',
  error: 'Mark as completed',
};

// Colori del disegno di copertina per difficoltà: cielo, montagne lontane, montagne vicine
const ART_COLORS = {
  easy: ['#e6f2e8', '#b5d9bd', '#6fae7f'],
  moderate: ['#e0eeef', '#a7cdd0', '#4f8f95'],
  hard: ['#e7eaf1', '#b4bdd1', '#5d6b8a'],
};

// Profili di montagne: ogni sentiero ne usa uno, scelto dal suo id
const SKYLINES = [
  ['0,120 60,70 120,105 190,55 260,100 320,75 320,180 0,180', '0,150 70,110 140,140 210,100 280,135 320,120 320,180 0,180'],
  ['0,110 80,60 150,95 220,45 320,95 320,180 0,180', '0,140 90,120 160,95 240,130 320,105 320,180 0,180'],
  ['0,100 50,80 130,40 200,90 270,65 320,85 320,180 0,180', '0,135 60,125 120,100 200,140 260,115 320,130 320,180 0,180'],
];

// Copertina disegnata, usata quando il sentiero non ha una foto (o la foto non si carica)
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
      {/* Sentiero tratteggiato che sale tra le montagne */}
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

// Card di un sentiero vicino: copertina con il segnalibro per salvarlo nel profilo,
// pulsante per segnarlo come completato, nome e dati (difficoltà, tempo stimato, lunghezza, salita).
// onSave(trailId) salva il sentiero e restituisce una Promise.
// onComplete(trailId) segna il sentiero come completato e restituisce una Promise.
// onSelect(trail) mostra il sentiero sulla mappa; isSelected evidenzia la card scelta.
export default function TrailCard({
  trail,
  onSave,
  onComplete,
  isCompleted = false,
  onSelect,
  isSelected = false,
}) {
  const [saveStatus, setSaveStatus] = useState(trail.saved ? 'saved' : 'idle');
  const [actionStatus, setActionStatus] = useState('idle');
  const [imageFailed, setImageFailed] = useState(false);

  const isSaved = saveStatus === 'saved';
  const isDone = isCompleted || Boolean(trail.completed) || actionStatus === 'completed';
  const completeStatus = isDone ? 'completed' : actionStatus;

  async function handleSave() {
    setSaveStatus('saving');
    try {
      await onSave(trail.id);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  async function handleComplete() {
    if (!onComplete) return;
    setActionStatus('completing');
    try {
      await onComplete(trail.id);
      setActionStatus('completed');
    } catch {
      setActionStatus('error');
    }
  }

  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.cover}>
        {trail.imageUrl && !imageFailed ? (
          <img src={trail.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <TrailArt trail={trail} />
        )}

        {onComplete && (
          <button
            type="button"
            className={`${styles.completeBtn} ${isDone ? styles.isCompleted : ''}`}
            onClick={handleComplete}
            disabled={completeStatus === 'completing' || isDone}
            aria-label={`${COMPLETE_LABELS[completeStatus]} ${trail.name}`}
            title={isDone ? 'Hike completed' : 'Mark as completed'}
          >
            <CheckIcon filled={isDone} />
          </button>
        )}

        <button
          type="button"
          className={`${styles.bookmark} ${isSaved ? styles.isSaved : ''}`}
          onClick={handleSave}
          disabled={saveStatus === 'saving' || isSaved}
          aria-label={`${SAVE_LABELS[saveStatus]} ${trail.name}`}
          title={isSaved ? 'Saved to your profile' : 'Save to your profile'}
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

      <p className={styles.away}>
        <PinIcon />
        {formatDistance(trail.distanceM)} away
      </p>

      {saveStatus === 'error' && (
        <p role="alert" className={styles.cardError}>Could not save the trail. Try again.</p>
      )}

      {completeStatus === 'error' && (
        <p role="alert" className={styles.cardError}>Could not mark the hike as completed. Try again.</p>
      )}
    </article>
  );
}
