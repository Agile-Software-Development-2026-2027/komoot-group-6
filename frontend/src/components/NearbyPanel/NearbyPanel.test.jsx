import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ApiError } from '../../services/api.js';
import NearbyPanel from './NearbyPanel.jsx';

// Test di questo file:
// 1 Cerca attorno al centro della mappa con il raggio iniziale e mostra le card
// 2 Lo slider rifà la ricerca una sola volta, quando smette di muoversi
// 3 Quando la mappa si sposta cerca attorno al nuovo centro (ma non per pochi metri)
// 4 Il filtro difficoltà (a scelta multipla) lavora sui risultati, senza nuove richieste
// 5 Se la ricerca fallisce mostra l'errore e "Try again" la ripete
// 6 Il segnalibro salva il sentiero nel profilo
// 7 La freccia chiude e riapre la lista
// 8 Cliccando un sentiero la mappa vola lì, compare il segnaposto e la lista non cambia
// 9 Se la prima posizione GPS arriva dopo il click, la mappa torna sul sentiero (una volta sola)

const mock = vi.hoisted(() => ({ map: null, authFetch: null }));

vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({ current: { getMap: () => mock.map } }),
  // Il segnaposto finto mostra dove è stato messo
  Marker: ({ longitude, latitude, children }) => (
    <div data-testid="trail-marker" data-lng={longitude} data-lat={latitude}>{children}</div>
  ),
}));

vi.mock('../../context/useAuth.js', () => ({
  useAuth: () => ({ authFetch: mock.authFetch }),
}));

const TRAILS = [
  { id: 't1', name: 'Sentiero del Crati', difficulty: 'easy', lengthM: 8400, elevationGainM: 320, distanceM: 850, start: [16.24, 39.37] },
  { id: 't2', name: 'Monte Cocuzzo', difficulty: 'hard', lengthM: 14200, elevationGainM: 1150, distanceM: 6300, start: [16.3, 39.4] },
];

// Mappa finta: ha centro e zoom e permette di simulare la fine di uno spostamento (moveend).
// moveTo è l'utente che sposta la mappa; jumpTo e flyTo passano a moveend i dati dell'evento, come MapLibre.
function createFakeMap(center) {
  const handlers = {};
  const map = {
    center,
    zoom: 10,
    getCenter: () => map.center,
    getZoom: () => map.zoom,
    on: (type, handler) => { handlers[type] = handler; },
    off: (type, handler) => { if (handlers[type] === handler) delete handlers[type]; },
    moveTo: (next) => {
      map.center = next;
      handlers.moveend?.({});
    },
    // Come moveTo, ma è il GPS a spostare la mappa (MapLibre lo segnala con geolocateSource)
    gpsMoveTo: (next) => {
      map.center = next;
      handlers.moveend?.({ geolocateSource: true });
    },
    jumpTo: vi.fn((options, eventData) => handlers.moveend?.({ ...eventData })),
    flyTo: vi.fn((options, eventData) => {
      map.center = { lng: options.center[0], lat: options.center[1] };
      handlers.moveend?.({ ...eventData });
    }),
  };
  return map;
}

// Fa passare l'attesa prima della ricerca e lascia arrivare la risposta
async function waitForSearch() {
  await act(() => vi.advanceTimersByTimeAsync(1000));
}

beforeEach(() => {
  vi.useFakeTimers();
  mock.map = createFakeMap({ lng: 16.2281, lat: 39.3562 });
  mock.authFetch = vi.fn().mockResolvedValue({ trails: TRAILS });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('searches around the map center with the default radius and shows the cards', async () => {
  render(<NearbyPanel />);
  expect(screen.getByRole('status')).toHaveTextContent('Searching for trails...');
  expect(screen.queryAllByRole('article')).toHaveLength(0);

  await waitForSearch();

  // Centro arrotondato a 3 decimali, raggio iniziale di 25 km in metri
  expect(mock.authFetch).toHaveBeenCalledTimes(1);
  expect(mock.authFetch).toHaveBeenCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=25000');
  expect(screen.getByRole('status')).toHaveTextContent('2 trails within 25 km of the map center');

  const cards = screen.getAllByRole('article');
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByRole('heading', { name: 'Sentiero del Crati' })).toBeInTheDocument();
  expect(cards[0]).toHaveTextContent('850 m away');
  expect(cards[0]).toHaveTextContent('Easy');
  expect(cards[0]).toHaveTextContent('2:38 h');
  expect(cards[1]).toHaveTextContent('14.2 km');
  expect(cards[1]).toHaveTextContent('1150 m');
});

test('the radius slider searches again only once, after it stops moving', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  const slider = screen.getByRole('slider', { name: 'Search radius' });
  fireEvent.change(slider, { target: { value: '30' } });
  fireEvent.change(slider, { target: { value: '35' } });
  expect(screen.getByText('35 km')).toBeInTheDocument();

  await waitForSearch();

  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(mock.authFetch).toHaveBeenLastCalledWith('/trails/nearby?lat=39.356&lng=16.228&radius=35000');
  expect(screen.getByRole('status')).toHaveTextContent('within 35 km');
});

