import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { deleteTrailComment, getTrailComments, postTrailComment } from '../../services/trailsService.js';
import { CommentIcon } from './icons.jsx';
import TrailComment from './TrailComment.jsx';
import styles from './TrailComments.module.css';
import pageStyles from './TrailPage.module.css';

const MAX_COMMENT_LENGTH = 2000;

export default function TrailComments({ trailId }) {
  const { isAuthenticated, loading: checkingSession, authFetch } = useAuth();
  const location = useLocation();
  const sectionRef = useRef(null);
  const [request, setRequest] = useState({ cursor: null });
  const [feed, setFeed] = useState({ comments: [], nextCursor: null, status: 'loading' });
  const [deletedIds, setDeletedIds] = useState(() => new Set());
  const [draft, setDraft] = useState('');
  const [submission, setSubmission] = useState('idle');

  useEffect(() => {
    if (location.hash === '#comments') sectionRef.current?.scrollIntoView?.();
  }, [location.hash]);

  useEffect(() => {
    if (checkingSession) return undefined;
    let ignore = false;
    getTrailComments(trailId, request.cursor, isAuthenticated ? authFetch : undefined)
      .then(({ comments, nextCursor }) => {
        if (ignore) return;
        setFeed((current) => ({
          comments: request.cursor ? [...current.comments, ...comments] : comments,
          nextCursor,
          status: 'ready',
        }));
      })
      .catch(() => {
        if (!ignore) setFeed((current) => ({ ...current, status: 'error' }));
      });

    return () => {
      ignore = true;
    };
  }, [trailId, request, checkingSession, isAuthenticated, authFetch]);

  const visibleComments = feed.comments.filter(({ id }) => !deletedIds.has(id));
  const body = draft.trim();
  const length = [...body].length;
  const tooLong = length > MAX_COMMENT_LENGTH;
  const isPosting = submission === 'posting';

  function requestPage(cursor) {
    setFeed((current) => ({ ...current, status: 'loading' }));
    setRequest({ cursor });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAuthenticated || isPosting || !body || tooLong) return;

    setSubmission('posting');
    try {
      await postTrailComment(authFetch, trailId, body);
      setDraft('');
      setSubmission('posted');
      requestPage(null);
    } catch {
      setSubmission('error');
    }
  }

  async function handleDelete(commentId) {
    await deleteTrailComment(authFetch, trailId, commentId);
    // An earlier page request may still be in flight when the deletion succeeds.
    setDeletedIds((current) => new Set(current).add(commentId));
  }

  return (
    <section
      ref={sectionRef}
      id="comments"
      className={`${pageStyles.section} ${pageStyles.comments} ${styles.section}`}
      aria-labelledby="trail-comments"
    >
      <div className={styles.content}>
        <div className={styles.headingRow}>
          <h2 id="trail-comments" className={styles.heading}><CommentIcon /> Comments</h2>
          {!checkingSession && !isAuthenticated && (
            <Link
              className={styles.secondary}
              to="/login"
              state={{ from: { pathname: location.pathname, search: location.search, hash: '#comments' } }}
            >
              Log in to comment
            </Link>
          )}
        </div>

        {isAuthenticated && (
          <form className={styles.composer} onSubmit={handleSubmit}>
            <label htmlFor="trail-comment-body">Your comment</label>
            <textarea
              id="trail-comment-body"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setSubmission('idle');
              }}
              placeholder="Share a tip about the route…"
              rows={4}
              readOnly={isPosting}
              aria-describedby="trail-comment-length"
              aria-invalid={tooLong}
            />
            <div className={styles.formActions}>
              <span id="trail-comment-length" className={tooLong ? styles.error : styles.count}>
                {length.toLocaleString('en-US')} / 2,000
              </span>
              <button type="submit" className={styles.primary} disabled={isPosting || !body || tooLong}>
                {isPosting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </form>
        )}

        {submission === 'error' && (
          <p className={styles.error} role="alert">Could not post your comment. Try again.</p>
        )}
        {submission === 'posted' && <p className="visually-hidden" role="status">Comment posted.</p>}

        {visibleComments.length > 0 && (
          <ol className={styles.thread} role="list">
            {visibleComments.map((comment) => (
              <TrailComment
                key={comment.id}
                comment={comment}
                onDelete={isAuthenticated && comment.isMine ? handleDelete : undefined}
              />
            ))}
          </ol>
        )}

        {feed.status === 'loading' && <p className={styles.message} role="status">Loading comments…</p>}
        {feed.status === 'error' && (
          <div className={styles.feedError}>
            <p className={styles.error} role="alert">Could not load comments.</p>
            <button type="button" className={styles.secondary} onClick={() => requestPage(request.cursor)}>
              Try again
            </button>
          </div>
        )}
        {feed.status === 'ready' && visibleComments.length === 0 && !feed.nextCursor && (
          <p className={styles.message}>No comments yet.</p>
        )}
        {feed.status === 'ready' && feed.nextCursor && (
          <button type="button" className={styles.secondary} onClick={() => requestPage(feed.nextCursor)}>
            Load earlier comments
          </button>
        )}
      </div>
    </section>
  );
}
