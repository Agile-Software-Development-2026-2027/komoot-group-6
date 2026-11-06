import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SideMenu from '../components/SideMenu.jsx';
import TrailComments from '../components/TrailPage/TrailComments.jsx';
import TrailDifficulty from '../components/TrailPage/TrailDifficulty.jsx';
import TrailHeader from '../components/TrailPage/TrailHeader.jsx';
import TrailMap from '../components/TrailPage/TrailMap.jsx';
import TrailShare from '../components/TrailPage/TrailShare.jsx';
import TrailStart from '../components/TrailPage/TrailStart.jsx';
import TrailStats from '../components/TrailPage/TrailStats.jsx';
import { ChevronLeftIcon } from '../components/TrailPage/icons.jsx';
import { getTrail } from '../services/trailsService.js';
import { estimateDurationMin } from '../utils/formatTrail.js';
import { isLoop } from '../utils/routeShape.js';
import { trailSummary } from '../utils/trailSummary.js';
import styles from '../components/TrailPage/TrailPage.module.css';

// Page of one trail (the "Hike Page"), at /trails/:id (e.g. /trails/f4ef6996-...).
// It loads the trail from GET /api/trails/:id and shows it like a Komoot tour:
// big photo with the name, key numbers and a one-sentence summary, the map with the
// route, description on the left with difficulty and start on the right, then the comments.
export default function TrailPage() {
  const { id } = useParams();
  // Increases when the user presses "Try again"
  const [attempt, setAttempt] = useState(0);

  // "key": when the id (or the attempt) changes, React creates a new
  // TrailContent from scratch, so it starts again from "loading"
  return (
    <main className={styles.page}>
      <SideMenu />
      <TrailContent key={`${id}-${attempt}`} id={id} onRetry={() => setAttempt((n) => n + 1)} />
    </main>
  );
}

// Loads the trail and shows one of four states: loading, ready, not found, error
function TrailContent({ id, onRetry }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    // True if the user leaves the page before the answer arrives: the answer is ignored
    let ignore = false;

    getTrail(id)
      .then((feature) => {
        if (!ignore) setState({ status: 'ready', feature });
      })
      .catch((error) => {
        if (ignore) return;
        // 404 = no trail with this id, 400 = the id is not even a valid UUID
        const notFound = error.status === 404 || error.status === 400;
        setState({ status: notFound ? 'not-found' : 'error', message: error.message });
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <p className={styles.message} role="status">
        Loading trail...
      </p>
    );
  }

  if (state.status === 'not-found') {
    return (
      <section className={styles.message}>
        <h1>Trail not found</h1>
        <p>This trail does not exist or has been removed.</p>
        <Link to="/" className={styles.messageLink}>Back to the map</Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className={styles.message} role="alert">
        <h1>Could not load the trail</h1>
        <p>{state.message}</p>
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      </section>
    );
  }

  // The answer is a GeoJSON Feature: the data is in "properties",
  // the whole route is in "geometry" (the map uses the whole Feature)
  const { feature } = state;
  const trail = feature.properties;
  // Not every trail has an estimated duration: we estimate it from length and ascent
  const durationMin = trail.estDurationMin ?? estimateDurationMin(trail.lengthM, trail.ascentM);
  const loop = isLoop(trail.startPoint, feature.geometry);

  return (
    <article className={styles.content}>
      {/* "Share your hike" appears on the right only if the user has completed this trail (SCRUM-14) */}
      <div className={styles.topBar}>
        <Link to="/" className={styles.back}>
          <ChevronLeftIcon />
          Back to map
        </Link>
        <TrailShare feature={feature} durationMin={durationMin} />
      </div>

      <TrailHeader trail={trail} />

      {/* The trail at a glance: numbers and one sentence built from them */}
      <div className={styles.overview}>
        <TrailStats trail={trail} durationMin={durationMin} />
        <p className={styles.summary}>{trailSummary(trail, durationMin, loop)}</p>
      </div>

      <section className={styles.mapSection} aria-labelledby="trail-route">
        <h2 id="trail-route">Route</h2>
        <TrailMap trail={feature} />
      </section>

      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="trail-description">
          <h2 id="trail-description">About this trail</h2>
          <p className={styles.sectionText}>{trail.description || 'No description yet.'}</p>
        </section>

        <aside className={styles.side}>
          <TrailDifficulty code={trail.difficulty} />
          <TrailStart startPoint={trail.startPoint} />
        </aside>
      </div>

      {/* Placeholder: the colleague of SCRUM-16 develops the comments here */}
      <TrailComments trailId={trail.id} />
    </article>
  );
}