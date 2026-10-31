import MapView from '../components/MapView/MapView.jsx';
import NearbyPanel from '../components/NearbyPanel/NearbyPanel.jsx';

// Map page. Components that draw on the map
// (GPX tracks, panels, popups) are added as children of <MapView>.
export default function MapPage() {
  return (
    <main>
      <h1 className="visually-hidden">Map</h1>
      <MapView>
        {/* Sentieri vicini al centro della mappa, con filtri e salvataggio nel profilo */}
        <NearbyPanel />
      </MapView>
    </main>
  );
}
