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

test('the bookmark saves the trail: Save → Saving... → Saved', async () => {
  let finishSave;
  const onSave = vi.fn(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<TrailCard trail={TRAIL} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save Sentiero del Crati' }));

  expect(onSave).toHaveBeenCalledWith('t1');
  expect(screen.getByRole('button', { name: 'Saving... Sentiero del Crati' })).toBeDisabled();

  await act(async () => finishSave());

  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeDisabled();
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
  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeDisabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a trail that is already saved starts as Saved', () => {
  render(<TrailCard trail={{ ...TRAIL, saved: true }} onSave={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Saved Sentiero del Crati' })).toBeDisabled();
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
