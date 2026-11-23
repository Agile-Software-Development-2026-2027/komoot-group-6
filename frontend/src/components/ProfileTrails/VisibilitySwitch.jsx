import './VisibilitySwitch.css';

export function VisibilityToggle({ label, hintId, isPublic, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublic}
      aria-label={label}
      aria-describedby={hintId}
      className="visibility-switch"
      disabled={disabled}
      onClick={() => onChange(!isPublic)}
    >
      <span className="visibility-thumb" aria-hidden="true" />
    </button>
  );
}

// Switch to make the profile public or private.
// isPublic: current state; disabled: true while the value is loading or saving;
// onChange(next) receives the new value; error: true if the last save did not succeed.
export default function VisibilitySwitch({ isPublic, disabled = false, onChange, error = false }) {
  return (
    <div className="visibility">
      <div className="visibility-row">
        <span className="visibility-label">Public profile</span>
        <VisibilityToggle label="Public profile" hintId="visibility-hint"
          isPublic={isPublic} disabled={disabled} onChange={onChange} />
      </div>

      <p id="visibility-hint" className="visibility-hint">
        {isPublic
          ? 'Public: others can see your basic info and your activity.'
          : 'Private: only your basic info is visible to others.'}
      </p>

      {error && (
        <p role="alert" className="visibility-error">
          Could not update visibility. Try again.
        </p>
      )}
    </div>
  );
}
