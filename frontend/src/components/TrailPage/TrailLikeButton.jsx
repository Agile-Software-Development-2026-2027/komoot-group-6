import { useEffect, useRef, useState } from 'react';
import { NOTICE_MS } from '../../config/ui.config.js';
import { useAuth } from '../../context/useAuth.js';
import { getTrailLikes, likeTrail, unlikeTrail } from '../../services/trailsService.js';
import { formatLikes, likesText } from '../../utils/formatLikes.js';
import { HeartIcon } from './icons.jsx';
import styles from './TrailLikeButton.module.css';

// Like button of the trail, over the cover photo.
// Shows the heart (filled if the user has already liked the trail) and the total likes.
// A click updates heart and number right away, without waiting for the backend.
// when the answer arrives, the backend total is used.
// if the request fails, everything goes back to how it was and a message appears.
export default function TrailLikeButton({ trailId }) {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState('loading');
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [error, setError] = useState(null);
  const [burst, setBurst] = useState(0);
  // true while a request is in progress: extra clicks are ignored
  const pending = useRef(false);

  useEffect(() => {
    // True if the user leaves the page before the answer arrives: the answer is ignored
    let ignore = false;

    getTrailLikes(authFetch, trailId)
      .then((data) => {
        if (ignore) return;
        setLikes({ count: data.count, liked: data.liked });
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('unavailable');
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, trailId]);

  // The error message disappears by itself after a few seconds
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleClick() {
    if (pending.current || status !== 'ready') return;
    pending.current = true;

    const before = likes;
    const nextLiked = !before.liked;
    setLikes({ liked: nextLiked, count: Math.max(0, before.count + (nextLiked ? 1 : -1)) });
    setError(null);
    if (nextLiked) setBurst((n) => n + 1);

    try {
      const data = await (nextLiked ? likeTrail : unlikeTrail)(authFetch, trailId);
      setLikes({ count: data.count, liked: data.liked });
    } catch {
      setLikes(before);
      setError(nextLiked ? 'Could not like the trail. Try again.' : 'Could not remove your like. Try again.');
    } finally {
      pending.current = false;
    }
  }

  const { count, liked } = likes;
  const ready = status === 'ready';

  let text = likesText(count, liked);
  if (status === 'loading') text = 'Loading likes...';
  if (status === 'unavailable') text = 'Likes are not available right now';

  return (
    <div className={styles.likes}>
      <button
        type="button"
        className={`${styles.likeButton} ${liked ? styles.isLiked : ''}`}
        onClick={handleClick}
        disabled={!ready}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike this trail' : 'Like this trail'}
        title={liked ? 'Remove your like' : 'Like this trail'}
      >
        {/* The key changes at every new like: React recreates the span and the animation restarts */}
        <span key={burst} className={`${styles.likeHeart} ${burst > 0 && liked ? styles.likePop : ''}`}>
          <HeartIcon filled={liked} />
        </span>
        <span className={styles.likeCount} aria-hidden="true">
          {ready ? formatLikes(count) : '–'}
        </span>
      </button>

      {/* aria-live: screen readers read the sentence when the number changes */}
      <p className={styles.likeText} aria-live="polite">{text}</p>

      {error && (
        <p role="alert" className={styles.likeError}>{error}</p>
      )}
    </div>
  );
}
