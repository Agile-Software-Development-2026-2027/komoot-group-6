import { useEffect, useState } from 'react';
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

// aria-label del segnalibro per ogni stato del salvataggio
const SAVE_LABELS = { idle: 'Save', saving: 'Saving...', saved: 'Saved', error: 'Save' };

// Messaggio mostrato sotto la card dopo il click sul segnalibro, in base alla risposta di onSave
const SAVE_MESSAGES = { saved: 'Trail saved', 'already-saved': 'Trail already saved' };

// Per quanti millisecondi resta visibile il messaggio
const SAVE_MESSAGE_MS = 3000;

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
// pulsante per segnarlo/rimuoverlo come completato, nome e dati (difficoltà, tempo stimato, lunghezza, salita).
// onSave(trailId) salva il sentiero e restituisce una Promise con 'saved' o 'already-saved'.
// Il segnalibro resta cliccabile anche dopo il salvataggio, così l'utente vede "Trail already saved".
// isSaved dice se il sentiero è già nel profilo dell'utente (lo carica il padre): il segnalibro parte pieno.
// onComplete(trailId) segna il sentiero come completato e restituisce una Promise.
// onSelect(trail) mostra il sentiero sulla mappa; isSelected evidenzia la card scelta.
export default function TrailCard({
  trail,
  onSave,
  isSaved: isSavedInProfile = false,
  onComplete,
  onUncomplete,
  onToggleComplete,
  isCompleted = false,
  onSelect,
  isSelected = false,
}) {
  const [saveStatus, setSaveStatus] = useState(trail.saved ? 'saved' : 'idle');
  const [saveMessage, setSaveMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [localDone, setLocalDone] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  // Se la card non sta salvando e non ha dato errore, vale quello che dice il profilo:
  // così il segnalibro si riempie anche quando l'elenco dei salvati arriva dopo la card
  const shownSaveStatus = saveStatus === 'idle' && isSavedInProfile ? 'saved' : saveStatus;
  const isSaved = shownSaveStatus === 'saved';
  const isDone = localDone !== null ? localDone : Boolean(isCompleted || trail.completed);

  // Il messaggio di conferma sparisce da solo dopo qualche secondo
  useEffect(() => {
    if (!saveMessage) return undefined;
    const timer = setTimeout(() => setSaveMessage(null), SAVE_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  async function handleSave() {
    setSaveStatus('saving');
    setSaveMessage(null);
    try {
      const result = await onSave(trail.id);
      setSaveStatus('saved');
      // Se onSave non dice com'è andata, il sentiero si considera salvato adesso
      setSaveMessage(SAVE_MESSAGES[result] ?? SAVE_MESSAGES.saved);
    } catch {
      setSaveStatus('error');
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
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          aria-label={`${SAVE_LABELS[shownSaveStatus]} ${trail.name}`}
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

      {saveStatus === 'error' && (
        <p role="alert" className={styles.cardError}>Could not save the trail. Try again.</p>
      )}

      {hasError && (
        <p role="alert" className={styles.cardError}>Could not update completed status. Try again.</p>
      )}
    </article>
  );
}
