// Tests for the trail page: the four states (loading, ready, not found, error).
// The backend is fake: getTrail is mocked, the menu is replaced by nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '../services/api.js';
import { getTrail } from '../services/trailsService.js';
import TrailPage from './TrailPage.jsx';

vi.mock('../services/trailsService.js', async (importOriginal) => ({
  ...(await importOriginal()), // keeps CAI_TO_DIFFICULTY
  getTrail: vi.fn(),
}));
// The real SideMenu needs a logged-in user (AuthProvider): not needed here
vi.mock('../components/SideMenu.jsx', () => ({ default: () => null }));

// The real map (MapLibre) cannot run in tests: a simple box that shows what it receives
vi.mock('../components/TrailPage/TrailMap.jsx', () => ({
  default: ({ trail }) => <div data-testid="trail-map">{trail.geometry.type}</div>,
}));

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';

// What GET /api/trails/:id returns: a Feature with the route as geometry
const FEATURE = {
  type: 'Feature',
  id: TRAIL_ID,
  geometry: { type: 'LineString', coordinates: [[16.2275, 39.359], [16.2281, 39.3597]] },
  properties: {
    id: TRAIL_ID,
    name: 'Anello del Campus UniCal',
    description: 'Giro ad anello tra i viali del campus.',
    trailType: 'hiking',
    difficulty: 'T',
    lengthM: 4003,
    ascentM: 40,
    descentM: 40,
    maxElevationM: 240,
    estDurationMin: 60,
    startPoint: [16.2275, 39.359],
  },
};

// The map receives the whole Feature, route included
expect(screen.getByTestId('trail-map').textContent).toBe('LineString');
// Opens /trails/:id as if the user typed the address
function renderPage(id = TRAIL_ID) {
  render(
    <MemoryRouter initialEntries={[`/trails/${id}`]}>
      <Routes>
        <Route path="/trails/:id" element={<TrailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TrailPage', () => {
  it('shows "loading" and then the trail with its details', async () => {
    getTrail.mockResolvedValue(FEATURE);
    renderPage();

    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
    expect(await screen.findByRole('heading', { level: 1, name: 'Anello del Campus UniCal' })).toBeTruthy();
    expect(getTrail).toHaveBeenCalledWith(TRAIL_ID);

    // Difficulty T is shown as "Easy", the type with a capital letter
    expect(screen.getByText('Easy')).toBeTruthy();
    expect(screen.getByText('Hiking')).toBeTruthy();
    // Stats, formatted
    expect(screen.getByText('1:00 h')).toBeTruthy();
    expect(screen.getByText('4 km')).toBeTruthy();
    expect(screen.getByText('240 m')).toBeTruthy();
    expect(screen.getByText('Giro ad anello tra i viali del campus.')).toBeTruthy();
  });

  it('estimates the duration when the trail does not have one', async () => {
    getTrail.mockResolvedValue({
      ...FEATURE,
      properties: { ...FEATURE.properties, estDurationMin: null, lengthM: 8000, ascentM: 0 },
    });
    renderPage();

    // 8 km at 4 km/h = 2 hours
    expect(await screen.findByText('2:00 h')).toBeTruthy();
  });

  it('shows "Trail not found" for 404', async () => {
    getTrail.mockRejectedValue(new ApiError('Trail not found', 404));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Trail not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to the map/i }).getAttribute('href')).toBe('/');
  });

  it('shows "Trail not found" also for an id that is not valid (400)', async () => {
    getTrail.mockRejectedValue(new ApiError('Invalid trail id', 400));
    renderPage('abc');

    expect(await screen.findByRole('heading', { name: 'Trail not found' })).toBeTruthy();
  });

  it('shows an error and loads again with "Try again"', async () => {
    getTrail.mockRejectedValueOnce(new ApiError('Cannot reach the server. Please try again later.', 0));
    getTrail.mockResolvedValueOnce(FEATURE);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Could not load the trail' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Anello del Campus UniCal' })).toBeTruthy();
    expect(getTrail).toHaveBeenCalledTimes(2);
  });
});