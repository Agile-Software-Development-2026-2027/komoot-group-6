import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SideMenu from '../components/SideMenu.jsx';
import TrailHeader from '../components/TrailPage/TrailHeader.jsx';
import TrailStats from '../components/TrailPage/TrailStats.jsx';
import { getTrail } from '../services/trailsService.js';
import styles from '../components/TrailPage/TrailPage.module.css';

// Page of one trail, at /trails/:id (e.g. /trails/f4ef6996-...).
// It loads the trail from GET /api/trails/:id and shows it "in big":
// header with photo, stats, description. Map, elevation profile, actions
export default function TrailPage() {
  const { id } = useParams();
  // Increases when the user presses "Try again"
  const [attempt, setAttempt] = useState(0);

  
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
  // the whole route is in "geometry" (used by the map in the next step)
  const trail = state.feature.properties;

  return (
    <article className={styles.content}>
      <Link to="/" className={styles.back}>
        ← Back to map
      </Link>

      <TrailHeader trail={trail} />

      <div className={styles.columns}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="trail-description">
            <h2 id="trail-description">Description</h2>
            <p className={styles.description}>{trail.description || 'No description yet.'}</p>
          </section>
          {/* Next steps: elevation profile, then comments (colleague) */}
        </div>

        <aside className={styles.side}>
          <TrailStats trail={trail} />
        </aside>
      </div>
    </article>
  );
}