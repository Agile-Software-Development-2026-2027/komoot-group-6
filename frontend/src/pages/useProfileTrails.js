import { useEffect, useState } from 'react';
import { CAI_TO_DIFFICULTY, getCompletedTrails, getSavedTrails, getTrail } from '../services/trailsService.js';

// The profile lists contain only the trail ids: here the details of each one are loaded.
// Keep entries for trails that became private so the user's activity does not disappear.
async function resolveTrails(entries, dateKey, authFetch) {
  const results = await Promise.allSettled(entries.map((entry) => getTrail(entry.trail_id, authFetch)));
  return results.flatMap((result, index) => {
    const id = entries[index].trail_id;
    const date = entries[index][dateKey];
    if (result.status === 'rejected') {
      return result.reason?.status === 404 ? [{ id, date, unavailable: true }] : [];
    }
    const props = result.value?.properties ?? {};
    return [{
      id,
      name: props.name,
      difficulty: CAI_TO_DIFFICULTY[props.difficulty] ?? props.difficulty ?? null,
      lengthM: props.lengthM,
      ascentM: props.ascentM,
      // The whole route: needed to draw the route of the last completed trail
      geometry: result.value?.geometry ?? null,
      date,
    }];
  });
}

// Trails saved and completed by the user, with name and data.
// loading is true until both have arrived; error if one of the two lists cannot be loaded.
export function useProfileTrails(authFetch) {
  const [state, setState] = useState({ saved: [], completed: [], loading: true, error: false });
  // Goes up when the user presses "Try again": it reruns the loading
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      getSavedTrails(authFetch).then((list) => resolveTrails(list, 'created_at', authFetch)),
      getCompletedTrails(authFetch).then((list) => resolveTrails(list, 'completed_at', authFetch)),
    ])
      .then(([saved, completed]) => {
        if (active) setState({ saved, completed, loading: false, error: false });
      })
      .catch(() => {
        if (active) setState({ saved: [], completed: [], loading: false, error: true });
      });

    return () => {
      active = false;
    };
  }, [authFetch, attempt]);

  // Puts the state back to "loading" and reruns the requests
  function retry() {
    setState((current) => ({ ...current, loading: true, error: false }));
    setAttempt((n) => n + 1);
  }

  return { ...state, retry };
}
