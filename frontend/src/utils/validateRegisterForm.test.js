import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_LENGTH, validateRegisterForm } from './validateRegisterForm.js';


const VALID = {
  email: 'mario@esempio.it',
  password: 'password123!',
  confirmPassword: 'password123!',
  username: 'mario_rossi',
  displayName: '',
};


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

  it('requires a password of at least 8 characters', () => {
    expect(validateRegisterForm(withPassword('')).password).toBe('Password is required');
    expect(validateRegisterForm(withPassword('ab!')).password).toMatch(/at least 8/);
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
    for (const username of ['ab', 'mario!', 'a'.repeat(31)]) {
      expect(validateRegisterForm({ ...VALID, username }).username).toMatch(/3-30 characters/);
    }
  });
});