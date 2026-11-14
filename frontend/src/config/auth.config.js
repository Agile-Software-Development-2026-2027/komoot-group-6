// storage key used to save the current session in localStorage or sessionStorage
export const STORAGE_KEY = 'auth.session';

// storage key used to save the timestamp of the last user activity in localStorage
export const ACTIVITY_KEY = 'auth.lastActivity';

// DOM events that count as user activity to keep the session alive
export const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

// minimum interval (in ms) between two saves of the last user activity timestamp
export const ACTIVITY_SAVE_INTERVAL_MS = 15 * 1000;

// interval (in ms) for the periodic check of session expiration while the app is open
export const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;

// maximum delay (in ms) accepted by setTimeout (~24.8 days, 32-bit signed integer limit)
export const MAX_TIMEOUT_MS = 2_147_483_647;

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
