
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { z } = require('zod');

const Expense = require('./models/Expense');
const Wallet = require('./models/Wallet');
const resolveDefaultWallet = require('./utils/defaultWallet');
const Budget = require('./models/Budget');
const expenseRoutes = require('./routes/expenseRoutes');
const walletRoutes = require('./routes/walletRoutes');
const authRoutes = require('./routes/authRoutes');
const billRoutes = require('./routes/billRoutes');
const authenticate = require('./middleware/auth');

const app = express();
const expenseFields = {
  title: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  category: z.string().trim().optional(),
  date: z.coerce.date().optional(),
  type: z.enum(['expense', 'income']).optional(),
  notes: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  walletId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
};
const createExpenseSchema = z.object({
  title: expenseFields.title,
  amount: expenseFields.amount,
  category: expenseFields.category,
  date: expenseFields.date,
  type: expenseFields.type,
  notes: expenseFields.notes,
  paymentMethod: expenseFields.paymentMethod,
  walletId: expenseFields.walletId,
});
const updateExpenseSchema = createExpenseSchema.partial().refine(
  (data) => Object.keys(data).length > 0
);

async function getAvailableIncome(userId, excludeTransactionId) {
  const filter = { userId };
  if (excludeTransactionId) {
    filter._id = { $ne: excludeTransactionId };
  }
  const transactions = await Expense.find(filter).select('amount type').lean();
  return transactions.reduce((balance, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return balance + (transaction.type === 'income' ? amount : -amount);
  }, 0);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Home route
app.get('/', (req, res) => {
  res.send('Expense API running');
});

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Expense routes handled by the router and controller
app.use('/api/expenses', authenticate);
app.use('/api/expenses', expenseRoutes);
app.use('/api/wallets', authenticate);
app.use('/api/wallets', walletRoutes);
app.use('/api/bills', authenticate);
app.use('/api/bills', billRoutes);

// Get all budgets
app.get('/api/budgets', async (req, res) => {
  try {
    const budgets = await Budget.find().sort({ category: 1 });
    res.status(200).json(budgets);
  } catch (error) {
    console.error('Budget fetch error:', error.message);
    res.status(500).json({
      message: 'Failed to fetch budgets',
    });
  }
});

// Create or update a budget
app.post('/api/budgets', async (req, res) => {
  try {
    const category =
      typeof req.body?.category === 'string'
        ? req.body.category.trim().toLowerCase()
        : '';

    const amount = Number(req.body?.amount);

    if (!category || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message:
          'Category and a budget amount greater than zero are required',
      });
    }

    const budget = await Budget.findOneAndUpdate(
      { category },
      {
        $set: { amount },
        $setOnInsert: { category },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json(budget);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error('Budget save error:', error.message);

    res.status(500).json({
      message: 'Failed to save budget',
    });
  }
});

// Create an expense
app.post('/api/expenses', async (req, res) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid expense details' });
    }
    const { amount, type } = parsed.data;

    if (type !== 'income') {
      const availableIncome = await getAvailableIncome(req.user.id);
      if (Number(amount) > availableIncome) {
        return res.status(400).json({
          message: `This expense exceeds your available income of ${Math.max(availableIncome, 0)}.`,
        });
      }
    }

    const wallet = parsed.data.walletId
      ? await Wallet.findOne({ _id: parsed.data.walletId, userId: req.user.id })
      : await resolveDefaultWallet(req.user.id);
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    const expense = await Expense.create({ ...parsed.data, walletId: wallet._id, userId: req.user.id });

    res.status(201).json(expense);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error('Create error:', error.message);

    res.status(500).json({
      message: 'Failed to create expense',
    });
  }
});

// Update an expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid expense details' });
    }

    const currentExpense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!currentExpense) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const amount = parsed.data.amount ?? currentExpense.amount;
    const type = parsed.data.type ?? currentExpense.type;
    const wallet = parsed.data.walletId
      ? await Wallet.findOne({ _id: parsed.data.walletId, userId: req.user.id })
      : await resolveDefaultWallet(req.user.id);
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    if (type !== 'income') {
      const availableIncome = await getAvailableIncome(req.user.id, req.params.id);
      if (amount > availableIncome) {
        return res.status(400).json({
          message: `This expense exceeds your available income of ${Math.max(availableIncome, 0)}.`,
        });
      }
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { ...parsed.data, walletId: wallet._id } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!expense) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }

    res.status(200).json(expense);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid transaction ID or data',
      });
    }

    console.error('Update error:', error.message);

    res.status(500).json({
      message: 'Failed to update transaction',
    });
  }
});

// Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
      });
    }

    res.status(200).json({
      message: 'Expense deleted',
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid expense ID',
      });
    }

    console.error('Delete error:', error.message);

    res.status(500).json({
      message: 'Failed to delete expense',
    });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  console.error('API error:', error.message);
  return res.status(500).json({ message: 'The request could not be completed' });
});

// Return a useful JSON error instead of Express's default HTML 404 page.
app.use((req, res) => {
  res.status(404).json({
    message: `No route found for ${req.method} ${req.originalUrl}`,
  });
});

// Start the server after connecting to MongoDB
async function startServer() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGO_URI missing from environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

