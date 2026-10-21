jest.mock('dotenv', () => ({ config: jest.fn() }));

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Wallet = require('./models/Wallet');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'sprint-two-test-secret';
process.env.JWT_EXPIRES_IN = '1h';

let app;
let mongoServer;

jest.setTimeout(120000);

async function createAccount(email) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correct-horse-battery' });
  expect(response.status).toBe(201);
  return response.body;
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Expense.init(), Wallet.init()]);
  app = require('./server');
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Expense.deleteMany({}), Wallet.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Sprint 2 protected expense APIs', () => {
  test('rejects missing and invalid tokens on expense reads and writes', async () => {
    const unauthorizedRequests = [
      request(app).get('/api/expenses'),
      request(app).get('/api/expenses/summary?month=2026-10'),
      request(app).get('/api/expenses/507f1f77bcf86cd799439011'),
      request(app).post('/api/expenses').send({ title: 'Payday', amount: 100, type: 'income' }),
      request(app).put('/api/expenses/507f1f77bcf86cd799439011').send({ title: 'Changed' }),
      request(app).delete('/api/expenses/507f1f77bcf86cd799439011'),
      request(app).get('/api/expenses').set('Authorization', 'Bearer invalid-token'),
    ];

    const responses = await Promise.all(unauthorizedRequests);
    expect(responses.map((response) => response.status)).toEqual(Array(7).fill(401));
  });

  test('uses the token owner for writes and prevents another user from reading or changing an expense', async () => {
    const owner = await createAccount('owner@example.com');
    const otherUser = await createAccount('other@example.com');
    const created = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        title: 'Private income',
        amount: 100,
        type: 'income',
        userId: otherUser.user.id,
      });
    const expenseId = created.body._id;

    const ownerList = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${owner.token}`);
    const otherList = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${otherUser.token}`);
    const otherRead = await request(app)
      .get(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${otherUser.token}`);
    const otherUpdate = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ title: 'Stolen update' });
    const otherDelete = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(created.status).toBe(201);
    expect(created.body.userId).toBe(owner.user.id);
    expect(ownerList.body.map((expense) => expense._id)).toContain(expenseId);
    expect(otherList.status).toBe(200);
    expect(otherList.body).toEqual([]);
    expect(otherRead.status).toBe(404);
    expect(otherUpdate.status).toBe(404);
    expect(otherDelete.status).toBe(404);
    expect((await Expense.findById(expenseId)).title).toBe('Private income');
  });

  test('keeps monthly summaries private to the authenticated user', async () => {
    const owner = await createAccount('summary-owner@example.com');
    const otherUser = await createAccount('summary-other@example.com');
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ title: 'Private income', amount: 400, type: 'income' });
    const month = new Date().toISOString().slice(0, 7);

    const response = await request(app)
      .get(`/api/expenses/summary?month=${month}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ income: 0, expense: 0, net: 0 });
  });
});