test('searches around the new center when the map moves (but not for a few meters)', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  // Pochi metri: dopo l'arrotondamento il centro è lo stesso
  act(() => mock.map.moveTo({ lng: 16.22812, lat: 39.35618 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);

  act(() => mock.map.moveTo({ lng: 16.5, lat: 39.4 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(mock.authFetch).toHaveBeenLastCalledWith('/trails/nearby?lat=39.4&lng=16.5&radius=25000');
});

test('the multi-select difficulty filter works on the results without new requests', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Difficult' }));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Monte Cocuzzo' })).toBeInTheDocument();

  // Le difficoltà si sommano
  fireEvent.click(screen.getByRole('checkbox', { name: 'Easy' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);

  // Solo Intermediate: nessun sentiero
  fireEvent.click(screen.getByRole('checkbox', { name: 'Difficult' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Easy' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Intermediate' }));
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  expect(screen.getByRole('status')).toHaveTextContent('No trails with the selected difficulty within 25 km');

  // Nessuna selezionata = tutte
  fireEvent.click(screen.getByRole('checkbox', { name: 'Intermediate' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);

  expect(mock.authFetch).toHaveBeenCalledTimes(1);
});

test('shows the error when the search fails and "Try again" repeats it', async () => {
  mock.authFetch.mockRejectedValueOnce(new ApiError('Cannot reach the server. Please try again later.', 0));
  render(<NearbyPanel />);
  await waitForSearch();

  expect(screen.getByRole('status')).toHaveTextContent('Cannot reach the server. Please try again later.');
  expect(screen.queryAllByRole('article')).toHaveLength(0);

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitForSearch();

  expect(mock.authFetch).toHaveBeenCalledTimes(2);
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
});

test('the bookmark saves the trail to the profile', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  mock.authFetch.mockResolvedValueOnce({ trailId: 't1' });
  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(mock.authFetch).toHaveBeenLastCalledWith('/profile/saved-trails', {
    method: 'POST',
    body: { trailId: 't1' },
  });
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeDisabled();
});

test('the arrow hides and shows the list', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('button', { name: 'Hide trail list' }));

  expect(screen.getByRole('button', { name: 'Show trail list' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  // Il numero di sentieri resta visibile anche a lista chiusa
  expect(screen.getByRole('status')).toHaveTextContent('2 trails within 25 km');

  fireEvent.click(screen.getByRole('button', { name: 'Show trail list' }));
  expect(screen.getAllByRole('article')).toHaveLength(2);
});

test('clicking a trail flies the map there, shows the pin and keeps the list', async () => {
  render(<NearbyPanel />);
  await waitForSearch();
  expect(screen.queryByTestId('trail-marker')).not.toBeInTheDocument();
  // La mappa è molto vicina (come quando segue il GPS): il volo usa comunque lo zoom 13
  mock.map.zoom = 16;

  fireEvent.click(screen.getByRole('button', { name: 'Monte Cocuzzo' }));

  // Prima sblocca l'eventuale inseguimento del GPS, poi vola al punto di partenza
  expect(mock.map.jumpTo).toHaveBeenCalledWith({}, expect.anything());
  expect(mock.map.flyTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [16.3, 39.4], zoom: 13 }),
    expect.anything()
  );
  expect(mock.map.jumpTo.mock.invocationCallOrder[0]).toBeLessThan(mock.map.flyTo.mock.invocationCallOrder[0]);

  const marker = screen.getByTestId('trail-marker');
  expect(marker).toHaveAttribute('data-lng', '16.3');
  expect(marker).toHaveAttribute('data-lat', '39.4');
  expect(screen.getByRole('button', { name: 'Monte Cocuzzo' })).toHaveAttribute('aria-current', 'true');

  // Il volo fatto dal pannello non rifà la ricerca: la lista resta uguale
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole('article')).toHaveLength(2);

  // Se poi è l'utente a spostare la mappa, la ricerca riparte dal nuovo centro
  act(() => mock.map.moveTo({ lng: 16.5, lat: 39.5 }));
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
});

test('if the first GPS fix arrives after the click, the map goes back to the trail (only once)', async () => {
  render(<NearbyPanel />);
  await waitForSearch();

  fireEvent.click(screen.getByRole('button', { name: 'Monte Cocuzzo' }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(1);

  // Il GPS trova l'utente e sposta la mappa su di lui: la mappa torna sul sentiero, la lista non cambia
  act(() => mock.map.gpsMoveTo({ lng: 16.2, lat: 39.3 }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(2);
  expect(mock.map.flyTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [16.3, 39.4] }), expect.anything());
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(1);

  // Un altro movimento del GPS (per esempio l'utente preme il pulsante della posizione) vale normalmente
  act(() => mock.map.gpsMoveTo({ lng: 16.2, lat: 39.3 }));
  expect(mock.map.flyTo).toHaveBeenCalledTimes(2);
  await waitForSearch();
  expect(mock.authFetch).toHaveBeenCalledTimes(2);
});
