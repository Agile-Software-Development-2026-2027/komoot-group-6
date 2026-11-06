// Tests for TrailDetailsLink: the address and the navigation to the trail page
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import TrailDetailsLink from './TrailDetailsLink.jsx';

afterEach(cleanup);

// Fake trail page: shows the id it received from the address
function FakeTrailPage() {
  const { id } = useParams();
  return <h1>Trail page {id}</h1>;
}

describe('TrailDetailsLink', () => {
  it('opens the trail page when clicked (inside the app)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TrailDetailsLink trailId="t1">View details</TrailDetailsLink>} />
          <Route path="/trails/:id" element={<FakeTrailPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: 'View details' }));

    expect(screen.getByRole('heading', { name: 'Trail page t1' })).toBeTruthy();
  });

  it('is a normal link outside a router', () => {
    render(<TrailDetailsLink trailId="t1">View details</TrailDetailsLink>);

    expect(screen.getByRole('link', { name: 'View details' }).getAttribute('href')).toBe('/trails/t1');
  });

  it('encodes characters that are not allowed in an address', () => {
    render(<TrailDetailsLink trailId="a b">View details</TrailDetailsLink>);

    expect(screen.getByRole('link', { name: 'View details' }).getAttribute('href')).toBe('/trails/a%20b');
  });

  it('shows nothing without a trail id', () => {
    const { container } = render(<TrailDetailsLink trailId={null}>View details</TrailDetailsLink>);

    expect(container.firstChild).toBeNull();
  });
});