import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import LevelUpDialog from './LevelUpDialog.jsx';

afterEach(cleanup);

describe('LevelUpDialog', () => {
  it('renders trophy, congratulations title, level name and continue button', () => {
    const onClose = vi.fn();
    render(<LevelUpDialog level={0} levelName="Beginner" onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^congratulations!$/i })).toBeInTheDocument();
    expect(screen.getByText(/you are now:/i)).toHaveTextContent('You are now: Beginner');
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('renders custom levelName when provided', () => {
    render(<LevelUpDialog level={3} levelName="Explorer" onClose={vi.fn()} />);

    expect(screen.getByText(/you are now:/i)).toHaveTextContent('You are now: Explorer');
  });

  it('falls back to level number when levelName is not provided', () => {
    render(<LevelUpDialog level={4} onClose={vi.fn()} />);

    expect(screen.getByText(/you are now:/i)).toHaveTextContent('You are now: Level 4');
  });

  it('closes when clicking the continue button', () => {
    const onClose = vi.fn();
    render(<LevelUpDialog level={1} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking on the backdrop outside the dialog card', () => {
    const onClose = vi.fn();
    render(<LevelUpDialog level={2} onClose={onClose} />);

    // click the presentation backdrop wrapper
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the dialog card', () => {
    const onClose = vi.fn();
    render(<LevelUpDialog level={2} onClose={onClose} />);

    // click inside the dialog card
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when pressing the escape key', () => {
    const onClose = vi.fn();
    render(<LevelUpDialog level={2} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
