import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { getCompletedTrails } from '../../services/trailsService.js';
import ShareHikeDialog from './ShareHikeDialog.jsx';
import { ShareIcon } from './shareIcons.jsx';
import styles from './ShareHike.module.css';

// It is shown only if the logged-in user has marked this trail as completed
// The click opens the window with the recap image and the share options.
export default function TrailShare({ feature, durationMin }) {
  const { authFetch } = useAuth();
  const trailId = feature.properties.id;
  // null = not completed (or not known yet), otherwise { completedAt }
  const [completion, setCompletion] = useState(null);
  const [open, setOpen] = useState(false);
  const shareButton = useRef(null);
  // Same function at every render: the window does not redo its setup (focus, Escape key) for nothing.
  // When the window closes, the focus goes back to "Share your hike".
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
      // Without the list we cannot know if the hike was done: the button simply does not appear
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [authFetch, trailId]);

  if (!completion) return null;

  return (
    <>
      <button ref={shareButton} type="button" className={styles.shareButton} onClick={() => setOpen(true)}>
        <ShareIcon />
        Share your hike
      </button>

      {open && (
        <ShareHikeDialog
          feature={feature}
          durationMin={durationMin}
          completedAt={completion.completedAt}
          onClose={close}
        />
      )}
    </>
  );
}
