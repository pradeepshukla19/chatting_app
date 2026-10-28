const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const router = express.Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function validate(body) {
  const { username, password } = body || {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username))
    return 'Username must be 3-20 chars (letters, numbers, underscore)';
  if (typeof password !== 'string' || password.length < 6 || password.length > 72)
    return 'Password must be 6-72 characters';
  return null;
}

const sign = (user) =>
  jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' });

router.post('/register', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ username: req.body.username, password: hash });
    res.status(201).json({ token: sign(user), user: { id: user._id, username: user.username } });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });
  const user = await User.findOne({ username: req.body.username });
  const ok = user && (await bcrypt.compare(req.body.password, user.password));
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(user), user: { id: user._id, username: user.username } });
});

module.exports = router;