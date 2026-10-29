import MapView from '../components/MapView/MapView.jsx';

// Map page. Components that draw on the map
// (GPX tracks, panels, popups) are added as children of <MapView>.
export default function MapPage() {
  return (
    <main>
      <h1 className="visually-hidden">Map</h1>
      <MapView />
    </main>
  );
}