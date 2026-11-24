import { describe, expect, it } from 'vitest';
import { validateForgotPasswordForm, validateResetPasswordForm } from './validatePasswordReset.js';

describe('validateForgotPasswordForm', () => {
  it('accepts a valid email (even with surrounding spaces)', () => {
    expect(validateForgotPasswordForm({ email: '  mario@esempio.it ' })).toEqual({});
  });

  it('requires the email', () => {
    expect(validateForgotPasswordForm({ email: '   ' }).email).toBe('Email is required');
  });

  it('rejects an invalid email', () => {
    expect(validateForgotPasswordForm({ email: 'mario@' }).email).toBe('Enter a valid email address');
  });
});

describe('validateResetPasswordForm', () => {
  it('accepts a valid confirmed password', () => {
    expect(validateResetPasswordForm({ password: 'nuova!pass', confirmPassword: 'nuova!pass' })).toEqual({});
  });

  it('requires the password', () => {
    expect(validateResetPasswordForm({ password: '', confirmPassword: '' }).password).toBe('Password is required');
  });

  it('rejects a password that is too short', () => {
    expect(validateResetPasswordForm({ password: 'a!b', confirmPassword: 'a!b' }).password).toMatch(/at least/);
  });

  it('rejects a password that is too long', () => {
    const long = 'a!'.repeat(15);
    expect(validateResetPasswordForm({ password: long, confirmPassword: long }).password).toMatch(/at most/);
  });

  it('requires a special character', () => {
    expect(validateResetPasswordForm({ password: 'password123', confirmPassword: 'password123' }).password)
      .toMatch(/special character/);
  });

  it('reports when the two passwords do not match', () => {
    expect(validateResetPasswordForm({ password: 'nuova!pass', confirmPassword: 'altra!pass' }).confirmPassword)
      .toBe('The passwords do not match');
  });
});
