jest.mock('dotenv', () => ({ config: jest.fn() }));
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Wallet = require('./models/Wallet');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-signing-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GOOGLE_WEB_CLIENT_ID = 'test-google-web-client-id';
process.env.GOOGLE_ANDROID_CLIENT_ID = 'test-google-android-client-id';
process.env.GOOGLE_IOS_CLIENT_ID = 'test-google-ios-client-id';

let app;
let mongoServer;

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
  await Promise.all([User.init(), Expense.init(), Wallet.init()]);
  app = require('./server');
}, 120000);

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Expense.deleteMany({}), Wallet.deleteMany({})]);
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

  test('supports authenticated create, read, update, and delete for the owner', async () => {
    const account = await createAccount('crud@example.com');
    const headers = { Authorization: `Bearer ${account.token}` };
    const created = await request(app)
      .post('/api/expenses')
      .set(headers)
      .send({ title: 'Payday', amount: 500, type: 'income' });
    const read = await request(app).get(`/api/expenses/${created.body._id}`).set(headers);
    const updated = await request(app)
      .put(`/api/expenses/${created.body._id}`)
      .set(headers)
      .send({ title: 'Monthly payday' });
    const removed = await request(app).delete(`/api/expenses/${created.body._id}`).set(headers);

    expect(created.status).toBe(201);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Payday');
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Monthly payday');
    expect(removed.status).toBe(200);
    expect(await Expense.findById(created.body._id)).toBeNull();
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

  test('creates income records and defaults omitted type to expense', async () => {
    const account = await createAccount('types@example.com');
    const income = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Payday', amount: 500, type: 'income', category: 'Salary' });
    const expense = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Lunch', amount: 25 });

    expect(income.status).toBe(201);
    expect(income.body.type).toBe('income');
    expect(expense.status).toBe(201);
    expect(expense.body.type).toBe('expense');
  });

  test('filters transactions by type and counts legacy records as expenses', async () => {
    const account = await createAccount('filters@example.com');
    await Expense.create({ userId: account.user.id, title: 'Payday', amount: 500, type: 'income' });
    await Expense.collection.insertOne({
      userId: new mongoose.Types.ObjectId(account.user.id), title: 'Old record', amount: 40,
      category: 'General', date: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });

    const income = await request(app).get('/api/expenses?type=income').set('Authorization', `Bearer ${account.token}`);
    const expenses = await request(app).get('/api/expenses?type=expense').set('Authorization', `Bearer ${account.token}`);

    expect(income.status).toBe(200);
    expect(income.body.map((item) => item.title)).toEqual(['Payday']);
    expect(expenses.status).toBe(200);
    expect(expenses.body.map((item) => item.title)).toEqual(['Old record']);
  });

  test('returns monthly totals and category totals, including legacy expenses', async () => {
    const account = await createAccount('summary@example.com');
    const currentMonth = new Date();
    currentMonth.setUTCDate(10);
    await Expense.create([
      { userId: account.user.id, title: 'Payday', amount: 1000, type: 'income', category: 'Salary', date: currentMonth },
      { userId: account.user.id, title: 'Food', amount: 125, type: 'expense', category: 'Food', date: currentMonth },
    ]);
    await Expense.collection.insertOne({
      userId: new mongoose.Types.ObjectId(account.user.id), title: 'Legacy', amount: 25,
      category: 'Food', date: currentMonth, createdAt: currentMonth, updatedAt: currentMonth,
    });
    const month = `${currentMonth.getUTCFullYear()}-${String(currentMonth.getUTCMonth() + 1).padStart(2, '0')}`;

    const response = await request(app)
      .get(`/api/expenses/summary?month=${month}`)
      .set('Authorization', `Bearer ${account.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ income: 1000, expense: 150, net: 850 });
    expect(response.body.categories.income).toEqual([{ category: 'Salary', total: 1000 }]);
    expect(response.body.categories.expense).toEqual([{ category: 'Food', total: 150 }]);
  });

  test('keeps summary income private to its owner', async () => {
    const userA = await createAccount('summary-owner@example.com');
    const userB = await createAccount('summary-private@example.com');
    const now = new Date();
    await Expense.create({ userId: userB.user.id, title: 'Private income', amount: 400, type: 'income', date: now });
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const response = await request(app)
      .get(`/api/expenses/summary?month=${month}`)
      .set('Authorization', `Bearer ${userA.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ income: 0, expense: 0, net: 0 });
    expect(response.body.categories).toEqual({ income: [], expense: [] });
  });
});

