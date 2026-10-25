import { describe, it, expect, vi } from 'vitest';
import { validateRegister } from '../src/middlewares/validateRegister.js';

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

describe('validateRegister', () => {
  it('chiama next() se i dati sono validi', () => {
    const { res, next } = run({ email: 'mario@esempio.it', password: 'password123' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accetta una registrazione senza username', () => {
    const { next } = run({ email: 'mario@esempio.it', password: 'password123' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('risponde 400 se l\'email non è valida', () => {
    const { res, next } = run({ email: 'ciao', password: 'password123' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se la password è troppo corta', () => {
    const { res, next } = run({ email: 'mario@esempio.it', password: 'abc' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se lo username non è valido', () => {
    const { res, next } = run({
      email: 'mario@esempio.it',
      password: 'password123',
      username: 'a!',
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se il body manca', () => {
    const { res, next } = run(undefined);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});