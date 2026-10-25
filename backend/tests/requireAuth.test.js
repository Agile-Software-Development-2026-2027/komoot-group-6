import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import { requireAuth } from '../src/middlewares/requireAuth.js';
import { supabase } from '../src/config/supabase.js';

function createRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

async function run(authorization) {
  const req = { headers: authorization ? { authorization } : {} };
  const res = createRes();
  const next = vi.fn();
  await requireAuth(req, res, next);
  return { req, res, next };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAuth', () => {
  it('chiama next() e imposta req.user e req.token se il token è valido', async () => {
    const user = { id: 'abc-123', email: 'mario@esempio.it' };
    supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const { req, res, next } = await run('Bearer access-123');

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual(user);
    expect(req.token).toBe('access-123');
    expect(supabase.auth.getUser).toHaveBeenCalledWith('access-123');
  });

  it('risponde 401 senza header Authorization e non chiama Supabase', async () => {
    const { res, next } = await run(undefined);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('risponde 401 se lo schema non è Bearer', async () => {
    const { res, next } = await run('Basic access-123');

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('risponde 401 se il token non è valido', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });

    const { res, next } = await run('Bearer scaduto');

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
