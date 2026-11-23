import { useCallback, useRef, useState } from 'react';
import { ShareIcon } from '../TrailPage/shareIcons.jsx';
import styles from '../TrailPage/ShareHike.module.css';
import ShareProfileDialog from './ShareProfileDialog.jsx';

// "Share profile" button: opens the window with the link of the public profile and the share options.
export default function ShareProfile({ username, name }) {
  const [open, setOpen] = useState(false);
  const shareButton = useRef(null);
  // Same function at every render: the window does not redo its setup (focus, Escape key) for nothing.
  // When the window closes, the focus goes back to the button.
  const close = useCallback(() => {
    setOpen(false);
    shareButton.current?.focus();
  }, []);

  return (
    <>
      <button ref={shareButton} type="button" className={styles.shareButton} onClick={() => setOpen(true)}>
        <ShareIcon />
        Share profile
      </button>

      {open && <ShareProfileDialog username={username} name={name} onClose={close} />}
    </>
  );
}
