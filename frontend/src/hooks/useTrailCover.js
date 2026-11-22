import { useEffect, useState } from 'react';
import { getTrailCover } from '../services/trailsService.js';

export function useTrailCover(trail, request) {
  const { id, hasLocalCover, imageUrl } = trail ?? {};
  const [localCover, setLocalCover] = useState(null);

  useEffect(() => {
    if (!hasLocalCover) return undefined;

    let active = true;
    let url;
    getTrailCover(id, request)
      .then((photo) => {
        if (!active) return;
        url = URL.createObjectURL(photo);
        setLocalCover({ id, request, url });
      })
      .catch(() => {}); // The existing fallback still works if the file is unavailable.

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasLocalCover, request]);

  const matches = hasLocalCover && localCover?.id === id && localCover.request === request;
  return matches ? localCover.url : imageUrl;
}
