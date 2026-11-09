import { useCallback, useEffect, useState } from 'react';
import { getProfileVisibility, setProfileVisibility } from '../services/profileService.js';

// Profile visibility (public / private).
// loading is true until the value arrives from the backend; saving while a change is being saved.
// toggle(next) updates the switch right away and saves: if saving fails it goes back to the previous value
// and error becomes true (it resets on the next attempt).
export function useProfileVisibility(authFetch) {
  const [state, setState] = useState({ isPublic: false, loading: true, saving: false, error: false });

  useEffect(() => {
    let active = true;

    getProfileVisibility(authFetch)
      .then((isPublic) => {
        if (active) setState({ isPublic, loading: false, saving: false, error: false });
      })
      // Backend down or error: the switch stays on the default value (private) and reports the error
      .catch(() => {
        if (active) setState({ isPublic: false, loading: false, saving: false, error: true });
      });

    return () => {
      active = false;
    };
  }, [authFetch]);

  const toggle = useCallback(
    async (next) => {
      setState((current) => ({ ...current, isPublic: next, saving: true, error: false }));

      try {
        const saved = await setProfileVisibility(authFetch, next);
        setState((current) => ({ ...current, isPublic: saved, saving: false }));
      } catch {
        // It is a switch: the previous value was the opposite of the requested one
        setState((current) => ({ ...current, isPublic: !next, saving: false, error: true }));
      }
    },
    [authFetch]
  );

  return { ...state, toggle };
}
