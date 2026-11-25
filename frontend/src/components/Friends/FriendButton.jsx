
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';

import {
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriendship,
} from '../../services/friendService.js';

import styles from './FriendButton.module.css';

export default function FriendButton({ userId }) {
  return <FriendActions key={userId} userId={userId} />;
}

function FriendActions({ userId }) {
  const { authFetch } = useAuth();

  const [relationship, setRelationship] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  // Retrieve the current friendship status.
  useEffect(() => {
    let ignore = false;

    getFriendshipStatus(authFetch, userId)
      .then((data) => {
        if (!ignore) {
          setRelationship(data);
          setError('');
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Could not load friendship status.');
        }
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, userId, retry]);

  // Execute a friendship operation and refresh the status.
  async function handleAction(action) {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      await action();

      const updated = await getFriendshipStatus(
        authFetch,
        userId
      );

      setRelationship(updated);
    } catch (err) {
      setError(err.message || 'Could not update friendship.');
      setRetry((previous) => previous + 1);
    } finally {
      setBusy(false);
    }
  }

  if (!relationship) {
    return (
      <div className={styles.actions}>
        {error ? (
          <>
            <span role="alert" className={styles.error}>
              {error}
            </span>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setError('');
                setRetry((previous) => previous + 1);
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <span role="status" className={styles.status}>
            Loading friendship...
          </span>
        )}
      </div>
    );
  }

  const { status, friendshipId } = relationship;

  if (status === 'self') return null;

  return (
    <div className={styles.actions} aria-busy={busy}>

      {status === 'none' && (
        <button
          type="button"
          className={styles.primary}
          disabled={busy}
          onClick={() =>
            handleAction(() =>
              sendFriendRequest(authFetch, userId)
            )
          }
        >
          Add Friend
        </button>
      )}

      {status === 'outgoing_pending' && (
        <>
          <span className={styles.status}>
            Request pending
          </span>

          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() =>
              handleAction(() =>
                removeFriendship(authFetch, friendshipId)
              )
            }
          >
            Cancel Request
          </button>
        </>
      )}

      {status === 'incoming_pending' && (
        <>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              handleAction(() =>
                acceptFriendRequest(authFetch, friendshipId)
              )
            }
          >
            Accept
          </button>

          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() =>
              handleAction(() =>
                declineFriendRequest(authFetch, friendshipId)
              )
            }
          >
            Decline
          </button>
        </>
      )}

      {status === 'accepted' && (
        <>
          <span className={styles.status}>Friends</span>

          <button
            type="button"
            className={styles.danger}
            disabled={busy}
            onClick={() =>
              handleAction(() =>
                removeFriendship(authFetch, friendshipId)
              )
            }
          >
            Remove Friend
          </button>
        </>
      )}

      {status === 'declined' && (
        <>
          <span className={styles.status}>
            Request declined
          </span>

          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() =>
              handleAction(() =>
                removeFriendship(authFetch, friendshipId)
              )
            }
          >
            Clear Request
          </button>
        </>
      )}

      {busy && (
        <span role="status" className={styles.status}>
          Updating...
        </span>
      )}

      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
