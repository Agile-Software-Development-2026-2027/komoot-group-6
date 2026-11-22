// Tests for the trail page: the four states (loading, ready, not found, error).
// The backend is fake: getTrail is mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from '../App.jsx';
import { ApiError } from '../services/api.js';
import { deleteTrailComment, getTrail, getTrailComments, postTrailComment } from '../services/trailsService.js';
import TrailPage from './TrailPage.jsx';

vi.mock('../services/trailsService.js', async (importOriginal) => ({
  ...(await importOriginal()), // keeps CAI_TO_DIFFICULTY
  getTrail: vi.fn(),
  deleteTrailComment: vi.fn(),
  getTrailComments: vi.fn(),
  postTrailComment: vi.fn(),
  // Likes (SCRUM-15): 12 by default, not yet liked by the user
  getTrailLikes: vi.fn(() => Promise.resolve({ count: 12, liked: false })),
}));
vi.mock('../context/useAuth.js', () => ({ useAuth: () => auth }));

const auth = { isAuthenticated: true, user: { id: 'author' }, loading: false, authFetch: vi.fn(), login: vi.fn() };

// The real map (MapLibre) cannot run in tests: a simple box that shows what it receives
vi.mock('../components/TrailPage/TrailMap.jsx', () => ({
  default: ({ trail }) => <div data-testid="trail-map">{trail.geometry.type}</div>,
}));
// "Share your hike" has its own tests (TrailShare.test.jsx)
vi.mock('../components/TrailPage/TrailShare.jsx', () => ({ default: () => null }));
vi.mock('./HomePage.jsx', () => ({ default: () => null }));

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';
const COMMENT = {
  id: 'c10ed016-f34f-432e-90db-55c4936eca12',
  authorName: 'Hiker',
  authorUsername: null,
  body: 'Water available at the start.',
  createdAt: '2026-11-16T10:01:00+00:00',
  isMine: false,
};

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

beforeEach(() => {
  auth.isAuthenticated = true;
  auth.user = { id: 'author' };
  getTrailComments.mockResolvedValue({ comments: [], nextCursor: null });
});

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
    expect(getTrail).toHaveBeenCalledWith(TRAIL_ID, auth.authFetch, { includeCover: true });

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

  it('shows the like button with the total likes on the cover', async () => {
    getTrail.mockResolvedValue(FEATURE);
    renderPage();

    const hero = (await screen.findByRole('heading', { level: 1 })).closest('header');
    const like = await within(hero).findByRole('button', { name: 'Like this trail' });
    await waitFor(() => {
      expect(like.textContent).toBe('12');
    });
    expect(within(hero).getByText('12 people like this trail')).toBeTruthy();
  });

  it('shows the empty state and composer for a signed-in user', async () => {
    getTrail.mockResolvedValue(FEATURE);
    renderPage();

    const comments = await screen.findByRole('region', { name: 'Comments' });
    expect(comments.id).toBe('comments');
    expect(await within(comments).findByText('No comments yet.')).toBeTruthy();
    expect(within(comments).getByLabelText('Your comment')).toBeTruthy();
    expect(within(comments).getByRole('button', { name: 'Post comment' }).disabled).toBe(true);
    expect(getTrailComments).toHaveBeenCalledWith(TRAIL_ID, null, auth.authFetch);
  });

  it('redirects guests to login before loading the trail and returns to the comments after login', async () => {
    auth.isAuthenticated = false;
    auth.user = null;
    auth.login.mockImplementationOnce(async () => {
      auth.isAuthenticated = true;
      auth.user = { id: 'author' };
    });
    getTrail.mockResolvedValue(FEATURE);
    getTrailComments.mockResolvedValue({ comments: [COMMENT], nextCursor: null });
    render(
      <MemoryRouter initialEntries={[`/trails/${TRAIL_ID}#comments`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Comments' })).toBeNull();
    expect(getTrail).not.toHaveBeenCalled();
    expect(getTrailComments).not.toHaveBeenCalled();

    const scrollIntoView = vi.fn();
    const previous = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hiker@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
      fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

      expect(await screen.findByLabelText('Your comment')).toBeTruthy();
      expect(await screen.findByText(COMMENT.body)).toBeTruthy();
      expect(getTrailComments).toHaveBeenCalledWith(TRAIL_ID, null, auth.authFetch);
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    } finally {
      Element.prototype.scrollIntoView = previous;
    }
  });

  it('marks a private comment as owned and deletes only that comment after confirmation', async () => {
    const ownComment = { ...COMMENT, id: 'my-comment', body: 'My trail tip.', isMine: true };
    getTrail.mockResolvedValue(FEATURE);
    getTrailComments.mockResolvedValue({ comments: [ownComment, COMMENT], nextCursor: null });
    deleteTrailComment.mockRejectedValueOnce(new ApiError('Could not reach the server', 0));
    deleteTrailComment.mockResolvedValueOnce(null);
    renderPage();

    const own = within((await screen.findByText(ownComment.body)).closest('li'));
    const other = within(screen.getByText(COMMENT.body).closest('li'));
    expect(own.getByText('You')).toBeTruthy();
    expect(other.queryByText('You')).toBeNull();
    expect(other.queryByRole('button', { name: 'Delete your comment' })).toBeNull();

    fireEvent.click(own.getByRole('button', { name: 'Delete your comment' }));
    fireEvent.click(own.getByRole('button', { name: 'Cancel' }));
    expect(deleteTrailComment).not.toHaveBeenCalled();

    fireEvent.click(own.getByRole('button', { name: 'Delete your comment' }));
    fireEvent.click(own.getByRole('button', { name: 'Delete comment' }));
    expect(await own.findByRole('alert')).toBeTruthy();
    expect(own.getByText(ownComment.body)).toBeTruthy();

    fireEvent.click(own.getByRole('button', { name: 'Delete comment' }));
    await waitFor(() => expect(screen.queryByText(ownComment.body)).toBeNull());
    expect(screen.getByText(COMMENT.body)).toBeTruthy();
    expect(deleteTrailComment).toHaveBeenLastCalledWith(auth.authFetch, TRAIL_ID, ownComment.id);
  });

  it('keeps the draft after a failed submission and reloads comments after success', async () => {
    getTrail.mockResolvedValue(FEATURE);
    postTrailComment.mockRejectedValueOnce(new ApiError('Could not reach the server', 0));
    postTrailComment.mockResolvedValueOnce(null);
    getTrailComments.mockResolvedValueOnce({ comments: [], nextCursor: null });
    getTrailComments.mockResolvedValueOnce({ comments: [COMMENT], nextCursor: null });
    renderPage();

    const comments = within(await screen.findByRole('region', { name: 'Comments' }));
    await comments.findByText('No comments yet.');
    const editor = comments.getByLabelText('Your comment');
    const submit = comments.getByRole('button', { name: 'Post comment' });
    fireEvent.change(editor, { target: { value: ` ${COMMENT.body} ` } });
    fireEvent.click(submit);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(editor.value).toBe(` ${COMMENT.body} `);
    fireEvent.click(submit);

    expect(within(await comments.findByRole('list')).getByText(COMMENT.body)).toBeTruthy();
    expect(editor.value).toBe('');
    expect(postTrailComment).toHaveBeenLastCalledWith(auth.authFetch, TRAIL_ID, COMMENT.body);
    expect(getTrailComments).toHaveBeenCalledTimes(2);
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
