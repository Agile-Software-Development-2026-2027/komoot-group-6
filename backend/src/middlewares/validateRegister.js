const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export function validateRegister(req, res, next) {
  
  const { email, password, username } = req.body ?? {};

  if (!email || !EMAIL_RE.test(email)) {
  
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'The password must be at least 8 characters long' });
  }
 
  if (username && !USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: 'The username must be 3–30 characters long: letters, numbers, or underscores',
    });
  }


  next();
}