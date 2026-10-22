const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const { RECURRENCES, advanceDueDate } = require('../utils/billRecurrence');

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function validatePayload(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid bill details' };
  if (partial && Object.keys(body).length === 0) return { error: 'Provide at least one bill field to update' };
  const data = {};
  const textFields = [
    ['title', 100],
    ['category', 60],
  ];
  for (const [field, maxLength] of textFields) {
    if (body[field] === undefined && partial) continue;
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > maxLength) {
      return { error: `${field === 'title' ? 'Title' : field === 'category' ? 'Category' : 'Notes'} is invalid` };
    }
    data[field] = body[field].trim();
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.trim().length > 1000) return { error: 'Notes are invalid' };
    data.notes = body.notes.trim();
  } else if (!partial) {
    data.notes = '';
  }

  if (body.amount !== undefined || !partial) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000000) return { error: 'Amount must be greater than zero' };
    data.amount = amount;
  }

  if (body.dueDate !== undefined || !partial) {
    const dueDate = parseDateOnly(body.dueDate);
    if (!dueDate) return { error: 'Due date must be a valid date in YYYY-MM-DD format' };
    data.dueDate = dueDate;
  }

  if (body.recurrence !== undefined || !partial) {
    if (!RECURRENCES.includes(body.recurrence)) return { error: 'Choose a valid recurrence' };
    data.recurrence = body.recurrence;
  }

  if (body.reminderDays !== undefined || !partial) {
    const reminders = body.reminderDays === undefined ? [1] : body.reminderDays;
    if (!Array.isArray(reminders) || reminders.length > 8 || reminders.some((day) => !Number.isInteger(day) || day < 0 || day > 365)) {
      return { error: 'Reminder days must be whole numbers from 0 to 365' };
    }
    data.reminderDays = [...new Set(reminders)];
  }

  if (data.dueDate) {
    data.anchorDay = data.dueDate.getUTCDate();
    data.anchorMonth = data.dueDate.getUTCMonth() + 1;
  }
  return { data };
}

async function listBills(req, res, next) {
  try {
    const bills = await Bill.find({ userId: req.user.id }).sort({ status: 1, dueDate: 1, createdAt: -1 });
    return res.status(200).json(bills);
  } catch (error) {
    return next(error);
  }
}

async function createBill(req, res, next) {
  const parsed = validatePayload(req.body);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  try {
    const bill = await Bill.create({ ...parsed.data, userId: req.user.id });
    return res.status(201).json(bill);
  } catch (error) {
    return next(error);
  }
}

async function updateBill(req, res, next) {
  const parsed = validatePayload(req.body, true);
  if (parsed.error) return res.status(400).json({ message: parsed.error });
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    return res.status(200).json(bill);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: 'Invalid bill ID' });
    return next(error);
  }
}

async function markBillPaid(req, res, next) {
  try {
    const current = await Bill.findOne({ _id: req.params.id, userId: req.user.id, status: 'unpaid' });
    if (!current) {
      const exists = await Bill.exists({ _id: req.params.id, userId: req.user.id });
      if (!exists) return res.status(404).json({ message: 'Bill not found' });
      return res.status(409).json({ message: 'This bill is already paid' });
    }
    const paidAt = new Date();
    const update = {
      $push: { paymentHistory: { action: 'paid', dueDate: current.dueDate, paidAt, amount: current.amount } },
    };
    if (current.recurrence === 'one-time') {
      update.$set = { status: 'paid' };
    } else {
      update.$set = {
        dueDate: advanceDueDate(current.dueDate, current.recurrence, current.anchorDay, current.anchorMonth),
        status: 'unpaid',
      };
    }
    const bill = await Bill.findOneAndUpdate(
      { _id: current._id, userId: req.user.id, status: 'unpaid', dueDate: current.dueDate },
      update,
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(409).json({ message: 'The bill changed. Refresh and try again.' });
    return res.status(200).json({ bill, paidOccurrence: { dueDate: current.dueDate, paidAt } });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: 'Invalid bill ID' });
    return next(error);
  }
}

async function reopenBill(req, res, next) {
  try {
    const current = await Bill.findOne({ _id: req.params.id, userId: req.user.id, recurrence: 'one-time', status: 'paid' });
    if (!current) return res.status(404).json({ message: 'Paid one-time bill not found' });
    const reopenedAt = new Date();
    const bill = await Bill.findOneAndUpdate(
      { _id: current._id, userId: req.user.id, recurrence: 'one-time', status: 'paid' },
      {
        $set: { status: 'unpaid' },
        $push: { paymentHistory: { action: 'reopened', dueDate: current.dueDate, reopenedAt } },
      },
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(409).json({ message: 'The bill changed. Refresh and try again.' });
    return res.status(200).json(bill);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: 'Invalid bill ID' });
    return next(error);
  }
}

async function deleteBill(req, res, next) {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    return res.status(200).json({ message: 'Bill deleted' });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) return res.status(400).json({ message: 'Invalid bill ID' });
    return next(error);
  }
}

module.exports = { DAY_MS, parseDateOnly, validatePayload, listBills, createBill, updateBill, markBillPaid, reopenBill, deleteBill };
