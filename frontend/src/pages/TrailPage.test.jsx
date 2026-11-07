// Tests for the trail page: the four states (loading, ready, not found, error).
// The backend is fake: getTrail is mocked.
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

    // Type and difficulty over the photo (T = Easy)
    expect(screen.getByText('Easy · T')).toBeTruthy();
    // Key numbers, formatted
    const stats = screen.getAllByRole('definition').map((dd) => dd.textContent);
    expect(stats).toEqual(['1:00 h', '4 km', '40 m', '40 m', '240 m']);
    // One sentence built from the data: the route ends less than 100 m from the start = round trip
    expect(screen.getByText(/^An easy round trip of 4 km: about 1:00 h on foot/)).toBeTruthy();
    expect(screen.getByText('Giro ad anello tra i viali del campus.')).toBeTruthy();
    // The map receives the whole Feature, route included
    expect(screen.getByTestId('trail-map').textContent).toBe('LineString');
  });

  it('explains the difficulty and links to the directions to the start', async () => {
    getTrail.mockResolvedValue(FEATURE);
    renderPage();

    await screen.findByRole('heading', { level: 1 });

    // CAI scale: the grade of this trail is the current one
    const scale = screen.getByRole('list', { name: 'CAI difficulty scale' });
    expect(scale.querySelector('[aria-current="true"]').textContent).toBe('T');
    expect(screen.getByText('Easy · T (Tourist)')).toBeTruthy();

    const directions = screen.getByRole('link', { name: 'Get directions' });
    expect(directions.getAttribute('href')).toBe('https://www.google.com/maps/dir/?api=1&destination=39.359,16.2275');
    expect(screen.getByText('39.3590° N, 16.2275° E')).toBeTruthy();
  });

  it('has the placeholder of the comments section', async () => {
    getTrail.mockResolvedValue(FEATURE);
    renderPage();

    const comments = await screen.findByRole('region', { name: 'Comments' });
    expect(comments.id).toBe('comments');
    expect(comments.dataset.trailId).toBe(TRAIL_ID);
    expect(comments.textContent).toMatch(/no comments yet/i);
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