import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { getCompletedTrails } from '../../services/trailsService.js';
import ShareHikeDialog from './ShareHikeDialog.jsx';
import { ShareIcon } from './shareIcons.jsx';
import styles from './ShareHike.module.css';

// Completed hikes use the recap copy. Other trails can still be shared.
export default function TrailShare({ feature, durationMin }) {
  const { authFetch } = useAuth();
  const trailId = feature.properties.id;
  // null = not completed (or not known yet), otherwise { completedAt }
  const [completion, setCompletion] = useState(null);
  const [open, setOpen] = useState(false);
  const shareButton = useRef(null);
  // Same function at every render: the window does not redo its setup (focus, Escape key) for nothing.
  // When the window closes, focus returns to the share button.
  const close = useCallback(() => {
    setOpen(false);
    shareButton.current?.focus();
  }, []);

  useEffect(() => {
    // True if the user leaves the page before the answer arrives: the answer is ignored
    let ignore = false;

    getCompletedTrails(authFetch)
      .then((items) => {
        if (ignore) return;
        const item = (items ?? []).find((entry) => entry.trail_id === trailId);
        setCompletion(item ? { completedAt: item.completed_at } : null);
      })
      // Keep the standard trail share if completion status is unavailable.
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [authFetch, trailId]);

  return (
    <>
      <button ref={shareButton} type="button" className={styles.shareButton} onClick={() => setOpen(true)}>
        <ShareIcon />
        {completion ? 'Share your hike' : 'Share trail'}
      </button>

      {open && (
        <ShareHikeDialog
          feature={feature}
          durationMin={durationMin}
          completed={Boolean(completion)}
          completedAt={completion?.completedAt}
          onClose={close}
        />
      )}
    </>
  );
}
