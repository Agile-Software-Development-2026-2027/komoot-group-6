// Reusable form field: label + input + hint or error message.
// The login form can use it too.
export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  autoComplete,
}) {
  const messageId = `${name}-message`;

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        // Screen readers announce the field as invalid and read the message
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error ? (
        <small id={messageId} className="field-error">{error}</small>
      ) : (
        hint && <small id={messageId} className="field-hint">{hint}</small>
      )}
    </div>
  );
}