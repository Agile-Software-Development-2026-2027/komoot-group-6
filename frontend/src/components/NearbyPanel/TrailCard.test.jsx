import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import TrailCard from './TrailCard.jsx';

const TRAIL = {
  id: 't1',
  name: 'Sentiero del Crati',
  difficulty: 'moderate',
  lengthM: 10000,
  elevationGainM: 449.6,
  distanceM: 1250,
  start: null,
  imageUrl: null,
  saved: false,
};

afterEach(cleanup);

test('shows name, difficulty, estimated time, length, elevation gain and distance', () => {
  render(<TrailCard trail={TRAIL} onSave={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByText('Intermediate')).toBeInTheDocument();
  expect(screen.getByText('3:15 h')).toBeInTheDocument();
  expect(screen.getByText('10 km')).toBeInTheDocument();
  expect(screen.getByText('450 m')).toBeInTheDocument();
  expect(screen.getByText('1.3 km away')).toBeInTheDocument();
});

test('shows the cover photo and falls back to the drawing if it does not load', () => {
  const { container } = render(
    <TrailCard trail={{ ...TRAIL, imageUrl: 'https://example.com/crati.jpg' }} onSave={vi.fn()} />
  );

  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', 'https://example.com/crati.jpg');

  fireEvent.error(image);

  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('svg polygon')).not.toBeNull();
});

test('the bookmark saves the trail: Save → Saving... → Saved and shows "Trail saved"', async () => {
  let finishSave;
  const onSave = vi.fn(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<TrailCard trail={TRAIL} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));

  expect(onSave).toHaveBeenCalledWith('t1');
  expect(screen.getByRole('button', { name: 'Saving... Sentiero del Crati' })).toBeDisabled();

  await act(async () => finishSave('saved'));

  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).not.toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Trail saved');
});

