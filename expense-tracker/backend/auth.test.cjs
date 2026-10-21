jest.mock('dotenv', () => ({ config: jest.fn() }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'sprint-one-test-secret';
process.env.JWT_EXPIRES_IN = '1h';

let app;
let mongoServer;

jest.setTimeout(120000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await User.init();
  app = require('./server');
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Sprint 1 email and password authentication', () => {
  test('registers with normalized email, a bcrypt hash, and a signed JWT', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: '  Test User  ', email: '  PERSON@example.com ', password: 'correct-horse-battery' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ name: 'Test User', email: 'person@example.com' });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(jwt.verify(response.body.token, process.env.JWT_SECRET).id).toBe(response.body.user.id);

    const storedUser = await User.findById(response.body.user.id).select('+passwordHash');
    expect(storedUser.passwordHash).not.toBe('correct-horse-battery');
    expect(await bcrypt.compare('correct-horse-battery', storedUser.passwordHash)).toBe(true);
  });

  test('saves signup profile details and rejects invalid profile values', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Profile User',
        email: 'profile@example.com',
        password: 'correct-horse-battery',
        age: 32,
        gender: 'prefer-not-to-say',
        profession: 'Small business owner',
        workType: 'business-owner',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      age: 32,
      gender: 'prefer-not-to-say',
      profession: 'Small business owner',
      workType: 'business-owner',
    });
    expect(await User.findById(response.body.user.id)).toMatchObject({
      age: 32,
      profession: 'Small business owner',
      workType: 'business-owner',
    });

    const invalidProfile = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Profile',
        email: 'invalid-profile@example.com',
        password: 'correct-horse-battery',
        age: 0,
        gender: 'unknown',
        workType: 'unknown',
      });
    expect(invalidProfile.status).toBe(400);
  });

  test('rejects duplicate email addresses and invalid registration input', async () => {
    const user = { name: 'Test User', email: 'same@example.com', password: 'correct-horse-battery' };
    expect((await request(app).post('/auth/register').send(user)).status).toBe(201);
    expect((await request(app).post('/auth/register').send({ ...user, email: ' SAME@example.com ' })).status).toBe(409);
    expect((await request(app).post('/auth/register').send({ ...user, password: 'short' })).status).toBe(400);
    expect(await User.countDocuments({})).toBe(1);
  });

  test('logs in with the correct password and rejects invalid credentials', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'login@example.com', password: 'correct-horse-battery' });

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'LOGIN@example.com', password: 'correct-horse-battery' });
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'incorrect-password' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'incorrect-password' });

    expect(login.status).toBe(200);
    expect(jwt.verify(login.body.token, process.env.JWT_SECRET).id).toBe(login.body.user.id);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  test('does not create an account when JWT configuration is missing', async () => {
    const jwtSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
      const response = await request(app)
        .post('/auth/register')
        .send({ name: 'Test User', email: 'no-secret@example.com', password: 'correct-horse-battery' });

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/Set JWT_SECRET in the backend environment/);
      expect(await User.countDocuments({ email: 'no-secret@example.com' })).toBe(0);
    } finally {
      process.env.JWT_SECRET = jwtSecret;
    }
  });
});
