// Controlla che nella richiesta ci sia il refresh token.
export function validateRefresh(req, res, next) {
  const { refresh_token: refreshToken } = req.body ?? {};

  if (typeof refreshToken !== 'string' || !refreshToken) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  next();
}
