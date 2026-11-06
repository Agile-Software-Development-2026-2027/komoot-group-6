import { Link, useInRouterContext } from 'react-router-dom';
import { ChevronRightIcon } from './icons.jsx';

// Address of the page of one trail (the "Hike Page"): /trails/<id>
function trailPagePath(trailId) {
  return `/trails/${encodeURIComponent(trailId)}`;
}

// Link to the page of a trail, used by the card in "Trails nearby" and by the popup on the map.
// Inside the app it is a React Router <Link>: the page changes without reloading the site.
// Outside a router (e.g. in the older tests of the card and of the popup) it is a normal <a>.
// A small ">" icon is added after the text.
export default function TrailDetailsLink({ trailId, className, children }) {
  const inRouter = useInRouterContext();
  const to = trailPagePath(trailId);

  if (!trailId) return null;

  const content = (
    <>
      {children}
      <ChevronRightIcon />
    </>
  );

  return inRouter ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <a href={to} className={className}>
      {content}
    </a>
  );
}