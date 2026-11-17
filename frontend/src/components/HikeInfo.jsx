
import { useEffect, useState } from 'react';
import { getProfilePoints } from '../services/trailsService';
import './HikeInfo.css';

// Level of the user, with a bar that shows how far the next level is.
// level: { number, name, minPoints, nextLevelPoints, nextLevelName, pointsToNext } from GET /api/profile/points
function LevelCard({ level, totalPoints }) {
  const isHighest = level.nextLevelPoints === null;
  const start = level.minPoints ?? 0;
  // Share of the way from the start of this level to the next one, from 0 to 100
  const progress = isHighest
    ? 100
    : Math.min(100, Math.max(0, Math.round(((totalPoints - start) / (level.nextLevelPoints - start)) * 100)));

  return (
    <div className="hike-stat-card hike-level-card">
      <span className="hike-stat-icon" aria-hidden="true">
        ▲
      </span>
      <span className="hike-stat-label">Level</span>
      <strong className="hike-stat-value">{level.number}</strong>
      {level.name && <span className="hike-level-name">{level.name}</span>}
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
      <span className="hike-stat-footer">
        {isHighest
          ? 'Highest level reached'
          : `${level.pointsToNext} points to ${level.nextLevelName ?? `level ${level.number + 1}`}`}
      </span>
    </div>
  );
}

export default function HikeInfo({ authFetch }) {
  const [points, setPoints] = useState(null);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointsError, setPointsError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPoints() {
      try {
        setLoadingPoints(true);

        const result = await getProfilePoints(authFetch);

        if (active) {
          setPoints(result);
          setPointsError(null);
        }
      } catch (error) {
        if (active) {
          setPointsError(error.message);
        }
      } finally {
        if (active) {
          setLoadingPoints(false);
        }
      }
    }

    loadPoints();

    return () => {
      active = false;
    };
  }, [authFetch]);

  
return (
  <section className="profile-points">
    <div className="hike-header">
      <h2>Hiking Progress</h2>
      <p>Your hiking achievements</p>
    </div>

    {loadingPoints ? (
      <p className="hike-message">Loading points...</p>
    ) : pointsError ? (
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

        {/* Only when the backend sends the level (database/levels.sql) */}
        {points?.level && <LevelCard level={points.level} totalPoints={points.totalPoints ?? 0} />}
      </div>
    )}
  </section>
);

}