describe('wallets', () => {
  test('requires authentication to read or change wallets', async () => {
    const list = await request(app).get('/api/wallets');
    const create = await request(app).post('/api/wallets').send({ name: 'Cash', type: 'cash' });

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  test('creates the default wallet once on the first list request', async () => {
    const account = await createAccount('wallet-default@example.com');
    const first = await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    const second = await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);

    expect(first.status).toBe(200);
    expect(first.body).toHaveLength(1);
    expect(first.body[0]).toMatchObject({ name: 'Cash', type: 'cash', isDefault: true, openingBalance: 0, balance: 0 });
    expect(second.status).toBe(200);
    expect(second.body).toHaveLength(1);
    expect(await Wallet.countDocuments({ userId: account.user.id })).toBe(1);
  });

  test('creates, updates, and archives a wallet', async () => {
    const account = await createAccount('wallet-crud@example.com');
    await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    const created = await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ name: 'Travel card', type: 'card', openingBalance: 50, color: '#336699', icon: '▰' });
    const updated = await request(app)
      .put(`/api/wallets/${created.body._id}`)
      .set('Authorization', `Bearer ${account.token}`)
      .send({ name: 'Trip card', openingBalance: 75 });
    const archived = await request(app)
      .patch(`/api/wallets/${created.body._id}/archive`)
      .set('Authorization', `Bearer ${account.token}`);
    const activeList = await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    const archivedList = await request(app).get('/api/wallets?includeArchived=true').set('Authorization', `Bearer ${account.token}`);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Travel card', type: 'card', openingBalance: 50, isDefault: false });
    expect(created.body).not.toHaveProperty('nameKey');
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Trip card', openingBalance: 75 });
    expect(archived.status).toBe(200);
    expect(activeList.body.map((wallet) => wallet.name)).toEqual(['Cash']);
    expect(archivedList.body.map((wallet) => wallet.name)).toEqual(['Cash', 'Trip card']);
  });

  test('rejects duplicate wallet names without regard to case', async () => {
    const account = await createAccount('wallet-duplicate@example.com');
    await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    const duplicate = await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ name: 'cASH', type: 'cash' });

    expect(duplicate.status).toBe(409);
  });

  test('computes opening balance plus income minus expenses', async () => {
    const account = await createAccount('wallet-balance@example.com');
    const wallet = await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ name: 'Savings', type: 'bank', openingBalance: 250 });
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Deposit', amount: 100, type: 'income', walletId: wallet.body._id });
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Purchase', amount: 40, type: 'expense', walletId: wallet.body._id });

    const wallets = await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    expect(wallets.status).toBe(200);
    expect(wallets.body.find((item) => item._id === wallet.body._id).balance).toBe(310);
  });

  test('assigns transactions without walletId to the default wallet', async () => {
    const account = await createAccount('wallet-assignment@example.com');
    const wallets = await request(app).get('/api/wallets').set('Authorization', `Bearer ${account.token}`);
    const income = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Cash received', amount: 45, type: 'income' });

    expect(income.status).toBe(201);
    expect(income.body.walletId).toBe(wallets.body[0]._id);
    const listed = await request(app)
      .get(`/api/expenses?walletId=${wallets.body[0]._id}`)
      .set('Authorization', `Bearer ${account.token}`);
    expect(listed.body.map((item) => item._id)).toContain(income.body._id);
  });

  test('rejects another user wallet and hides other users wallets', async () => {
    const userA = await createAccount('wallet-a@example.com');
    const userB = await createAccount('wallet-b@example.com');
    const userBWallet = await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ name: 'Private wallet', type: 'mobile' });
    const foreignExpense = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ title: 'Invalid destination', amount: 20, type: 'income', walletId: userBWallet.body._id });
    const visibleToA = await request(app).get('/api/wallets').set('Authorization', `Bearer ${userA.token}`);

    expect(foreignExpense.status).toBe(404);
    expect(visibleToA.body.map((wallet) => wallet.name)).toEqual(['Cash']);
  });

  test('rejects deletion when transactions reference the wallet', async () => {
    const account = await createAccount('wallet-delete@example.com');
    const wallet = await request(app)
      .post('/api/wallets')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ name: 'Used wallet', type: 'mobile' });
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${account.token}`)
      .send({ title: 'Received', amount: 25, type: 'income', walletId: wallet.body._id });
    const deleted = await request(app)
      .delete(`/api/wallets/${wallet.body._id}`)
      .set('Authorization', `Bearer ${account.token}`);

    expect(deleted.status).toBe(409);
    expect(await Wallet.findById(wallet.body._id)).not.toBeNull();
  });
});
