import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_AGE,
  MIN_AGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../config/auth.config.js';
import { birthDateError, birthDateLimits, validateRegisterForm } from './validateRegisterForm.js';


const VALID = {
  email: 'mario@esempio.it',
  password: 'password123!',
  confirmPassword: 'password123!',
  username: 'mario_rossi',
  displayName: '',
  birthDate: '2001-05-14',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 5, 12, 0)); // months start from 0: 10 = November
});
afterEach(() => {
  vi.useRealTimers();
});

function withPassword(password) {
  return { ...VALID, password, confirmPassword: password };
}

describe('validateRegisterForm', () => {
  it('returns no errors for a valid form (display name is optional)', () => {
    expect(validateRegisterForm(VALID)).toEqual({});
  });

  it('requires a valid email', () => {
    expect(validateRegisterForm({ ...VALID, email: '  ' }).email).toBe('Email is required');
    expect(validateRegisterForm({ ...VALID, email: 'ciao' }).email).toMatch(/valid email/);
  });

  it('requires a password of at least the minimum length', () => {
    expect(validateRegisterForm(withPassword('')).password).toBe('Password is required');
    expect(validateRegisterForm(withPassword('ab!')).password).toMatch(`at least ${PASSWORD_MIN_LENGTH}`);
  });

  it('rejects a password longer than the maximum', () => {
    const tooLong = '!'.repeat(PASSWORD_MAX_LENGTH + 1);
    expect(validateRegisterForm(withPassword(tooLong)).password).toMatch(`at most ${PASSWORD_MAX_LENGTH}`);
  });

  it('requires at least one special character in the password', () => {
    for (const password of ['password123', 'pass word 123', 'Àccentato99']) {
      expect(validateRegisterForm(withPassword(password)).password).toMatch(/special character/);
    }
    for (const password of ['password123!', 'pass-word', 'mario@2026']) {
      expect(validateRegisterForm(withPassword(password)).password).toBeUndefined();
    }
  });

  it('checks that the two passwords match', () => {
    const errors = validateRegisterForm({ ...VALID, confirmPassword: 'different1!' });
    expect(errors.confirmPassword).toBe('The passwords do not match');
  });

  it('requires the username', () => {
    expect(validateRegisterForm({ ...VALID, username: '' }).username).toBe('Username is required');
    expect(validateRegisterForm({ ...VALID, username: '   ' }).username).toBe('Username is required');
  });

  it('rejects a username with invalid characters or length', () => {
    const tooShort = 'a'.repeat(USERNAME_MIN_LENGTH - 1);
    const tooLong = 'a'.repeat(USERNAME_MAX_LENGTH + 1);
    for (const username of [tooShort, 'mario!', tooLong]) {
      expect(validateRegisterForm({ ...VALID, username }).username).toMatch(
        `${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`
      );
    }
  });
});

describe('birthDateError', () => {
  it('requires the birth date', () => {
    expect(validateRegisterForm({ ...VALID, birthDate: '' }).birthDate).toBe('Birth date is required');
  });

  it('rejects dates that do not exist', () => {
    expect(birthDateError('2001-02-30')).toBe('Enter a valid date');
    expect(birthDateError('14/05/2001')).toBe('Enter a valid date');
  });

  it('rejects a date in the future', () => {
    expect(birthDateError('2026-11-06')).toMatch(/future/);
  });

  it('requires at least MIN_AGE years', () => {
    expect(birthDateError('2012-11-05')).toBeNull();
    expect(validateRegisterForm({ ...VALID, birthDate: '2012-11-06' }).birthDate).toMatch(`at least ${MIN_AGE}`);
  });

  it('rejects ages over MAX_AGE (typing mistakes)', () => {
    const overMaxYear = 2026 - MAX_AGE - 1;
    expect(birthDateError(`${overMaxYear}-05-14`)).toBe('Enter a valid date');
  });

  it('gives the date picker the first and last day allowed', () => {
    expect(birthDateLimits()).toEqual({ min: '1906-11-05', max: '2012-11-05' });
  });
});