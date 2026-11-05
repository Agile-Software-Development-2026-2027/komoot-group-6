// Tests for FormField: the (i) tooltip and what screen readers get
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FormField from './FormField.jsx';

afterEach(cleanup);

// Renders a field with the given extra props
function renderField(props) {
  render(<FormField label="Password" name="password" value="" onChange={() => {}} {...props} />);
  return screen.getByLabelText('Password');
}

describe('FormField', () => {
  it('shows no (i) icon when there is no info', () => {
    renderField({});
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the (i) button and the tooltip with the rules', () => {
    const input = renderField({ info: '8-20 characters' });
    const tooltip = screen.getByRole('tooltip');

    expect(tooltip.textContent).toBe('8-20 characters');
    // The button does not submit the form and is linked to the tooltip
    const button = screen.getByRole('button', { name: 'Password: requirements' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
    // The input is described by the tooltip too, so screen readers read the rules
    expect(input.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('links both the error and the tooltip to the input', () => {
    const input = renderField({ info: '8-20 characters', error: 'Password is required' });
    expect(input.getAttribute('aria-describedby')).toBe('password-message password-info');
    expect(screen.getByText('Password is required').id).toBe('password-message');
  });
});