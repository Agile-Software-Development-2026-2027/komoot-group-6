import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import LogoutButton from '../components/LogoutButton.jsx';
import ProfileTrailList from '../components/ProfileTrails/ProfileTrailList.jsx';
import RouteHero from '../components/ProfileTrails/RouteHero.jsx';
import VisibilitySwitch from '../components/ProfileTrails/VisibilitySwitch.jsx';
import { ChevronLeftIcon } from '../components/TrailPage/icons.jsx';
import { useAuth } from '../context/useAuth.js';
import { formatDate } from '../utils/formatDate.js';
import { formatDistance, formatElevation } from '../utils/formatTrail.js';
import { completedTotals } from '../utils/profileStats.js';
import { useProfileTrails } from './useProfileTrails.js';
import { useProfileVisibility } from './useProfileVisibility.js';
import './ProfilePage.css';

const EMPTY = '—';

// A label / value row of the Account card.
function Row({ label, children }) {
  return (
    <div className="profile-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// A statistic: the big number with the label below it (in the code the label comes first, for screen readers).
function Stat({ label, value }) {
  return (
    <div className="profile-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Full-screen profile page. At the top the avatar and name, then the statistics.
// Below: on the left (sticky while scrolling) the Account card, on the right the Saved, Completed and Last route tabs.
export default function ProfilePage() {
  const { user, authFetch } = useAuth();
  const name = user.displayName || user.username || user.email;

  const { saved, completed, loading, error, retry } = useProfileTrails(authFetch);
  const visibility = useProfileVisibility(authFetch);
  const [tab, setTab] = useState('saved');
  const tabRefs = useRef({});

  // Statistics: shown only once the data is loaded
  const ready = !loading && !error;
  const totals = completedTotals(completed);
  const stats = [
    { label: 'Completed trails', value: ready ? completed.length : EMPTY },
    { label: 'Total distance', value: ready ? formatDistance(totals.lengthM) : EMPTY },
    { label: 'Total ascent', value: ready ? `↑ ${formatElevation(totals.ascentM)}` : EMPTY },
    { label: 'Saved trails', value: ready ? saved.length : EMPTY },
  ];

  // Saved and Completed show a list; Last route shows the route of the last completed trail
  const tabs = [
    { id: 'saved', label: 'Saved', trails: saved, emptyText: "You haven't saved any trails yet." },
    { id: 'completed', label: 'Completed', trails: completed, emptyText: "You haven't completed any trails yet." },
    { id: 'route', label: 'Last route' },
  ];
  const current = tabs.find(({ id }) => id === tab);

  // Left/right arrows move from one tab to the next, in the direction pressed
  function handleKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(tabs.findIndex(({ id }) => id === tab) + step + tabs.length) % tabs.length];
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <main className="profile-page">
      <div className="profile-content">
        <nav className="profile-bar" aria-label="Profile">
          <Link to="/" className="profile-back">
            <ChevronLeftIcon />
            Back to home
          </Link>
        </nav>

        <header className="profile-heading">
          <span className="profile-avatar"><Avatar name={name} size="lg" /></span>
          <div className="profile-heading-text">
            <h1>{name}</h1>
            {user.username && <p className="profile-username">@{user.username}</p>}
          </div>
        </header>

        <dl className="profile-stats" aria-label="Statistics">
          {stats.map(({ label, value }) => <Stat key={label} label={label} value={value} />)}
        </dl>

        <div className="profile-columns">
          {/* Left column, narrow and sticky on desktop: Account card */}
          <aside className="profile-side">
            <section className="profile-card" aria-labelledby="profile-account">
              <div className="profile-card-head">
                <h2 id="profile-account" className="profile-section-title">Account</h2>
                {/* There is no page to edit the profile yet: the button is disabled */}
                <button type="button" className="profile-outline" disabled title="Coming soon">
                  Edit profile
                </button>
              </div>

              <dl className="profile-list">
                <Row label="Email">{user.email}</Row>
                <Row label="Username">{user.username || EMPTY}</Row>
                <Row label="Display name">{user.displayName || EMPTY}</Row>
                <Row label="Date of birth">
                  {formatDate(user.birthDate) ?? (
                    <button type="button" className="profile-add" disabled title="Coming soon">
                      Add
                    </button>
                  )}
                </Row>
                <Row label="Member since">{formatDate(user.createdAt) ?? EMPTY}</Row>
              </dl>

              <VisibilitySwitch
                isPublic={visibility.isPublic}
                disabled={visibility.loading || visibility.saving}
                onChange={visibility.toggle}
                error={visibility.error}
              />

              <LogoutButton className="profile-logout" />
            </section>
          </aside>

          {/* Right column, wide: Saved, Completed and Last route tabs */}
          <section className="profile-main" aria-labelledby="profile-trails">
            <h2 id="profile-trails" className="profile-section-title">Trails</h2>

            <div className="profile-tabs" role="tablist" aria-label="Trails" onKeyDown={handleKeyDown}>
              {tabs.map(({ id, label, trails }) => (
                <button
                  key={id}
                  ref={(element) => { tabRefs.current[id] = element; }}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls="trails-panel"
                  tabIndex={tab === id ? 0 : -1}
                  className="profile-tab"
                  onClick={() => setTab(id)}
                >
                  {label}{trails && ready && ` (${trails.length})`}
                </button>
              ))}
            </div>

            <div id="trails-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {loading && <p role="status" className="profile-status">Loading…</p>}
              {error && (
                <div role="alert">
                  <p className="profile-status">Could not load your trails.</p>
                  <button type="button" className="profile-outline" onClick={retry}>Try again</button>
                </div>
              )}
              {ready && (tab === 'route' ? (
                <RouteHero trail={completed[0] ?? null} />
              ) : (
                <ProfileTrailList trails={current.trails} emptyText={current.emptyText} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
