jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const Expense = require('./models/Expense');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-signing-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GOOGLE_WEB_CLIENT_ID = 'test-google-web-client-id';
process.env.GOOGLE_ANDROID_CLIENT_ID = 'test-google-android-client-id';
process.env.GOOGLE_IOS_CLIENT_ID = 'test-google-ios-client-id';

let app;
let mongoServer;
let googleClient;

jest.setTimeout(15000);

async function createAccount(email, name = 'Test User') {
  const response = await request(app)
    .post('/auth/register')
    .send({ name, email, password: 'correct-horse-battery' });
  expect(response.status).toBe(201);
  return { user: response.body.user, token: response.body.token };
}

function expectNoPasswordHash(response) {
  expect(JSON.stringify(response.body)).not.toContain('passwordHash');
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Expense.init()]);
  app = require('./server');
  googleClient = OAuth2Client.mock.results[0].value;
}, 120000);

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Expense.deleteMany({})]);
  googleClient.verifyIdToken.mockReset();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('local authentication', () => {
  test('reports missing JWT configuration clearly during registration', async () => {
    const jwtSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    try {
      const response = await request(app)
        .post('/auth/register')
        .send({ name: 'Test User', email: 'unconfigured@example.com', password: 'long-enough-password' });

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/Set JWT_SECRET in the backend environment/);
      expect(await User.countDocuments({ email: 'unconfigured@example.com' })).toBe(0);
    } finally {
      process.env.JWT_SECRET = jwtSecret;
    }
  });

  test('registers a user and returns a token without passwordHash', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ name: '  Test User  ', email: '  PERSON@example.com  ', password: 'long-enough-password' });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: 'Test User',
      email: 'person@example.com',
      provider: 'local',
    });
    expect(jwt.verify(response.body.token, process.env.JWT_SECRET)).toMatchObject({
      id: response.body.user.id,
    });
    expectNoPasswordHash(response);
  });

  test('supports registration at both auth route prefixes', async () => {
    const rootRoute = await request(app)
      .post('/auth/register')
      .send({ name: 'Root Route', email: 'root-route@example.com', password: 'long-enough-password' });
    const apiRoute = await request(app)
      .post('/api/auth/register')
      .send({ name: 'API Route', email: 'api-route@example.com', password: 'long-enough-password' });

    expect(rootRoute.status).toBe(201);
    expect(apiRoute.status).toBe(201);
  });

  test('rejects duplicate email with 409 and weak password with 400', async () => {
    await createAccount('duplicate@example.com');
    const duplicate = await request(app)
      .post('/auth/register')
      .send({ name: 'Other User', email: 'duplicate@example.com', password: 'long-enough-password' });
    const weakPassword = await request(app)
      .post('/auth/register')
      .send({ name: 'Other User', email: 'weak@example.com', password: 'short' });

    expect(duplicate.status).toBe(409);
    expect(weakPassword.status).toBe(400);
  });

  test('logs in and returns the same generic error for a wrong password or unknown email', async () => {
    await createAccount('known@example.com');
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'known@example.com', password: 'incorrect-password' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'incorrect-password' });
    const successfulLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'known@example.com', password: 'correct-horse-battery' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    expect(successfulLogin.status).toBe(200);
    expectNoPasswordHash(successfulLogin);
  });

  test('returns the authenticated user from /auth/me without passwordHash', async () => {
    const account = await createAccount('me@example.com');
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${account.token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('me@example.com');
    expectNoPasswordHash(response);
  });

  test.each([
    ['missing', null],
    ['invalid', 'not-a-valid-token'],
    ['expired', 'expired'],
  ])('rejects a %s token for /auth/me', async (kind, suppliedToken) => {
    const account = await createAccount(`${kind}@example.com`);
    let authorization = suppliedToken;
    if (kind === 'expired') {
      authorization = jwt.sign(
        { id: account.user.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
    }

    const call = request(app).get('/auth/me');
    if (authorization) call.set('Authorization', `Bearer ${authorization}`);
    const response = await call;

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });
});

describe('expense ownership', () => {
  test('requires authentication for expense reads and writes', async () => {
    const list = await request(app).get('/api/expenses');
    const create = await request(app)
      .post('/api/expenses')
      .send({ title: 'Payday', amount: 100, type: 'income' });

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  test('prevents one user from reading, updating, or deleting another user expense', async () => {
    const userA = await createAccount('owner@example.com');
    const userB = await createAccount('other@example.com');
    const created = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ title: 'Private income', amount: 100, type: 'income' });
    const expenseId = created.body._id;

    const list = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${userA.token}`);
    const read = await request(app)
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    const update = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ title: 'Stolen update' });
    const remove = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${userA.token}`);

    expect(created.status).toBe(201);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
    expect((await Expense.findById(expenseId)).title).toBe('Private income');
  });

  test('ignores a userId supplied in the create request body', async () => {
    const account = await createAccount('creator@example.com');
    const otherUser = await createAccount('forged@example.com');
    const response = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({
        title: 'Own income',
        amount: 100,
        type: 'income',
        userId: otherUser.user.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(account.user.id);
    expectNoPasswordHash(response);
  });
});

describe('Google authentication', () => {
  test('creates a user for a verified Google ID token', async () => {
    googleClient.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-1',
        email: 'google@example.com',
        email_verified: true,
        name: 'Google User',
      }),
    });

    const response = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-google-id-token' });

    expect(googleClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-google-id-token',
      audience: [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
      ],
    });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: 'google@example.com',
      provider: 'google',
    });
    expect(await User.countDocuments({ email: 'google@example.com' })).toBe(1);
    expectNoPasswordHash(response);
  });

  test('reuses the same Google account on later sign-ins', async () => {
    googleClient.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-returning-user',
        email: 'returning@example.com',
        email_verified: true,
        name: 'Returning User',
      }),
    });

    const firstSignIn = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-google-id-token' });
    const secondSignIn = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-google-id-token' });

    expect(firstSignIn.status).toBe(200);
    expect(secondSignIn.status).toBe(200);
    expect(firstSignIn.body.user.id).toBe(secondSignIn.body.user.id);
    expect(await User.countDocuments({ googleId: 'google-returning-user' })).toBe(1);
  });

  test('links an existing account by email without creating a duplicate', async () => {
    const existing = await User.create({
      name: 'Existing User',
      email: 'linked@example.com',
      passwordHash: 'test-hash',
      provider: 'local',
    });
    googleClient.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-linked-user',
        email: 'LINKED@example.com',
        email_verified: true,
      }),
    });

    const response = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-google-id-token' });

    expect(response.status).toBe(200);
    expect(await User.countDocuments({ email: 'linked@example.com' })).toBe(1);
    expect((await User.findById(existing.id)).googleId).toBe('google-linked-user');
    expect(response.body.user.id).toBe(existing.id);
    expectNoPasswordHash(response);
  });

  test('rejects an invalid Google ID token with a generic 401', async () => {
    googleClient.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app)
      .post('/auth/google')
      .send({ idToken: 'invalid-google-id-token' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Invalid Google sign-in token' });
  });

  test('rejects a Google identity without a verified email', async () => {
    googleClient.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-unverified-user',
        email: 'unverified@example.com',
        email_verified: false,
      }),
    });

    const response = await request(app)
      .post('/auth/google')
      .send({ idToken: 'unverified-google-id-token' });

    expect(response.status).toBe(401);
    expect(await User.countDocuments({ email: 'unverified@example.com' })).toBe(0);
  });
});
