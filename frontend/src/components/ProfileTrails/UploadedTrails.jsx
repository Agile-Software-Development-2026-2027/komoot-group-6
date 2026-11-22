import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUploadedTrails, updateTrailVisibility } from '../../services/trailUploadsService.js';
import { formatDate } from '../../utils/formatDate.js';
import { formatDistance } from '../../utils/formatTrail.js';
import { VisibilityToggle } from './VisibilitySwitch.jsx';
import './UploadedTrails.css';

export default function UploadedTrails({ authFetch }) {
  const [trails, setTrails] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [updateError, setUpdateError] = useState(null);

  useEffect(() => {
    let active = true;
    getUploadedTrails(authFetch)
      .then((uploads) => {
        if (active) setTrails(uploads);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => { active = false; };
  }, [authFetch, attempt]);

  async function changeVisibility(id, isPublic) {
    setSavingId(id);
    setUpdateError(null);
    try {
      const updated = await updateTrailVisibility(authFetch, id, isPublic);
      setTrails((current) => current.map((trail) => trail.id === id ? updated : trail));
    } catch (error) {
      setUpdateError({ id, message: error.message, existingTrailId: error.data?.existingTrailId });
    } finally {
      setSavingId(null);
    }
  }

  if (loadError) {
    return (
      <div role="alert">
        <p className="profile-status">Could not load your uploads.</p>
        <button type="button" className="profile-outline" onClick={() => {
          setLoadError(false);
          setAttempt((current) => current + 1);
        }}>Try again</button>
      </div>
    );
  }
  if (!trails) return <p className="profile-status" role="status">Loading…</p>;
  if (!trails.length) {
    return (
      <p className="profile-status">
        Open the <Link to="/">map</Link> and use Add GPX to upload your first trail.
      </p>
    );
  }

  return (
    <>
      <p className="uploaded-hint" id="uploaded-trails-visibility">
        Private trails are visible only to you. Other hikers’ bookmarks will show the trail as unavailable until it is public again.
      </p>
      <ul className="uploaded-trails">
        {trails.map((trail) => (
          <li className="uploaded-trail" key={trail.id}>
            <div className="uploaded-info">
              <Link to={`/trails/${encodeURIComponent(trail.id)}`}>{trail.name}</Link>
              <p>{formatDistance(trail.length_m)} · {formatDate(trail.created_at)}</p>
            </div>
            <div className="uploaded-visibility">
              <span>{trail.is_public ? 'Public' : 'Private'}</span>
              <VisibilityToggle
                label={`Public visibility for ${trail.name}`}
                hintId="uploaded-trails-visibility"
                isPublic={trail.is_public}
                disabled={savingId !== null}
                onChange={(isPublic) => changeVisibility(trail.id, isPublic)}
              />
            </div>
            {updateError?.id === trail.id && (
              <p className="uploaded-error" role="alert">
                {updateError.message}
                {updateError.existingTrailId && (
                  <> <Link to={`/trails/${encodeURIComponent(updateError.existingTrailId)}`}>View existing trail</Link></>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
