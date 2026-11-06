import { CAI_TO_DIFFICULTY } from '../../services/trailsService.js';
import { DIFFICULTY_LABELS } from '../NearbyPanel/difficulty.js';
import styles from './TrailPage.module.css';

// The CAI scale (Club Alpino Italiano), from the easiest to the hardest grade,
// with what each grade means for the hiker.
const CAI_GRADES = [
  {
    code: 'T',
    name: 'Tourist',
    text: 'Wide, clear paths or mule tracks, short and with little climbing. No orientation problems: suitable for everyone.',
  },
  {
    code: 'E',
    name: 'Hiking',
    text: 'Marked trails on varied ground (woods, meadows, stony stretches). Some walking experience and hiking boots are needed.',
  },
  {
    code: 'EE',
    name: 'Expert hikers',
    text: 'Steep or rough ground, scree and exposed passages, sometimes without markings. Experience, a sure foot and good equipment are needed.',
  },
  {
    code: 'EEA',
    name: 'Expert hikers with equipment',
    text: 'Equipped routes (via ferrata): harness, lanyards and helmet are required.',
  },
];

// Section that explains the difficulty: a small scale with the four CAI grades
// (the one of this trail is highlighted) and what that grade means.
// "code" = the difficulty of the trail in the database (T, E, EE or EEA).
export default function TrailDifficulty({ code }) {
  const grade = CAI_GRADES.find((g) => g.code === code);
  if (!grade) return null;

  const level = CAI_TO_DIFFICULTY[code];

  return (
    <section className={styles.section} aria-labelledby="trail-difficulty">
      <h2 id="trail-difficulty">Difficulty</h2>

      <ol className={styles.scale} aria-label="CAI difficulty scale">
        {CAI_GRADES.map((g) => (
          <li
            key={g.code}
            className={g.code === code ? `${styles.scaleStep} ${styles[level]}` : styles.scaleStep}
            aria-current={g.code === code ? 'true' : undefined}
          >
            {g.code}
          </li>
        ))}
      </ol>

      <p className={styles.gradeName}>
        {DIFFICULTY_LABELS[level]} · {grade.code} ({grade.name})
      </p>
      <p className={styles.sectionText}>{grade.text}</p>
    </section>
  );
}