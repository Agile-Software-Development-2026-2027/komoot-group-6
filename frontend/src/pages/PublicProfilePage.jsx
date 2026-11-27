import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import { ProfileLevel } from '../components/HikeInfo.jsx';
import ShareProfile from '../components/ProfileShare/ShareProfile.jsx';
import ProfileTrailList from '../components/ProfileTrails/ProfileTrailList.jsx';
import { ChevronLeftIcon } from '../components/TrailPage/icons.jsx';
import { useAuth } from '../context/useAuth.js';
import { getPublicProfile } from '../services/profileService.js';
import { formatDate } from '../utils/formatDate.js';
import { formatDistance, formatElevation } from '../utils/formatTrail.js';
import { completedTotals } from '../utils/profileStats.js';
import { resolveTrails } from './useProfileTrails.js';
import './ProfilePage.css';

// Messages for the answers of the backend that are not a real error
const NOT_AVAILABLE = {
  404: 'Profile not found',
  403: 'This profile is private',
};

// A statistic: the big number with the label below it.
function Stat({ label, value }) {
  return (
    <div className="profile-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Public page of a user, opened with a link (/users/:username) or from the profile search.
// Shows level, points and completed trails; a private or unknown profile shows a message instead.
export default function PublicProfilePage() {
  const { username } = useParams();
  const { authFetch } = useAuth();
  // Goes up when the user presses "Try again"
  const [attempt, setAttempt] = useState(0);
  // Which request (profile and attempt) the answer in `state` belongs to
  const requestKey = `${username}#${attempt}`;
  // profile: the data of the page; failure: { status } of the last error
  const [state, setState] = useState({ key: null, profile: null, completed: [], failure: null });

  useEffect(() => {
    // Ignores the answer if the user went to another profile in the meantime
    let active = true;

    getPublicProfile(authFetch, username)
      .then(async (profile) => {
        const entries = profile.completedTrails.map((trail) => ({
          trail_id: trail.trailId,
          completed_at: trail.completedAt,
        }));
        const completed = await resolveTrails(entries, 'completed_at');
        if (active) setState({ key: requestKey, profile, completed, failure: null });
      })
      .catch((error) => {
        if (active) {
          setState({ key: requestKey, profile: null, completed: [], failure: { status: error.status ?? 0 } });
        }
      });

    return () => {
      active = false;
    };
  }, [authFetch, username, requestKey]);

  // An answer for another profile (or a previous attempt) does not count: the page is loading
  const current = state.key === requestKey ? state : { profile: null, completed: [], failure: null };
  const { profile, completed, failure } = current;

  // The own profile has its own page
  if (profile?.isMine) return <Navigate to="/profile" replace />;

  const totals = completedTotals(completed);
  const name = profile?.displayName?.trim() || profile?.username;

  return (
    <main className="profile-page">
      <div className="profile-content">
        <nav className="profile-bar" aria-label="Profile">
          <Link to="/" className="profile-back">
            <ChevronLeftIcon />
            Back to home
          </Link>
        </nav>

        {!profile && !failure && <p role="status" className="profile-status">Loading…</p>}

        {failure && NOT_AVAILABLE[failure.status] && (
          <section role="alert">
            <h1>{NOT_AVAILABLE[failure.status]}</h1>
          </section>
        )}
        {failure && !NOT_AVAILABLE[failure.status] && (
          <div role="alert">
            <p className="profile-status">Could not load this profile.</p>
            <button type="button" className="profile-outline" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </div>
        )}

        {profile && (
          <>
            <header className="profile-heading">
              <div className="profile-identity">
                <span className="profile-avatar"><Avatar name={name} size="lg" /></span>
                <div className="profile-heading-text">
                  <h1>{name}</h1>
                  <p className="profile-username">@{profile.username}</p>
                  {profile.bio?.trim() && <p>{profile.bio}</p>}
                  {formatDate(profile.createdAt) && (
                    <p className="profile-username">Member since {formatDate(profile.createdAt)}</p>
                  )}
                  <div className="profile-share">
                    <ShareProfile username={profile.username} name={name} />
                  </div>
                </div>
              </div>

              <ProfileLevel level={profile.level} totalPoints={profile.totalPoints} />
            </header>

            <dl className="profile-stats" aria-label="Statistics">
              <Stat label="Completed trails" value={profile.completedTrails.length} />
              <Stat label="Total points" value={profile.totalPoints} />
              <Stat label="Total distance" value={formatDistance(totals.lengthM)} />
              <Stat label="Total ascent" value={`↑ ${formatElevation(totals.ascentM)}`} />
            </dl>

            <section aria-labelledby="public-profile-trails">
              <h2 id="public-profile-trails" className="profile-section-title">Trails</h2>
              <ProfileTrailList trails={completed} emptyText={`${name} hasn't completed any trails yet.`} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
