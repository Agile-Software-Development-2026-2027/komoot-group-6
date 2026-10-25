import { describe, it, expect, vi } from 'vitest';
import { validateRefresh } from '../src/middlewares/validateRefresh.js';

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
  validateRefresh(req, res, next);
  return { res, next };
}

describe('validateRefresh', () => {
  it('chiama next() se il refresh token è presente', () => {
    const { res, next } = run({ refresh_token: 'refresh-123' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('risponde 400 se il refresh token manca', () => {
    const { res, next } = run({});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 400 se il body manca', () => {
    const { res, next } = run(undefined);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
