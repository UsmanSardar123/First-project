const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client();
const authConfigMessage =
  'Authentication is not configured. Set JWT_SECRET in the backend environment and restart the server.';

const registerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});
const googleSchema = z.object({
  idToken: z.string().min(1),
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    avatar: user.avatar,
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function validBody(schema, body) {
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

router.post('/register', async (req, res) => {
  const input = validBody(registerSchema, req.body);
  if (!input) {
    return res.status(400).json({ message: 'Invalid registration details' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: authConfigMessage });
  }

  try {
    if (await User.exists({ email: input.email })) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      provider: 'local',
    });

    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid registration details' });
    }
    return res.status(500).json({ message: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  const input = validBody(loginSchema, req.body);
  if (!input) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: authConfigMessage });
  }

  try {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({ token: createToken(user), user: publicUser(user) });
  } catch {
    return res.status(500).json({ message: 'Failed to log in' });
  }
});

router.post('/google', async (req, res) => {
  const input = validBody(googleSchema, req.body);
  if (!input) {
    return res.status(401).json({ message: 'Invalid Google sign-in token' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: authConfigMessage });
  }

  const audiences = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);
  if (audiences.length === 0) {
    return res.status(503).json({ message: 'Google sign-in is not configured on the server' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: audiences,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Invalid Google sign-in token' });
  }

  if (!payload || payload.email_verified !== true || !payload.sub || !payload.email) {
    return res.status(401).json({ message: 'Invalid Google sign-in token' });
  }

  try {
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.findOne({ email: payload.email.toLowerCase() });
      if (user) {
        user.googleId = payload.sub;
        await user.save();
      } else {
        user = await User.create({
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          googleId: payload.sub,
          provider: 'google',
          avatar: payload.picture || '',
        });
      }
    }

    return res.status(200).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const user = await User.findOne({ googleId: payload.sub });
        if (user) {
          return res.status(200).json({ token: createToken(user), user: publicUser(user) });
        }
      } catch {
        return res.status(500).json({ message: 'Failed to sign in with Google' });
      }
    }
    return res.status(500).json({ message: 'Failed to sign in with Google' });
  }
});

router.get('/me', auth, (req, res) => {
  res.status(200).json({ user: publicUser(req.user) });
});

module.exports = router;
