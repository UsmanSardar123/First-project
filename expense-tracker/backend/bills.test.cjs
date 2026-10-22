jest.mock('dotenv', () => ({ config: jest.fn() }));
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Bill = require('./models/Bill');
const { advanceDueDate } = require('./utils/billRecurrence');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-signing-secret';
process.env.JWT_EXPIRES_IN = '1h';

let app;
let mongoServer;

async function account(email) {
  const response = await request(app)
    .post('/auth/register')
    .send({ name: 'Bill Test', email, password: 'correct-horse-battery' });
  expect(response.status).toBe(201);
  return { token: response.body.token, user: response.body.user };
}

function billBody(overrides = {}) {
  return {
    title: 'Home internet',
    category: 'Internet',
    amount: 3000,
    dueDate: '2030-01-31',
    recurrence: 'monthly',
    reminderDays: [7, 1, 0],
    notes: 'Pay online',
    ...overrides,
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([User.init(), Bill.init()]);
  app = require('./server');
}, 120000);

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Bill.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('authenticated bills API', () => {
  test('rejects unauthenticated access and validates bill data', async () => {
    expect((await request(app).get('/api/bills')).status).toBe(401);
    const owner = await account('bill-owner@example.com');
    const invalid = await request(app).post('/api/bills')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(billBody({ amount: -5 }));
    expect(invalid.status).toBe(400);
    expect(await Bill.countDocuments()).toBe(0);
  });

  test('creates a bill for the authenticated user, ignoring a client userId', async () => {
    const owner = await account('bill-owner@example.com');
    const other = await account('bill-other@example.com');
    const response = await request(app).post('/api/bills')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(billBody({ userId: other.user.id }));
    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(owner.user.id);
    expect(response.body.status).toBe('unpaid');
    expect(response.body.reminderDays).toEqual([7, 1, 0]);
  });

  test('keeps each owner from reading, updating, paying, or deleting another user’s bill', async () => {
    const owner = await account('bill-owner@example.com');
    const other = await account('bill-other@example.com');
    const created = await request(app).post('/api/bills')
      .set('Authorization', `Bearer ${owner.token}`).send(billBody());
    const id = created.body._id;
    await request(app).patch(`/api/bills/${id}/paid`).set('Authorization', `Bearer ${owner.token}`);
    const headers = { Authorization: `Bearer ${other.token}` };

    expect((await request(app).get('/api/bills').set(headers)).body).toHaveLength(0);
    expect((await request(app).put(`/api/bills/${id}`).set(headers).send({ title: 'Stolen' })).status).toBe(404);
    expect((await request(app).patch(`/api/bills/${id}/paid`).set(headers)).status).toBe(404);
    expect((await request(app).patch(`/api/bills/${id}/reopen`).set(headers)).status).toBe(404);
    expect((await request(app).delete(`/api/bills/${id}`).set(headers)).status).toBe(404);
    expect((await Bill.findById(id)).title).toBe('Home internet');
  });

  test('advances a monthly end-of-month bill and preserves each paid occurrence', async () => {
    const owner = await account('bill-owner@example.com');
    const created = await request(app).post('/api/bills')
      .set('Authorization', `Bearer ${owner.token}`).send(billBody());
    const id = created.body._id;

    const february = await request(app).patch(`/api/bills/${id}/paid`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(february.status).toBe(200);
    expect(february.body.bill.dueDate).toMatch(/^2030-02-28/);
    expect(february.body.bill.status).toBe('unpaid');
    expect(february.body.bill.paymentHistory).toHaveLength(1);

    const march = await request(app).patch(`/api/bills/${id}/paid`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(march.body.bill.dueDate).toMatch(/^2030-03-31/);
    expect(march.body.bill.paymentHistory).toHaveLength(2);
  });

  test('edits, marks a one-time bill paid, reopens it, and deletes it', async () => {
    const owner = await account('bill-owner@example.com');
    const created = await request(app).post('/api/bills')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(billBody({ recurrence: 'one-time' }));
    const id = created.body._id;
    const headers = { Authorization: `Bearer ${owner.token}` };

    expect((await request(app).put(`/api/bills/${id}`).set(headers).send({ title: 'Updated rent' })).body.title).toBe('Updated rent');
    expect((await request(app).patch(`/api/bills/${id}/paid`).set(headers)).body.bill.status).toBe('paid');
    expect((await request(app).patch(`/api/bills/${id}/reopen`).set(headers)).body.status).toBe('unpaid');
    expect((await request(app).delete(`/api/bills/${id}`).set(headers)).status).toBe(200);
  });
});

describe('bill recurrence dates', () => {
  test('keeps a monthly end-of-month anchor and clamps leap-day yearly dates', () => {
    const jan31 = new Date('2030-01-31T00:00:00.000Z');
    expect(advanceDueDate(jan31, 'monthly', 31, 1).toISOString().slice(0, 10)).toBe('2030-02-28');
    const feb28 = advanceDueDate(jan31, 'monthly', 31, 1);
    expect(advanceDueDate(feb28, 'monthly', 31, 1).toISOString().slice(0, 10)).toBe('2030-03-31');
    expect(advanceDueDate(new Date('2024-02-29T00:00:00.000Z'), 'yearly', 29, 2).toISOString().slice(0, 10)).toBe('2025-02-28');
  });
});
