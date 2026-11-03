// Livelli di difficoltà usati da card e filtri: value è il livello, label è il testo mostrato.
// Il backend usa la scala CAI (T, E, EE, EEA): la converte trailsService.js.
export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Intermediate' },
  { value: 'hard', label: 'Difficult' },
];

// { easy: 'Easy', moderate: 'Intermediate', hard: 'Difficult' }
export const DIFFICULTY_LABELS = Object.fromEntries(DIFFICULTIES.map(({ value, label }) => [value, label]));
