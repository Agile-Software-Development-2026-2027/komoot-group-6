import { describe, it, expect, vi } from 'vitest';
import { validateRegister, PASSWORD_MAX_LENGTH } from '../src/middlewares/validateRegister.js';

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

// A valid body: every test changes only the field it checks
const VALID = { email: 'mario@esempio.it', password: 'password123!', username: 'mario_rossi' };


function expectRejected({ res, next }, message) {
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(message) });
  expect(next).not.toHaveBeenCalled();
}

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
    const tooLong = '!'.repeat(PASSWORD_MAX_LENGTH + 1);
        expectRejected(run({ ...VALID, password: tooLong }), new RegExp(`at most ${PASSWORD_MAX_LENGTH}`));
  });

  it('accepts a password of exactly the maximum length', () => {
    const { next } = run({ ...VALID, password: 'a!'.repeat(PASSWORD_MAX_LENGTH / 2) });
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