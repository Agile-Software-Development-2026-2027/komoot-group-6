import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NOTICE_MS } from '../../config/ui.config.js';
import { getCompletedTrails } from '../../services/trailsService.js';
import { createRecapImage } from '../../utils/recapCard.js';
import TrailShare from './TrailShare.jsx';

const authFetch = vi.fn();

vi.mock('../../context/useAuth.js', () => ({ useAuth: () => ({ authFetch }) }));
vi.mock('../../services/trailsService.js', async (importOriginal) => ({
  ...(await importOriginal()), // keeps CAI_TO_DIFFICULTY
  getCompletedTrails: vi.fn(),
}));
vi.mock('../../utils/recapCard.js', () => ({ createRecapImage: vi.fn() }));

const TRAIL_ID = 'f4ef6996-f2e9-4462-9d86-a56d15cbaff2';

// What GET /api/trails/:id returns: a Feature with the route as geometry
const FEATURE = {
  type: 'Feature',
  id: TRAIL_ID,
  geometry: { type: 'LineString', coordinates: [[16.52, 39.24], [16.5, 39.25]] },
  properties: {
    id: TRAIL_ID,
    name: 'Anello del Lago Arvo',
    trailType: 'hiking',
    difficulty: 'E',
    lengthM: 14500,
    ascentM: 250,
    startPoint: [16.52, 39.24],
  },
};

const TEXT = 'I completed "Anello del Lago Arvo"! 🥾 14.5 km · est. 4:00 h · 250 m ascent';
// The link starts with the public address of the site (VITE_SITE_URL, set in beforeEach)
const LINK = `https://hike.test/trails/${TRAIL_ID}`;

function completed() {
  getCompletedTrails.mockResolvedValue([
    { trail_id: 'another-trail', completed_at: '2026-10-01T09:00:00Z' },
    { trail_id: TRAIL_ID, completed_at: '2026-11-06T10:00:00Z' },
  ]);
}

// Opens the page part and then the share window
async function openDialog() {
  render(<TrailShare feature={FEATURE} durationMin={240} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Share your hike' }));
  return screen.getByRole('dialog', { name: 'Share your hike' });
}

beforeEach(() => {
  vi.stubEnv('VITE_SITE_URL', 'https://hike.test');
  createRecapImage.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  URL.createObjectURL = vi.fn(() => 'blob:recap');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  delete navigator.share;
  delete navigator.canShare;
});

describe('TrailShare', () => {
  it('does not show the button if the user has not completed the trail', async () => {
    getCompletedTrails.mockResolvedValue([{ trail_id: 'another-trail', completed_at: '2026-10-01T09:00:00Z' }]);
    render(<TrailShare feature={FEATURE} durationMin={240} />);

    await act(async () => {});
    expect(getCompletedTrails).toHaveBeenCalledWith(authFetch);
    expect(screen.queryByRole('button', { name: 'Share your hike' })).not.toBeInTheDocument();
  });

  it('does not show the button if the completed trails cannot be loaded', async () => {
    getCompletedTrails.mockRejectedValue(new Error('Internal Server Error'));
    render(<TrailShare feature={FEATURE} durationMin={240} />);

    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Share your hike' })).not.toBeInTheDocument();
  });

  it('opens the window with the recap image, the text and the share links', async () => {
    completed();
    const dialog = await openDialog();

    expect(within(dialog).getByRole('status')).toHaveTextContent('Creating your recap...');
    const preview = await within(dialog).findByRole('img', { name: 'Recap of the hike Anello del Lago Arvo' });
    expect(preview).toHaveAttribute('src', 'blob:recap');

    // The image receives the date of completion, the numbers and the route
    expect(createRecapImage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Anello del Lago Arvo',
        kicker: 'Completed · 6 Nov 2026',
        footer: 'Hiking · Intermediate (E)',
        geometry: FEATURE.geometry,
        stats: [
          { label: 'Distance', value: '14.5 km' },
          { label: 'Est. time', value: '4:00 h' },
          { label: 'Ascent', value: '250 m' },
        ],
      })
    );

    expect(within(dialog).getByText(TEXT)).toBeInTheDocument();

    const whatsapp = within(dialog).getByRole('link', { name: 'WhatsApp' });
    expect(whatsapp).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(`${TEXT}\n${LINK}`)}`);
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(within(dialog).getByRole('link', { name: 'Telegram' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'X' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Facebook' })).toBeInTheDocument();

    const download = within(dialog).getByRole('link', { name: 'Download image' });
    expect(download).toHaveAttribute('href', 'blob:recap');
    expect(download).toHaveAttribute('download', 'hike-anello-del-lago-arvo.png');
  });

  it('closes with the close button and with Escape, frees the image and gives the focus back', async () => {
    completed();
    const dialog = await openDialog();
    await within(dialog).findByRole('img');
    const shareButton = screen.getByRole('button', { name: 'Share your hike' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recap');
    expect(shareButton).toHaveFocus();

    fireEvent.click(shareButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(shareButton).toHaveFocus();
  });

  it('keeps the focus inside the window with Tab and Shift+Tab', async () => {
    completed();
    const dialog = await openDialog();
    await within(dialog).findByRole('img');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const copy = within(dialog).getByRole('button', { name: 'Copy text' });
    expect(close).toHaveFocus();

    // Shift+Tab on the first element goes to the last one, Tab on the last one goes back to the first
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(copy).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    // Focus lost (e.g. click on the text of the window): Tab brings it back into the window
    act(() => close.blur());
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('shares the image with the system share sheet when the browser can', async () => {
    completed();
    navigator.share = vi.fn().mockResolvedValue();
    navigator.canShare = vi.fn(() => true);
    const dialog = await openDialog();
    await within(dialog).findByRole('img');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Share…' }));
    });

    const [data] = navigator.share.mock.calls[0];
    expect(data.files[0].name).toBe('hike-anello-del-lago-arvo.png');
    expect(data.files[0].type).toBe('image/png');
    expect(data.text).toBe(`${TEXT}\n${LINK}`);
  });

  it('does not show "Share…" when the browser has no share sheet', async () => {
    completed();
    const dialog = await openDialog();

    expect(within(dialog).queryByRole('button', { name: 'Share…' })).not.toBeInTheDocument();
  });

  it('copies text and link and shows a message that then disappears', async () => {
    completed();
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const dialog = await openDialog();

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }));
    });

    expect(writeText).toHaveBeenCalledWith(`${TEXT}\n${LINK}`);
    expect(within(dialog).getByText('Text copied')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(NOTICE_MS));
    expect(within(dialog).queryByText('Text copied')).not.toBeInTheDocument();
  });

  it('keeps text and links working when the image cannot be created', async () => {
    completed();
    createRecapImage.mockRejectedValue(new Error('Canvas is not available'));
    const dialog = await openDialog();

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not create the image');
    expect(within(dialog).getByRole('button', { name: 'Download image' })).toBeDisabled();
    expect(within(dialog).getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
  });
});