test('clicking the bookmark again removes the trail: Saved → Removing... → Save', async () => {
  const onSave = vi.fn().mockResolvedValue('saved');
  let finishUnsave;
  const onUnsave = vi.fn(() => new Promise((resolve) => { finishUnsave = resolve; }));
  render(<TrailCard trail={TRAIL} onSave={onSave} onUnsave={onUnsave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(async () => {});
  expect(screen.getByRole('status')).toHaveTextContent('Trail saved');

  fireEvent.click(screen.getByRole('button', { name: 'Saved Sentiero del Crati' }));

  expect(onUnsave).toHaveBeenCalledWith('t1');
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Removing... Sentiero del Crati' })).toBeDisabled();

  await act(async () => finishUnsave());

  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).not.toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Trail removed from saved');
});

test('if the trail was already saved on the server it stays Saved and says so', async () => {
  const onSave = vi.fn().mockResolvedValue('already-saved');
  render(<TrailCard trail={TRAIL} onSave={onSave} onUnsave={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(async () => {});

  expect(screen.getByRole('status')).toHaveTextContent('Trail already saved');
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeInTheDocument();
});

test('shows an error when removing fails, keeps the trail saved and lets the user retry', async () => {
  const onUnsave = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  render(<TrailCard trail={TRAIL} isSaved onSave={vi.fn()} onUnsave={onUnsave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Saved Sentiero del Crati' }));
  await act(async () => {});

  expect(screen.getByRole('alert')).toHaveTextContent('Could not remove the trail. Try again.');
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Saved Sentiero del Crati' }));
  await act(async () => {});

  expect(onUnsave).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('the save message disappears after a few seconds', async () => {
  vi.useFakeTimers();
  try {
    render(<TrailCard trail={TRAIL} onSave={vi.fn().mockResolvedValue('saved')} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('status')).toHaveTextContent('Trail saved');

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('shows an error when saving fails and lets the user retry', async () => {
  const onSave = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  render(<TrailCard trail={TRAIL} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(async () => {});

  expect(screen.getByRole('alert')).toHaveTextContent('Could not save the trail. Try again.');

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));
  await act(async () => {});

  expect(onSave).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Trail saved');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a trail that is already saved starts as Saved and a click removes it', async () => {
  const onSave = vi.fn();
  const onUnsave = vi.fn().mockResolvedValue();
  render(<TrailCard trail={{ ...TRAIL, saved: true }} onSave={onSave} onUnsave={onUnsave} />);

  const bookmark = screen.getByRole('button', { name: 'Saved Sentiero del Crati' });
  expect(bookmark).not.toBeDisabled();

  fireEvent.click(bookmark);
  await act(async () => {});

  expect(onUnsave).toHaveBeenCalledWith('t1');
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Trail removed from saved');
});

test('marking a hike as completed: Mark as completed → Completing... → Completed', async () => {
  let finishComplete;
  const onComplete = vi.fn(() => new Promise((resolve) => { finishComplete = resolve; }));
  render(<TrailCard trail={TRAIL} onSave={vi.fn()} onComplete={onComplete} />);

  fireEvent.click(screen.getByRole('button', { name: 'Mark as completed Sentiero del Crati' }));

  expect(onComplete).toHaveBeenCalledWith('t1');
  expect(screen.getByRole('button', { name: 'Completing... Sentiero del Crati' })).toBeDisabled();

  await act(async () => finishComplete());

  expect(screen.getByRole('button', { name: 'Completed Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Completed Sentiero del Crati' })).not.toBeDisabled();
});

test('toggling off a completed hike removes it', async () => {
  const onToggleComplete = vi.fn().mockResolvedValue();
  render(<TrailCard trail={TRAIL} isCompleted onSave={vi.fn()} onToggleComplete={onToggleComplete} />);

  const btn = screen.getByRole('button', { name: 'Completed Sentiero del Crati' });
  expect(btn).toBeInTheDocument();

  fireEvent.click(btn);

  expect(onToggleComplete).toHaveBeenCalledWith('t1', false);
  await act(async () => {});

  expect(screen.getByRole('button', { name: 'Mark as completed Sentiero del Crati' })).toBeInTheDocument();
});

test('shows an error when completing fails and lets the user retry', async () => {
  const onComplete = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  render(<TrailCard trail={TRAIL} onSave={vi.fn()} onComplete={onComplete} />);

  fireEvent.click(screen.getByRole('button', { name: 'Mark as completed Sentiero del Crati' }));
  await act(async () => {});

  expect(screen.getByRole('alert')).toHaveTextContent('Could not update completed status. Try again.');

  fireEvent.click(screen.getByRole('button', { name: 'Mark as completed Sentiero del Crati' }));
  await act(async () => {});

  expect(onComplete).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Completed Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a trail that is already completed starts as Completed', () => {
  render(<TrailCard trail={TRAIL} isCompleted onSave={vi.fn()} onComplete={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Completed Sentiero del Crati' })).toBeInTheDocument();
});

test('a trail saved in the profile (isSaved) shows the full bookmark and a click removes it', async () => {
  const onSave = vi.fn();
  const onUnsave = vi.fn().mockResolvedValue();
  render(<TrailCard trail={TRAIL} isSaved onSave={onSave} onUnsave={onUnsave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Saved Sentiero del Crati' }));
  await act(async () => {});

  expect(onUnsave).toHaveBeenCalledWith('t1');
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).toBeInTheDocument();
});

test('the bookmark fills in when the saved list arrives after the card', () => {
  const { rerender } = render(<TrailCard trail={TRAIL} onSave={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Save Sentiero del Crati' })).toBeInTheDocument();

  rerender(<TrailCard trail={TRAIL} isSaved onSave={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeInTheDocument();
});

test('clicking the name asks to show the trail on the map', () => {
  const onSelect = vi.fn();
  render(<TrailCard trail={{ ...TRAIL, start: [16.2, 39.3] }} onSave={vi.fn()} onSelect={onSelect} isSelected />);

  const link = screen.getByRole('button', { name: 'Sentiero del Crati' });
  expect(link).toHaveAttribute('aria-current', 'true');

  fireEvent.click(link);

  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', start: [16.2, 39.3] }));
});

test('without a start point the name is not clickable', () => {
  render(<TrailCard trail={TRAIL} onSave={vi.fn()} onSelect={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Sentiero del Crati' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sentiero del Crati' })).not.toBeInTheDocument();
});


test('has a link to the page of the trail', () => {
  render(<TrailCard trail={TRAIL} onSave={vi.fn()} />);

  expect(screen.getByRole('link', { name: /details/i })).toHaveAttribute('href', '/trails/t1');
});