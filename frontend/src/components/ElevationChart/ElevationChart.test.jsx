import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ElevationProfile from './ElevationChart.jsx';

// Mock Recharts' browser layout requirements; check the data passed to the chart.
const chart = vi.hoisted(() => ({ props: null }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: (props) => {
    chart.props = props;
    return <div data-testid="chart" data-count={props.data.length}>{props.children}</div>;
  },
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

afterEach(() => {
  cleanup();
  chart.props = null;
});

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

  it('passes the original point for the hovered index, including index zero after filtering', () => {
    const first = { distance: 0, elevation: 0, coordinates: [16.1, 39.1, 0] };
    const second = { distance: 1, elevation: 120, coordinates: [16.2, 39.2, 120] };
    const onHover = vi.fn();
    render(<ElevationProfile data={[{ distance: NaN, elevation: 80 }, first, second]} onHover={onHover} />);

    chart.props.onMouseMove({ isTooltipActive: true, activeTooltipIndex: '0' });
    expect(onHover).toHaveBeenLastCalledWith(first);
    chart.props.onMouseMove({ isTooltipActive: true, activeTooltipIndex: '1' });
    expect(onHover).toHaveBeenLastCalledWith(second);
  });

  it('clears the map point on mouse leave or when there is no active point', () => {
    const onHover = vi.fn();
    render(<ElevationProfile data={[{ distance: 0, elevation: 10 }, { distance: 1, elevation: 20 }]} onHover={onHover} />);

    chart.props.onMouseLeave();
    expect(onHover).toHaveBeenLastCalledWith(null);
    for (const state of [undefined, { isTooltipActive: false, activeTooltipIndex: 0 },
      { isTooltipActive: true, activeTooltipIndex: null }, { isTooltipActive: true, activeTooltipIndex: 99 }]) {
      chart.props.onMouseMove(state);
      expect(onHover).toHaveBeenLastCalledWith(null);
    }
  });

  it('still works when no hover callback is supplied', () => {
    render(<ElevationProfile data={[{ distance: 0, elevation: 10 }, { distance: 1, elevation: 20 }]} />);
    expect(() => chart.props.onMouseMove({ isTooltipActive: true, activeTooltipIndex: 0 })).not.toThrow();
    expect(() => chart.props.onMouseLeave()).not.toThrow();
  });
});
