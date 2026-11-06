// Controlla che nel corpo ci sia l'id del sentiero da segnare come completato: { trailId: '...' }.
export function validateCompleteTrail(req, res, next) {
  const { trailId } = req.body ?? {};

  if (typeof trailId !== 'string' || !trailId.trim()) {
    return res.status(400).json({ error: 'trailId is required' });
  }

  next();
}
