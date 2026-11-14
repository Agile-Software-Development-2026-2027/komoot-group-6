import {
  MAX_AGE,
  MIN_AGE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../config/auth.config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const USERNAME_RE = new RegExp(`^[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`);


const SPECIAL_CHAR_RE = /[^\p{L}\p{N}\s]/u;


const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;


function ageOn(birth, today) {
  let age = today.year - birth.year;
  
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) {
    age -= 1;
  }
  return age;
}

function yearsAgo(years, now) {
  const year = String(now.getFullYear() - years).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


export function birthDateLimits(now = new Date()) {
  return { min: yearsAgo(MAX_AGE, now), max: yearsAgo(MIN_AGE, now) };
}


export function birthDateError(value, now = new Date()) {
  if (!value) return 'Birth date is required';

  const match = DATE_RE.exec(value);
  if (!match) return 'Enter a valid date';

  const birth = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  // Date.UTC "fixes" impossible dates (2001-02-30 becomes 2001-03-02):
  // if the numbers change, the date did not exist
  const date = new Date(Date.UTC(birth.year, birth.month - 1, birth.day));
  if (date.getUTCFullYear() !== birth.year || date.getUTCMonth() !== birth.month - 1 || date.getUTCDate() !== birth.day) {
    return 'Enter a valid date';
  }

  const today = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const age = ageOn(birth, today);
  if (age < 0) return 'The birth date cannot be in the future';
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old to sign up`;
  if (age > MAX_AGE) return 'Enter a valid date';

  return null;
}


export function validateRegisterForm(values) {
  const errors = {};
  const email = values.email.trim();
  const username = values.username.trim();
  const { password } = values;

  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }


  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `The password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `The password must be at most ${PASSWORD_MAX_LENGTH} characters long`;
  } else if (!SPECIAL_CHAR_RE.test(password)) {
    errors.password = 'Add at least one special character (e.g. ! ? # @)';
  }


  if (values.confirmPassword !== password) {
    errors.confirmPassword = 'The passwords do not match';
  }

 
  if (!username) {
    errors.username = 'Username is required';
  } else if (!USERNAME_RE.test(username)) {
    errors.username = `${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters: letters, numbers or underscore`;
  }

 
  const birthDateMessage = birthDateError(values.birthDate);
  if (birthDateMessage) {
    errors.birthDate = birthDateMessage;
  }

  return errors;
}