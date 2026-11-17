import { useEffect, useState } from 'react';
import { getProfilePoints } from '../services/trailsService';
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

export default function HikeInfo({ authFetch, pointsData }) {
  const [fetchedPoints, setFetchedPoints] = useState(null);
  const [loadingPoints, setLoadingPoints] = useState(!pointsData);
  const [pointsError, setPointsError] = useState(null);

  useEffect(() => {
    // skip fetching when the parent page already provides the points data
    if (pointsData !== undefined) return undefined;
    let active = true;

    async function loadPoints() {
      try {
        setLoadingPoints(true);

        const result = await getProfilePoints(authFetch);

        if (active) {
          setFetchedPoints(result);
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
  }, [authFetch, pointsData]);

  // use data passed by parent when available otherwise fallback to local state
  const points = pointsData !== undefined ? pointsData.data : fetchedPoints;
  const isLoading = pointsData !== undefined ? pointsData.loading : loadingPoints;
  const error = pointsData !== undefined ? pointsData.error : pointsError;

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
