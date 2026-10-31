// Livelli di difficoltà: value è come arriva dal backend, label è il testo mostrato.
export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Intermediate' },
  { value: 'hard', label: 'Difficult' },
];

// { easy: 'Easy', moderate: 'Intermediate', hard: 'Difficult' }
export const DIFFICULTY_LABELS = Object.fromEntries(DIFFICULTIES.map(({ value, label }) => [value, label]));
