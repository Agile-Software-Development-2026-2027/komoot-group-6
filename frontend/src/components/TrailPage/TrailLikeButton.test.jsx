import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { getTrailLikes, likeTrail, unlikeTrail } from '../../services/trailsService.js';
import TrailLikeButton from './TrailLikeButton.jsx';

const authFetch = vi.fn();

vi.mock('../../context/useAuth.js', () => ({ useAuth: () => ({ authFetch }) }));
vi.mock('../../services/trailsService.js', () => ({
  getTrailLikes: vi.fn(),
  likeTrail: vi.fn(),
  unlikeTrail: vi.fn(),
}));

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';


function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('TrailLikeButton', () => {
  it('loads and shows the total likes', async () => {
    getTrailLikes.mockResolvedValue({ trailId: TRAIL_ID, count: 12, liked: false });
    render(<TrailLikeButton trailId={TRAIL_ID} />);

    // While loading, the button cannot be used
    expect(screen.getByRole('button', { name: 'Like this trail' })).toBeDisabled();

    expect(await screen.findByText('12 people like this trail')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Like this trail' });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('12');
    expect(getTrailLikes).toHaveBeenCalledWith(authFetch, TRAIL_ID);
  });

  it('a click updates heart and number right away, then uses the backend total', async () => {
    getTrailLikes.mockResolvedValue({ trailId: TRAIL_ID, count: 12, liked: false });
    const answer = deferred();
    likeTrail.mockReturnValue(answer.promise);
    render(<TrailLikeButton trailId={TRAIL_ID} />);
    await screen.findByText('12 people like this trail');

    fireEvent.click(screen.getByRole('button', { name: 'Like this trail' }));

    // Before the answer: already "filled" and +1
    const button = screen.getByRole('button', { name: 'Unlike this trail' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('13');
    expect(screen.getByText('You and 12 others like this trail')).toBeInTheDocument();
    expect(likeTrail).toHaveBeenCalledWith(authFetch, TRAIL_ID);

    // Meanwhile another user liked the trail: the backend says 14
    await act(async () => answer.resolve({ trailId: TRAIL_ID, count: 14, liked: true }));
    expect(button).toHaveTextContent('14');
    expect(screen.getByText('You and 13 others like this trail')).toBeInTheDocument();
  });

  it('a second click removes the like', async () => {
    getTrailLikes.mockResolvedValue({ trailId: TRAIL_ID, count: 1, liked: true });
    unlikeTrail.mockResolvedValue({ trailId: TRAIL_ID, count: 0, liked: false });
    render(<TrailLikeButton trailId={TRAIL_ID} />);
    await screen.findByText('You like this trail');

    fireEvent.click(screen.getByRole('button', { name: 'Unlike this trail' }));

    expect(await screen.findByText('Be the first to like this trail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Like this trail' })).toHaveTextContent('0');
    expect(unlikeTrail).toHaveBeenCalledWith(authFetch, TRAIL_ID);
    expect(likeTrail).not.toHaveBeenCalled();
  });

  it('ignores clicks while a request is in progress', async () => {
    getTrailLikes.mockResolvedValue({ trailId: TRAIL_ID, count: 3, liked: false });
    const answer = deferred();
    likeTrail.mockReturnValue(answer.promise);
    render(<TrailLikeButton trailId={TRAIL_ID} />);
    await screen.findByText('3 people like this trail');

    fireEvent.click(screen.getByRole('button', { name: 'Like this trail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlike this trail' }));

    expect(likeTrail).toHaveBeenCalledTimes(1);
    expect(unlikeTrail).not.toHaveBeenCalled();
    await act(async () => answer.resolve({ trailId: TRAIL_ID, count: 4, liked: true }));
  });

  it('goes back to the previous state when the request fails and shows an error that then disappears', async () => {
    getTrailLikes.mockResolvedValue({ trailId: TRAIL_ID, count: 5, liked: false });
    likeTrail.mockRejectedValue(new Error('Cannot reach the server.'));
    render(<TrailLikeButton trailId={TRAIL_ID} />);
    await screen.findByText('5 people like this trail');

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Like this trail' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not like the trail. Try again.');
    const button = screen.getByRole('button', { name: 'Like this trail' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('5');

    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the likes cannot be read and keeps the button disabled', async () => {
    getTrailLikes.mockRejectedValue(new Error('Internal Server Error'));
    render(<TrailLikeButton trailId={TRAIL_ID} />);

    expect(await screen.findByText('Likes are not available right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Like this trail' })).toBeDisabled();
  });
});
