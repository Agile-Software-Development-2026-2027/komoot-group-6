import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { validateRegister, birthDateError } from '../src/middlewares/validateRegister.js';
import { PASSWORD_LENGTH } from '../src/config/auth.config.js';

function createRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}


function run(body) {
  const req = { body };
  const res = createRes();
  const next = vi.fn();
  validateRegister(req, res, next);
  return { res, next };
}

const VALID = {
  email: 'mario@esempio.it',
  password: 'password123!',
  username: 'mario_rossi',
  birthDate: '2001-05-14',
};


function expectRejected({ res, next }, message) {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(message) });
  expect(next).not.toHaveBeenCalled();
}

// "Today" is always 5 November 2026 in these tests, so the ages never change
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 5, 12, 0)); // months start from 0: 10 = November
});
afterEach(() => {
  vi.useRealTimers();
});

describe('validateRegister', () => {
  it('calls next() when the data is valid', () => {
    const { res, next } = run(VALID);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts a display name and any special character', () => {
    for (const password of ['password123!', 'pass word#1', 'Àccentato-99', 'abc.defgh']) {
      const { next } = run({ ...VALID, password, displayName: 'Mario' });
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it('responds 400 when the email is not valid', () => {
    expectRejected(run({ ...VALID, email: 'ciao' }), /email/i);
  });

  it('responds 400 when the password is too short', () => {
    expectRejected(run({ ...VALID, password: 'ab!' }), /at least 8/);
  });

  it('responds 400 when the password is too long', () => {
    const tooLong = '!'.repeat(PASSWORD_LENGTH.max + 1);
    expectRejected(run({ ...VALID, password: tooLong }), new RegExp(`at most ${PASSWORD_LENGTH.max}`));
  });

  it('accepts a password of exactly the maximum length', () => {
    const { next } = run({ ...VALID, password: 'a!'.repeat(PASSWORD_LENGTH.max / 2) });
    expect(next).toHaveBeenCalledOnce();
  });

  it('responds 400 when the password has no special character', () => {
    // letters, numbers and spaces are not special characters
    for (const password of ['password123', 'pass word 123', 'Àccentato99']) {
      expectRejected(run({ ...VALID, password }), /special character/);
    }
  });

  it('responds 400 when the username is missing or empty', () => {
    for (const username of [undefined, '', '   ']) {
      expectRejected(run({ ...VALID, username }), /username is required/);
    }
  });

  it('responds 400 when the username is not valid', () => {
    for (const username of ['ab', 'mario!', 'a'.repeat(31)]) {
      expectRejected(run({ ...VALID, username }), /3–30 characters/);
    }
  });

  it('responds 400 when a field is not a string', () => {
    expectRejected(run({ ...VALID, password: 12345678 }), /password/);
    expectRejected(run({ ...VALID, username: 42 }), /username/);
  });

  it('responds 400 when the body is missing', () => {
    expectRejected(run(undefined), /email/i);
  });
});

describe('birth date', () => {
  it('responds 400 when the birth date is missing', () => {
    expectRejected(run({ ...VALID, birthDate: undefined }), /birth date is required/);
    expectRejected(run({ ...VALID, birthDate: '' }), /birth date is required/);
  });

  it('rejects other formats and dates that do not exist', () => {
    expect(birthDateError('14/05/2001')).toMatch(/YYYY-MM-DD/);
    expect(birthDateError('2001-5-14')).toMatch(/YYYY-MM-DD/);
    expect(birthDateError('2001-02-30')).toBe('Invalid birth date');
    expect(birthDateError('2001-13-01')).toBe('Invalid birth date');
  });

  it('accepts a leap day', () => {
    expect(birthDateError('2004-02-29')).toBeNull();
  });

  it('rejects a date in the future', () => {
    expect(birthDateError('2026-11-06')).toMatch(/future/);
  });

  it('requires at least 14 years', () => {
    expect(birthDateError('2012-11-05')).toBeNull();
    expectRejected(run({ ...VALID, birthDate: '2012-11-06' }), /at least 14/);
  });

  it('rejects ages over 120 (typing mistakes)', () => {
    expect(birthDateError('1906-11-05')).toBeNull();
    expect(birthDateError('1095-05-14')).toBe('Invalid birth date');
  });
});