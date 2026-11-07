// "2026-11-06" or "2026-11-06T10:00:00Z" → "6 nov 2026".
// Returns null if the date is missing or not valid, so the caller chooses what to show.
export function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
