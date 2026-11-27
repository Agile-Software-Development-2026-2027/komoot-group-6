
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

import FriendButton from './FriendButton.jsx';
import { useAuth } from '../../context/useAuth.js';

vi.mock('../../context/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

const authFetch = vi.fn();
const USER_ID = 'user-b';
const FRIENDSHIP_ID = 'friendship-123';

beforeEach(() => {
  vi.resetAllMocks();

  useAuth.mockReturnValue({ authFetch });
});

afterEach(cleanup);

describe('FriendButton', () => {
  it.each([
    ['none', 'Add Friend'],
    ['outgoing_pending', 'Cancel Request'],
    ['incoming_pending', 'Accept'],
    ['accepted', 'Remove Friend'],
    ['declined', 'Clear Request'],
  ])(
    'displays the correct button for status %s',
    async (status, buttonName) => {
      authFetch.mockResolvedValueOnce({
        status,
        friendshipId: FRIENDSHIP_ID,
      });

      render(<FriendButton userId={USER_ID} />);

      expect(
        await screen.findByRole('button', {
          name: buttonName,
        })
      ).toBeTruthy();
    }
  );

  it('sends a friend request and updates the button', async () => {
    authFetch
      .mockResolvedValueOnce({
        status: 'none',
        friendshipId: null,
      })
      .mockResolvedValueOnce({
        id: FRIENDSHIP_ID,
        status: 'pending',
      })
      .mockResolvedValueOnce({
        status: 'outgoing_pending',
        friendshipId: FRIENDSHIP_ID,
      });

    render(<FriendButton userId={USER_ID} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Add Friend',
      })
    );

    expect(authFetch).toHaveBeenCalledWith(
      '/friends/request',
      {
        method: 'POST',
        body: { userId: USER_ID },
      }
    );

    expect(
      await screen.findByRole('button', {
        name: 'Cancel Request',
      })
    ).toBeTruthy();
  });

  it.each([
    [
      'incoming_pending',
      'Accept',
      `/friends/${FRIENDSHIP_ID}/accept`,
      'PATCH',
      'accepted',
      'Remove Friend',
    ],
    [
      'incoming_pending',
      'Decline',
      `/friends/${FRIENDSHIP_ID}/decline`,
      'PATCH',
      'declined',
      'Clear Request',
    ],
    [
      'accepted',
      'Remove Friend',
      `/friends/${FRIENDSHIP_ID}`,
      'DELETE',
      'none',
      'Add Friend',
    ],
    [
      'outgoing_pending',
      'Cancel Request',
      `/friends/${FRIENDSHIP_ID}`,
      'DELETE',
      'none',
      'Add Friend',
    ],
    [
      'declined',
      'Clear Request',
      `/friends/${FRIENDSHIP_ID}`,
      'DELETE',
      'none',
      'Add Friend',
    ],
  ])(
    'handles %s using the %s button',
    async (
      initialStatus,
      buttonName,
      endpoint,
      method,
      nextStatus,
      nextButton
    ) => {
      authFetch
        .mockResolvedValueOnce({
          status: initialStatus,
          friendshipId: FRIENDSHIP_ID,
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          status: nextStatus,
          friendshipId:
            nextStatus === 'none' ? null : FRIENDSHIP_ID,
        });

      render(<FriendButton userId={USER_ID} />);

      fireEvent.click(
        await screen.findByRole('button', {
          name: buttonName,
        })
      );

      expect(authFetch).toHaveBeenCalledWith(
        endpoint,
        { method }
      );

      expect(
        await screen.findByRole('button', {
          name: nextButton,
        })
      ).toBeTruthy();
    }
  );

  it('does not display buttons for the current user', async () => {
    authFetch.mockResolvedValueOnce({
      status: 'self',
      friendshipId: null,
    });

    render(<FriendButton userId={USER_ID} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('displays an error when loading fails', async () => {
    authFetch.mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<FriendButton userId={USER_ID} />);

    const alert = await screen.findByRole('alert');

    expect(alert.textContent).toBe(
      'Could not load friendship status.'
    );

    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeTruthy();
  });

  it('disables the button during an operation', async () => {
    let resolveRequest;

    authFetch
      .mockResolvedValueOnce({
        status: 'none',
        friendshipId: null,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          })
      )
      .mockResolvedValueOnce({
        status: 'outgoing_pending',
        friendshipId: FRIENDSHIP_ID,
      });

    render(<FriendButton userId={USER_ID} />);

    const button = await screen.findByRole('button', {
      name: 'Add Friend',
    });

    fireEvent.click(button);

    expect(button.disabled).toBe(true);

    resolveRequest({
      id: FRIENDSHIP_ID,
      status: 'pending',
    });

    expect(
      await screen.findByRole('button', {
        name: 'Cancel Request',
      })
    ).toBeTruthy();
  });
});
