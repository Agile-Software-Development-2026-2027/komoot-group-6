// just 2 utilities for hour and day in seconds
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

// Reads a positive whole number of seconds from .env, or uses the fallback.
// .env values are always strings: without Number(), "60" + 1000 would be "601000".
// if SESSION_MAX_AGE_SECONDS is not in the .env, the fallback is used. If it is in the .env but not a positive whole number, the server will not start.
function secondsFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    // Stop at startup instead of running with a wrong session length
    throw new Error(`${name} must be a positive whole number of seconds, got "${raw}"`);
  }
  return value;
}

// Max session length from login without "Remember me". For the demo: SESSION_MAX_AGE_SECONDS=60
export const SESSION_MAX_AGE_SECONDS = secondsFromEnv('SESSION_MAX_AGE_SECONDS', 8 * HOUR);

// Max session length from login with "Remember me": the frontend renews the token with the
// refresh token, even after the browser is closed, but the refresh is refused after this.
// On its own, Supabase would renew the session forever.
export const REMEMBER_ME_MAX_AGE_SECONDS = secondsFromEnv('REMEMBER_ME_MAX_AGE_SECONDS', 30 * DAY);

// Sign-up rules. The frontend has the same rules: if you change one here, change it there too.
export const PASSWORD_LENGTH = {
  min: 8,
  // Our choice: it must stay <= 72, the limit of bcrypt used by Supabase
  max: 20,
};
export const USERNAME_LENGTH = { min: 3, max: 30 };
// Minimum age to sign up to an online service by yourself in Italy
export const MIN_AGE = 14;
// Older than this = typing mistake (e.g. 1095 instead of 1995)
export const MAX_AGE = 120;