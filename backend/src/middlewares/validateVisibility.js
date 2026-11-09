// Checks that the body has the new profile visibility: { isPublic: true | false }.
export function validateVisibility(req, res, next) {
  const { isPublic } = req.body ?? {};

  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: 'isPublic must be a boolean' });
  }

  next();
}
