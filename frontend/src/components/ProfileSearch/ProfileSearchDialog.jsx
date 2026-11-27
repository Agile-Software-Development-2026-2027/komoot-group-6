import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { searchPublicProfiles } from '../../services/profileService.js';
import Avatar from '../Avatar.jsx';
import { CloseIcon, SearchIcon } from '../NearbyPanel/icons.jsx';
import { ChevronRightIcon } from '../TrailPage/icons.jsx';
import styles from './ProfileSearchDialog.module.css';
import FriendButton from '../Friends/FriendButton.jsx';
const SEARCH_DEBOUNCE_MS = 250;
const EMPTY_RESULTS = { profiles: [], nextCursor: null, loading: false, failed: false };

function ProfileResult({ profile }) {
  const name = profile.displayName?.trim() || profile.username;
  const bio = profile.bio?.trim();
  const row = (
    <>
      <Avatar name={name} size="sm" />
      <span className={styles.identity}>
        <span className={styles.profileName}>
          {/* The name opens the public profile page */}
          <Link to={`/users/${encodeURIComponent(profile.username)}`} className={styles.profileLink}>
            <strong>{name}</strong>
          </Link>
          {profile.isMine && <span className={styles.youBadge}>You</span>}
        </span>
        <span>@{profile.username}</span>
        <span>Level {profile.level}</span>
      </span>
      {Number.isFinite(profile.totalPoints) && (
        <span className={styles.points}>
          <span className={styles.star} aria-hidden="true">★</span>
          <strong>{profile.totalPoints}</strong>
          <span className={styles.pointsLabel}>Points earned</span>
        </span>
      )}
    </>
  );

  return (
    <li className={styles.profile}>
      {bio ? (
        <details>
          <summary className={`${styles.row} ${styles.summary}`}>
            {row}
            <span className={styles.chevron}><ChevronRightIcon /></span>
          </summary>
          <p className={styles.bio}>{bio}</p>
        </details>
      ) : (
        <div className={styles.row}>{row}</div>
      )}
      {!profile.isMine && profile.id && (
  <FriendButton userId={profile.id} />
)}
    </li>
  );
}

export default function ProfileSearchDialog({ onClose }) {
  const { authFetch } = useAuth();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [request, setRequest] = useState(null);
  const [results, setResults] = useState(EMPTY_RESULTS);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    inputRef.current.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!request) return undefined;

    let ignore = false;
    const { query, after } = request;
    const timer = setTimeout(async () => {
      try {
        const { profiles, nextCursor } = await searchPublicProfiles(authFetch, query, after);
        if (ignore) return;
        setResults((previous) => ({
          profiles: after === null ? profiles : [...previous.profiles, ...profiles],
          nextCursor,
          loading: false,
          failed: false,
        }));
      } catch {
        if (!ignore) setResults((previous) => ({ ...previous, loading: false, failed: true }));
      }
    }, after === null ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [authFetch, request]);

  function startSearch(query, after = null) {
    setResults((previous) => ({
      ...(after === null ? EMPTY_RESULTS : previous),
      loading: true,
      failed: false,
    }));
    setRequest({ query, after });
  }

  function handleInput(event) {
    const value = event.target.value;
    const query = value.trim();
    setInput(value);
    if (!query) {
      setRequest(null);
      setResults(EMPTY_RESULTS);
    } else if (query !== request?.query) {
      startSearch(query);
    }
  }

  function closeDialog(event) {
    event.preventDefault();
    dialogRef.current.close();
    onClose();
  }

  const { profiles, nextCursor, loading, failed } = results;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="profile-search-title"
      onCancel={closeDialog}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) closeDialog(event);
      }}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id="profile-search-title">Find public profiles</h2>
          <button type="button" className={styles.close} onClick={closeDialog} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>
        <label className={styles.search}>
          <SearchIcon size={18} />
          <span className="visually-hidden">Search by username</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search by username"
            value={input}
            onChange={handleInput}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
      </header>

      {request && (
        <div className={styles.results}>
          {profiles.length > 0 && (
            <ul className={styles.list} aria-label="Public profiles">
              {profiles.map((profile) => <ProfileResult key={profile.username} profile={profile} />)}
            </ul>
          )}
          {loading && <p className={styles.status} role="status">Searching…</p>}
          {failed && (
            <div className={styles.status}>
              <p role="alert">Could not load public profiles.</p>
              <button type="button" onClick={() => startSearch(request.query, request.after)}>Try again</button>
            </div>
          )}
          {!loading && !failed && profiles.length === 0 && (
            <p className={styles.status} role="status">No public profiles found.</p>
          )}
          {!loading && !failed && nextCursor !== null && (
            <button type="button" className={styles.more} onClick={() => startSearch(request.query, nextCursor)}>
              Load more
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
