import { useEffect, useRef, useState } from 'react';
import { CAI_TO_DIFFICULTY } from '../../services/trailsService.js';
import { createRecapImage } from '../../utils/recapCard.js';
import {
  formatCompletedDate,
  recapFileName,
  recapStats,
  shareLinks,
  shareText,
} from '../../utils/shareRecap.js';
import { trailImageUrl } from '../../utils/trailImages.js';
import { DIFFICULTY_LABELS } from '../NearbyPanel/difficulty.js';
import { ChatIcon, CloseIcon, CopyIcon, DownloadIcon, GlobeIcon, PostIcon, SendIcon, ShareIcon } from './shareIcons.jsx';
import styles from './ShareHike.module.css';

// How many milliseconds the small confirmation / error message stays visible
const NOTICE_MS = 3000;

function formatType(type) {
  if (!type) return 'Hike';
  const words = type.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Last line of the image: "Hiking · Intermediate (E)"
function footerText(trail) {
  const difficulty = DIFFICULTY_LABELS[CAI_TO_DIFFICULTY[trail.difficulty]];
  const level = difficulty ? ` · ${difficulty} (${trail.difficulty})` : '';
  return `${formatType(trail.trailType)}${level}`;
}


export default function ShareHikeDialog({ feature, durationMin, completedAt, onClose }) {
  const trail = feature.properties;
  const url = `${window.location.origin}/trails/${trail.id}`;
  const text = shareText(trail, durationMin);
  const links = shareLinks(text, url);
  const fileName = recapFileName(trail.name);
  // The system share sheet does not exist in every browser 
  const canShareNatively = typeof navigator.share === 'function';

  // loading -> ready ({ blob, url }) or error (the text and the links still work)
  const [image, setImage] = useState({ status: 'loading' });
  const [notice, setNotice] = useState(null);
  const closeButton = useRef(null);

  // Creates the recap image once, when the window opens
  useEffect(() => {
    let ignore = false;
    let objectUrl = null;
    const date = formatCompletedDate(completedAt);

    createRecapImage({
      name: trail.name,
      kicker: date ? `Completed · ${date}` : 'Completed hike',
      stats: recapStats(trail, durationMin),
      footer: footerText(trail),
      geometry: feature.geometry,
      imageUrl: trailImageUrl(trail.name),
    })
      .then((blob) => {
        if (ignore) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ status: 'ready', blob, url: objectUrl });
      })
      .catch(() => {
        if (!ignore) setImage({ status: 'error' });
      });

    return () => {
      ignore = true;
      // Frees the memory of the image when the window closes
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [feature, trail, durationMin, completedAt]);

  // While the window is open: focus on the close button, Escape closes, the page behind does not scroll
  useEffect(() => {
    closeButton.current?.focus();
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
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

  // System share sheet: with the image if the browser can share files, otherwise text and link only
  async function handleNativeShare() {
    const file = image.blob ? new File([image.blob], fileName, { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: trail.name, text: `${text}\n${url}` });
      } else {
        await navigator.share({ title: trail.name, text, url });
      }
    } catch (err) {
      // AbortError = the user closed the share sheet: nothing to say
      if (err?.name !== 'AbortError') {
        setNotice({ type: 'error', text: 'Could not open the share menu. Try another option.' });
      }
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice({ type: 'success', text: 'Text copied' });
    } catch {
      setNotice({ type: 'error', text: 'Could not copy the text.' });
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
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="share-hike-title">
        <button
          ref={closeButton}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        <div className={styles.preview}>
          {image.status === 'ready' && (
            <img src={image.url} alt={`Recap of the hike ${trail.name}`} className={styles.previewImage} />
          )}
          {image.status === 'loading' && (
            <p className={styles.previewMessage} role="status">Creating your recap...</p>
          )}
          {image.status === 'error' && (
            <p className={styles.previewMessage} role="alert">
              Could not create the image. You can still share the text and the link.
            </p>
          )}
        </div>

        <div className={styles.panel}>
          <h2 id="share-hike-title" className={styles.title}>Share your hike</h2>
          <p className={styles.subtitle}>Show your friends what you have done.</p>

          {/* The text that is sent with the link */}
          <blockquote className={styles.message}>{text}</blockquote>

          {canShareNatively && (
            <button type="button" className={styles.primary} onClick={handleNativeShare}>
              <ShareIcon />
              Share…
            </button>
          )}

          <ul className={styles.socials} aria-label="Share on">
            {socialLinks.map(({ name, href, Icon }) => (
              <li key={name}>
                <a className={styles.social} href={href} target="_blank" rel="noopener noreferrer">
                  <Icon />
                  {name}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.tools}>
            {image.status === 'ready' ? (
              <a className={styles.tool} href={image.url} download={fileName}>
                <DownloadIcon />
                Download image
              </a>
            ) : (
              <button type="button" className={styles.tool} disabled>
                <DownloadIcon />
                Download image
              </button>
            )}
            <button type="button" className={styles.tool} onClick={handleCopy}>
              <CopyIcon />
              Copy text
            </button>
          </div>

          <p className={styles.hint}>
            Instagram: download the image and add it to your story or post.
            {canShareNatively && ' On a phone, choose Instagram from "Share…".'}
          </p>

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
