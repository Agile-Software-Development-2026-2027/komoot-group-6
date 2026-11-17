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

// renders user hiking stats using points data provided by profile page
export default function HikeInfo({ pointsData }) {
  // read points loading and error from props passed by parent
  const points = pointsData?.data;
  const isLoading = Boolean(pointsData?.loading);
  const error = pointsData?.error ?? null;

  return (
    <section className="profile-points">
      <div className="hike-header">
        <h2>Hiking Progress</h2>
        <p>Your hiking achievements</p>
      </div>

      {isLoading ? (
        <p className="hike-message">Loading points...</p>
      ) : error ? (
        <p className="hike-error" role="alert">
          Unable to load points.
        </p>
      ) : (
        <div className="hike-stats">
          <div className="hike-stat-card hike-points-card">
            <span className="hike-stat-icon" aria-hidden="true">
              ★
            </span>
            <span className="hike-stat-label">Total Points</span>
            <strong className="hike-stat-value">
              {points?.totalPoints ?? 0}
            </strong>
            <span className="hike-stat-footer">
              Points earned
            </span>
          </div>

          <div className="hike-stat-card">
            <span className="hike-stat-icon" aria-hidden="true">
              ✓
            </span>
            <span className="hike-stat-label">
              Completed Trails
            </span>
            <strong className="hike-stat-value">
              {points?.completedRoutes ?? 0}
            </strong>
            <span className="hike-stat-footer">
              Routes explored
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
