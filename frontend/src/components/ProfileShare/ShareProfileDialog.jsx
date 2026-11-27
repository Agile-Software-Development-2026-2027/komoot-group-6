import { useEffect, useRef, useState } from 'react';
import { NOTICE_MS } from '../../config/ui.config.js';
import { profileShareText, profileUrl, shareLinks } from '../../utils/shareRecap.js';
import { keepFocusInside } from '../../utils/keepFocusInside.js';
import { ChatIcon, CloseIcon, CopyIcon, GlobeIcon, PostIcon, SendIcon, ShareIcon } from '../TrailPage/shareIcons.jsx';
import styles from '../TrailPage/ShareHike.module.css';

// Window to share the link of a public profile: same look and options as "Share your hike", without the image.
export default function ShareProfileDialog({ username, name, onClose }) {
  const url = profileUrl(username);
  const text = profileShareText(name);
  const links = shareLinks(text, url);
  // The system share sheet does not exist in every browser
  const canShareNatively = typeof navigator.share === 'function';

  const [notice, setNotice] = useState(null);
  const dialog = useRef(null);
  const closeButton = useRef(null);

  // While the window is open: focus on the close button, Escape closes, Tab stays in the window,
  // the page behind does not scroll
  useEffect(() => {
    closeButton.current?.focus();
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') keepFocusInside(dialog.current, event);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // The message disappears by itself after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleNativeShare() {
    try {
      await navigator.share({ title: `${name} on hiking`, text, url });
    } catch (err) {
      // AbortError = the user closed the share sheet: nothing to say
      if (err?.name !== 'AbortError') {
        setNotice({ type: 'error', text: 'Could not open the share menu. Try another option.' });
      }
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ type: 'success', text: 'Link copied' });
    } catch {
      setNotice({ type: 'error', text: 'Could not copy the link.' });
    }
  }

  const socialLinks = [
    { name: 'WhatsApp', href: links.whatsapp, Icon: ChatIcon },
    { name: 'Telegram', href: links.telegram, Icon: SendIcon },
    { name: 'X', href: links.x, Icon: PostIcon },
    { name: 'Facebook', href: links.facebook, Icon: GlobeIcon },
  ];

  return (
    // Click on the dark background (outside the window) = close
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className={`${styles.dialog} ${styles.dialogNarrow}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-profile-title"
      >
        <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        <div className={styles.panel}>
          <h2 id="share-profile-title" className={styles.title}>Share this profile</h2>
          <p className={styles.subtitle}>Anyone with the link can open it after logging in.</p>

          {/* The text that is sent with the link */}
          <blockquote className={styles.message}>{text}</blockquote>

          {canShareNatively && (
            <button type="button" className={styles.primary} onClick={handleNativeShare}>
              <ShareIcon />
              Share…
            </button>
          )}

          <ul className={styles.socials} aria-label="Share on">
            {socialLinks.map(({ name: appName, href, Icon }) => (
              <li key={appName}>
                <a className={styles.social} href={href} target="_blank" rel="noopener noreferrer">
                  <Icon />
                  {appName}
                </a>
              </li>
            ))}
          </ul>

          <div className={`${styles.tools} ${styles.toolsOne}`}>
            <button type="button" className={styles.tool} onClick={handleCopy}>
              <CopyIcon />
              Copy link
            </button>
          </div>

          {notice && (
            <p
              role={notice.type === 'error' ? 'alert' : 'status'}
              className={notice.type === 'error' ? styles.noticeError : styles.notice}
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
