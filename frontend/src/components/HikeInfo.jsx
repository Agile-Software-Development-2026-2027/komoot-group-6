import './HikeInfo.css';

// level progress bar shown in the profile header with level name lvl badge and points ratio
export function ProfileLevel({ level, totalPoints }) {
  // true when the user has already reached the maximum level
  const isHighest = level.nextLevelPoints === null;
  const start = level.minPoints ?? 0;

  // percentage of progress between the start of the current level and the next level threshold
  const progress = isHighest
    ? 100
    : Math.min(100, Math.max(0, Math.round(((totalPoints - start) / (level.nextLevelPoints - start)) * 100)));

  return (
    <div className="profile-level" aria-label="User level">
      <div className="profile-level-top">
        {level.name && <span className="profile-level-name">{level.name}</span>}
        <span className="profile-level-badge">
          Lvl <strong>{level.number}</strong>
        </span>
      </div>

      <div
        className="hike-level-bar"
        role="progressbar"
        aria-label="Progress to the next level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="profile-level-bottom">
        <span className="profile-level-next">
          {isHighest
            ? 'Highest level reached'
            : `${level.pointsToNext} points to ${level.nextLevelName ?? `level ${level.number + 1}`}`}
        </span>
        <span className="profile-level-points">
          {isHighest ? `${totalPoints} pts` : `${totalPoints}/${level.nextLevelPoints} pts`}
        </span>
      </div>
    </div>
  );
}
