import styles from './MapToolbar.module.css';

// Column of round buttons in the top-right corner of the map.
// Each button opens a panel: nearby trails for now, then leaderboard, filters...
export default function MapToolbar({ children }) {
  return (
    <div className={styles.toolbar} role="group" aria-label="Map tools">
      {children}
    </div>
  );
}

// One button of the toolbar: highlighted while its panel is open
export function ToolbarButton({ label, icon, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.button} ${isActive ? styles.active : ''}`}
      aria-label={label}
      aria-expanded={isActive}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}