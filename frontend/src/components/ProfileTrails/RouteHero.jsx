import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate.js';
import { routeToSvgPath } from '../../utils/routePath.js';
import './RouteHero.css';

const WIDTH = 640;
const HEIGHT = 360;

// The route of the last completed trail, drawn as a single line:
// it is the main element of the profile page. Without completed trails (or without a route)
// it shows an invitation to complete one.
export default function RouteHero({ trail }) {
  const route = trail ? routeToSvgPath(trail.geometry, { width: WIDTH, height: HEIGHT }) : null;

  if (!route) {
    return (
      <p className="route-hero-empty">
        Complete a trail and its route will appear here.
      </p>
    );
  }

  const date = formatDate(trail.date);

  return (
    <figure className="route-hero">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Route of ${trail.name}`}>
        {/* pathLength=1: the length is 1 for any route, so the animation is the same for all */}
        <path d={route.d} pathLength="1" className="route-hero-line" />
        <circle cx={route.start[0]} cy={route.start[1]} r="6" className="route-hero-start" />
        <circle cx={route.end[0]} cy={route.end[1]} r="6" className="route-hero-end" />
      </svg>
      <figcaption>
        Last completed:{' '}
        <Link to={`/trails/${encodeURIComponent(trail.id)}`}>{trail.name}</Link>
        {date && <span className="route-hero-date">{date}</span>}
      </figcaption>
    </figure>
  );
}
