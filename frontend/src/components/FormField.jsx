export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  info,
  autoComplete,
  ...inputProps
}) {
  const messageId = `${name}-message`;
  const infoId = `${name}-info`;

  // Ids of the texts that screen readers read together with the input
  const describedBy = [error || hint ? messageId : null, info ? infoId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={name}>{label}</label>

        {info && (
          <span className="field-info">
            <button
              type="button" // inside a form a button is "submit" by default: this one must not send it
              className="field-info-button"
              aria-label={`${label}: requirements`}
              aria-describedby={infoId}
              // Escape closes the tooltip (the tooltip is visible while the button has focus)
              onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="4.9" r="1" fill="currentColor" />
                <path d="M8 7.2v4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <span id={infoId} role="tooltip" className="field-info-tooltip">
              {info}
            </span>
          </span>
        )}
      </div>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        {...inputProps}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}

      />

      {error ? (
        <small id={messageId} className="field-error">{error}</small>
      ) : (
        hint && <small id={messageId} className="field-hint">{hint}</small>
      )}
    </div>
  );
}