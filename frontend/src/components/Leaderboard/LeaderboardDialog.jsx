import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEADERBOARD_SIZE } from '../../config/leaderboard.config.js';
import { useAuth } from '../../context/useAuth.js';
import { getLeaderboard } from '../../services/profileService.js';
import Avatar from '../Avatar.jsx';
import { CloseIcon } from '../NearbyPanel/icons.jsx';
import styles from './LeaderboardDialog.module.css';

// One profile of the leaderboard: rank, name, level, points and completed trails.
function LeaderboardRow({ entry }) {
  const name = entry.displayName?.trim() || entry.username;
  const trails = entry.completedTrails === 1 ? 'trail' : 'trails';

  return (
    <li className={entry.isMine ? `${styles.row} ${styles.mine}` : styles.row}>
      {/* The first three places are highlighted */}
      <span className={entry.rank <= 3 ? `${styles.rank} ${styles.podium}` : styles.rank}>
        <span className="visually-hidden">Rank </span>
        {entry.rank}
      </span>
      <Avatar name={name} size="sm" />
      <span className={styles.identity}>
        <span className={styles.profileName}>
          {/* The name opens the public profile page */}
          <Link to={`/users/${encodeURIComponent(entry.username)}`} className={styles.profileLink}>
            <strong>{name}</strong>
          </Link>
          {entry.isMine && <span className={styles.youBadge}>You</span>}
        </span>
        <span>@{entry.username} · Level {entry.level}</span>
      </span>
      <span className={styles.score}>
        <span>
          <strong>{entry.totalPoints}</strong> pts
        </span>
        <span>{entry.completedTrails} {trails}</span>
      </span>
    </li>
  );
}

// Window with the global leaderboard: the public profiles ordered by total points.
export default function LeaderboardDialog({ onClose }) {
  const { authFetch } = useAuth();
  const dialogRef = useRef(null);
  // entries: null while loading; failed: the last request did not work
  const [result, setResult] = useState({ entries: null, failed: false });
  // Grows at every "Try again", so the leaderboard is requested again
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    // Ignores the answer if the window was closed in the meantime
    let ignore = false;
    getLeaderboard(authFetch)
      .then((entries) => {
        if (!ignore) setResult({ entries, failed: false });
      })
      .catch(() => {
        if (!ignore) setResult({ entries: null, failed: true });
      });
    return () => {
      ignore = true;
    };
  }, [authFetch, attempt]);

  function retry() {
    setResult({ entries: null, failed: false });
    setAttempt((count) => count + 1);
  }

  function closeDialog(event) {
    event.preventDefault();
    dialogRef.current.close();
    onClose();
  }

  const { entries, failed } = result;
  const loading = entries === null && !failed;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="leaderboard-title"
      onCancel={closeDialog}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) closeDialog(event);
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id="leaderboard-title">Leaderboard</h2>
          <p className={styles.subtitle}>Public profiles, ranked by total points</p>
        </div>
        <button type="button" className={styles.close} onClick={closeDialog} aria-label="Close leaderboard">
          <CloseIcon />
        </button>
      </header>

      <div className={styles.body}>
        {loading && <p className={styles.status} role="status">Loading the leaderboard…</p>}
        {failed && (
          <div className={styles.status}>
            <p role="alert">Could not load the leaderboard.</p>
            <button type="button" onClick={retry}>Try again</button>
          </div>
        )}
        {entries?.length === 0 && <p className={styles.status} role="status">No public profiles yet.</p>}
        {entries?.length > 0 && (
          <ol className={styles.list} aria-label="Leaderboard">
            {entries.map((entry) => <LeaderboardRow key={entry.username} entry={entry} />)}
          </ol>
        )}
        {/* Private profiles are not ranked: the user may wonder why they are missing */}
        {entries && !entries.some((entry) => entry.isMine) && (
          <p className={styles.note}>
            You are not in this list: only public profiles are ranked (the first {LEADERBOARD_SIZE}).
            You can make your profile public from your profile page.
          </p>
        )}
      </div>
    </dialog>
  );
}