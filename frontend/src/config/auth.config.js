// how long without user activity (clicks, keys, mouse moves) before the session expires
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// minimum length allowed for the password at sign-up
export const PASSWORD_MIN_LENGTH = 8;

// maximum length allowed for the password at sign-up (must stay <= 72 for Supabase bcrypt)
export const PASSWORD_MAX_LENGTH = 20;

// minimum length allowed for the username at sign-up
export const USERNAME_MIN_LENGTH = 3;

// maximum length allowed for the username at sign-up
export const USERNAME_MAX_LENGTH = 30;

// minimum age required to sign up to an online service by yourself in Italy
export const MIN_AGE = 14;

// maximum age allowed at sign-up to catch typing mistakes (e.g. 1095 instead of 1995)
export const MAX_AGE = 120;
