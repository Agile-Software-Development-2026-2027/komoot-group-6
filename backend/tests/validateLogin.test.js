import { describe, it, expect, vi } from 'vitest';
import { validateLogin } from '../src/middlewares/validateLogin.js';

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
  validateLogin(req, res, next);
  return { res, next };
}

describe('validateLogin', () => {
  it('chiama next() se i dati sono validi', () => {
    const { res, next } = run({ email: 'mario@esempio.it', password: 'password123' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('risponde 400 se l\'email non è valida', () => {
    const { res, next } = run({ email: 'ciao', password: 'password123' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se la password manca', () => {
    const { res, next } = run({ email: 'mario@esempio.it' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se email o password non sono stringhe', () => {
    const { res, next } = run({ email: ['mario@esempio.it'], password: 12345678 });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se il body manca', () => {
    const { res, next } = run(undefined);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
