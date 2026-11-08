
import { useEffect, useState } from 'react';
import { getProfilePoints } from '../services/trailsService';
import './HikeInfo.css';

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
      </div>
    )}
  </section>
);

}
