import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NOTICE_MS } from '../../config/ui.config.js';
import ShareProfile from './ShareProfile.jsx';

const TEXT = "Check out Alba's hiking profile! 🥾";
// The link starts with the public address of the site (VITE_SITE_URL, set in beforeEach)
const LINK = 'https://hike.test/users/alba_trek';

function openDialog() {
  render(<ShareProfile username="alba_trek" name="Alba" />);
  fireEvent.click(screen.getByRole('button', { name: 'Share profile' }));
  return screen.getByRole('dialog', { name: 'Share this profile' });
}

beforeEach(() => {
  vi.stubEnv('VITE_SITE_URL', 'https://hike.test');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  delete navigator.share;
});

it('opens the window with the text and the share links of the profile', () => {
  const dialog = openDialog();

  expect(within(dialog).getByText(TEXT)).toBeInTheDocument();
  const whatsapp = within(dialog).getByRole('link', { name: 'WhatsApp' });
  expect(whatsapp).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(`${TEXT}\n${LINK}`)}`);
  expect(whatsapp).toHaveAttribute('target', '_blank');
  expect(within(dialog).getByRole('link', { name: 'Telegram' })).toBeInTheDocument();
  expect(within(dialog).getByRole('link', { name: 'X' })).toBeInTheDocument();
  expect(within(dialog).getByRole('link', { name: 'Facebook' })).toBeInTheDocument();
});

it('closes with the close button and with Escape, giving the focus back to the button', () => {
  const dialog = openDialog();
  const shareButton = screen.getByRole('button', { name: 'Share profile' });

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(shareButton).toHaveFocus();

  fireEvent.click(shareButton);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shares the link with the system share sheet when the browser has one', async () => {
  navigator.share = vi.fn().mockResolvedValue();
  const dialog = openDialog();

  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Share…' }));
  });

  expect(navigator.share).toHaveBeenCalledWith({ title: 'Alba on hiking', text: TEXT, url: LINK });
});

it('does not show "Share…" when the browser has no share sheet', () => {
  const dialog = openDialog();

  expect(within(dialog).queryByRole('button', { name: 'Share…' })).not.toBeInTheDocument();
});

it('copies the link and shows a message that then disappears', async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const dialog = openDialog();

  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy link' }));
  });

  expect(writeText).toHaveBeenCalledWith(LINK);
  expect(within(dialog).getByText('Link copied')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(NOTICE_MS));
  expect(within(dialog).queryByText('Link copied')).not.toBeInTheDocument();
});

it('tells the user when the link cannot be copied', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    configurable: true,
  });
  const dialog = openDialog();

  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy link' }));
  });

  expect(within(dialog).getByRole('alert')).toHaveTextContent('Could not copy the link.');
});
