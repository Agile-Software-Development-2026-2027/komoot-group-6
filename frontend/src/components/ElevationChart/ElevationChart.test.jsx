import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ElevationProfile from './ElevationChart.jsx';

// Mock Recharts' browser layout requirements; check the data passed to the chart.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children, data }) => <div data-testid="chart" data-count={data.length}>{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe('ElevationProfile', () => {
  it('renders the chart for distance/elevation data', () => {
    render(<ElevationProfile data={[{ distance: 0, elevation: 210 }, { distance: 1, elevation: 224 }]} />);
    expect(screen.getByTestId('chart').getAttribute('data-count')).toBe('2');
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Elevation in meters/);
  });

  it('shows an empty state when no usable profile is available', () => {
    render(<ElevationProfile data={[]} />);
    expect(screen.getByRole('status').textContent).toMatch(/unavailable/i);
  });
});
