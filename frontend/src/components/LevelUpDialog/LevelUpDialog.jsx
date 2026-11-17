import { useEffect, useRef } from 'react';
import { getLevelName, MAX_LEVEL } from '../../config/levels.config.js';
import styles from './LevelUpDialog.module.css';

// modal dialog celebrating level up when completing a hike
export default function LevelUpDialog({ level, levelName, onClose }) {
  // numeric level value extracted from prop
  const levelNum = typeof level === 'object' ? level?.number : level;
  // ref to auto-focus continue button
  const continueButtonRef = useRef(null);
  // display name of the newly achieved level
  const resolvedName = levelName ?? getLevelName(levelNum);

  // auto-focus the continue button when dialog opens
  useEffect(() => {
    continueButtonRef.current?.focus();
  }, []);

  // dismiss modal when pressing the escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // dismiss modal when clicking outside the dialog card
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  // do not render popup for progression beyond the max level
  if (typeof levelNum === 'number' && levelNum > MAX_LEVEL) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        <div className={styles.trophyContainer}>
          <svg viewBox="0 0 48 48" width="64" height="64" fill="none" aria-hidden="true">
            <path d="M14 8h20v14a10 10 0 0 1-20 0V8z" fill="#f59e0b" stroke="#d97706" strokeWidth="2.5" />
            <path d="M14 12H8a4 4 0 0 0 4 8h2" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M34 12h6a4 4 0 0 1-4 8h-2" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 32v6" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 38h16" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
            <rect x="14" y="40" width="20" height="4" rx="2" fill="#d97706" />
            <path d="M24 14l1.5 3 3.5.5-2.5 2.5.6 3.5-3.1-1.6-3.1 1.6.6-3.5-2.5-2.5 3.5-.5z" fill="#fef3c7" />
          </svg>
        </div>

        <h2 id="levelup-title" className={styles.title}>
          Congratulation!
        </h2>

        <p className={styles.message}>
          You become a <strong className={styles.levelHighlight}>{resolvedName}</strong> !!!
        </p>

        <button
          ref={continueButtonRef}
          type="button"
          className={styles.continueBtn}
          onClick={onClose}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
