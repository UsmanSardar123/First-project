const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const MAX_PASSWORD_BYTES = 72;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    profession: user.profession,
    workType: user.workType,
    provider: user.provider,
    avatar: user.avatar,
  };
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error('Set JWT_SECRET in the backend environment');
    error.code = 'JWT_SECRET_MISSING';
    throw error;
  }

  return jwt.sign(
    { id: user._id.toString() },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function handleAuthError(error, res, action) {
  if (error.code === 'JWT_SECRET_MISSING') {
    return res.status(500).json({ message: error.message });
  }
  if (error.code === 11000 && error.keyPattern?.email) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  console.error(`${action} error:`, error.message);
  return res.status(500).json({ message: `Could not ${action}` });
}

async function register(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const rawAge = req.body?.age;
  const age = rawAge === undefined ? undefined : Number(rawAge);
  const gender = req.body?.gender;
  const profession = req.body?.profession;
  const workType = req.body?.workType;
  const validGenders = ['female', 'male', 'non-binary', 'prefer-not-to-say'];
  const validWorkTypes = ['employee', 'business-owner', 'self-employed', 'student', 'other'];

  if (
    !name ||
    name.length > 80 ||
    !isValidEmail(email) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES ||
    (rawAge !== undefined && (!Number.isInteger(age) || age < 1 || age > 120)) ||
    (gender !== undefined && !validGenders.includes(gender)) ||
    (profession !== undefined && (typeof profession !== 'string' || profession.trim().length > 100)) ||
    (workType !== undefined && !validWorkTypes.includes(workType))
  ) {
    return res.status(400).json({
      message: 'Provide valid account details and profile information',
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Set JWT_SECRET in the backend environment' });
  }

  try {
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: 'local',
      ...(age !== undefined ? { age } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(profession !== undefined ? { profession: profession.trim() } : {}),
      ...(workType !== undefined ? { workType } : {}),
    });

    return res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    return handleAuthError(error, res, 'create account');
  }
}

async function login(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!isValidEmail(email) || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Provide a valid email and password' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Set JWT_SECRET in the backend environment' });
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    return handleAuthError(error, res, 'log in');
  }
}

module.exports = { register, login };
