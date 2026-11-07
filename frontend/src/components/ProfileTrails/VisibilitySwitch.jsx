import './VisibilitySwitch.css';

// Switch to make the profile public or private.
// isPublic: current state; disabled: true while the value is loading or saving;
// onChange(next) receives the new value; error: true if the last save did not succeed.
export default function VisibilitySwitch({ isPublic, disabled = false, onChange, error = false }) {
  return (
    <div className="visibility">
      <div className="visibility-row">
        <span id="visibility-label" className="visibility-label">Public profile</span>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-labelledby="visibility-label"
          aria-describedby="visibility-hint"
          className="visibility-switch"
          disabled={disabled}
          onClick={() => onChange(!isPublic)}
        >
          <span className="visibility-thumb" aria-hidden="true" />
        </button>
      </div>

      <p id="visibility-hint" className="visibility-hint">
        {isPublic
          ? 'Public: other users can see your profile.'
          : 'Private: only you can see your profile.'}
      </p>

      {error && (
        <p role="alert" className="visibility-error">
          Could not update visibility. Try again.
        </p>
      )}
    </div>
  );
}
