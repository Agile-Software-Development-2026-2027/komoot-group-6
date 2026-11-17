import { LEADERBOARD_LIMIT } from '../config/leaderboard.config.js';
import { readNumber } from './validateTrailQuery.js';

// validates the optional limit query parameter and saves it on the request
export function validateLeaderboardQuery(req, res, next) {
  const { query } = req;

  // use the configured default when limit is omitted from the query string
  const limit = query.limit === undefined ? LEADERBOARD_LIMIT.default : readNumber(query.limit);

  // reject non integer values or values outside the allowed range
  if (!Number.isInteger(limit) || limit < 1 || limit > LEADERBOARD_LIMIT.max) {
    return res.status(400).json({
      error: `Invalid limit: use a whole number between 1 and ${LEADERBOARD_LIMIT.max}`,
    });
  }

  // attach the validated limit to the request object for the controller
  req.leaderboardLimit = limit;
  next();
}
