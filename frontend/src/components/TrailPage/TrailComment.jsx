import { useRef, useState } from 'react';
import { formatDate } from '../../utils/formatDate.js';
import Avatar from '../Avatar.jsx';
import styles from './TrailComments.module.css';

export default function TrailComment({ comment, onDelete }) {
  const { id, authorName, authorUsername, createdAt, body } = comment;
  const deleteButton = useRef(null);
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const confirming = deleteStatus !== 'idle';
  const deleting = deleteStatus === 'deleting';
  const confirmationId = `delete-comment-${id}`;

  function cancelDeletion() {
    setDeleteStatus('idle');
    deleteButton.current?.focus();
  }

  async function confirmDeletion() {
    if (deleting) return;
    setDeleteStatus('deleting');
    try {
      await onDelete(id);
    } catch {
      setDeleteStatus('error');
    }
  }

  return (
    <li className={styles.comment}>
      <Avatar name={authorName} size="sm" />
      <div>
        <div className={styles.commentHeader}>
          <div className={styles.byline}>
            <strong>{authorName}</strong>
            {authorUsername && authorUsername !== authorName && <span>@{authorUsername}</span>}
            {onDelete && <span className={styles.ownerBadge}>You</span>}
            <time dateTime={createdAt}>{formatDate(createdAt)}</time>
          </div>
          {onDelete && (
            <button
              ref={deleteButton}
              type="button"
              className={`${styles.secondary} ${styles.deleteButton}`}
              aria-label="Delete your comment"
              aria-expanded={confirming}
              aria-controls={confirming ? confirmationId : undefined}
              disabled={deleting}
              onClick={confirming ? cancelDeletion : () => setDeleteStatus('confirm')}
            >
              Delete
            </button>
          )}
        </div>
        <p className={styles.body}>{body}</p>
        {onDelete && confirming && (
          <div id={confirmationId} className={styles.deleteConfirmation}>
            <p>Delete this comment?</p>
            <div className={styles.deleteActions}>
              <button type="button" className={styles.secondary} disabled={deleting} onClick={cancelDeletion}>
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.primary} ${styles.danger}`}
                disabled={deleting}
                onClick={confirmDeletion}
              >
                {deleting ? 'Deleting…' : 'Delete comment'}
              </button>
            </div>
            {deleteStatus === 'error' && (
              <p className={styles.error} role="alert">Could not delete the comment. Try again.</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
