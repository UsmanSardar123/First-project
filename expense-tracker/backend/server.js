
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Expense = require('./models/Expense');
const Budget = require('./models/Budget');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();

async function getAvailableIncome(excludeTransactionId) {
  const filter = excludeTransactionId ? { _id: { $ne: excludeTransactionId } } : {};
  const transactions = await Expense.find(filter).select('amount type').lean();
  return transactions.reduce((balance, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return balance + (transaction.type === 'income' ? amount : -amount);
  }, 0);
}

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send('Expense API running');
});

// Expense routes handled by the router and controller
app.use('/api/expenses', expenseRoutes);

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
    const {
      title,
      amount,
      category,
      date,
      type,
      notes,
      paymentMethod,
    } = req.body || {};

    if (type !== 'income') {
      const availableIncome = await getAvailableIncome();
      if (Number(amount) > availableIncome) {
        return res.status(400).json({
          message: `This expense exceeds your available income of ${Math.max(availableIncome, 0)}.`,
        });
      }
    }

    const expense = await Expense.create({
      title,
      amount,
      category,
      date,
      type,
      notes,
      paymentMethod,
    });

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
    const {
      title,
      amount,
      category,
      date,
      type,
      notes,
      paymentMethod,
    } = req.body || {};

    if (type !== 'income') {
      const availableIncome = await getAvailableIncome(req.params.id);
      if (Number(amount) > availableIncome) {
        return res.status(400).json({
          message: `This expense exceeds your available income of ${Math.max(availableIncome, 0)}.`,
        });
      }
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title,
          amount,
          category,
          date,
          type,
          notes,
          paymentMethod,
        },
      },
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
    const expense = await Expense.findByIdAndDelete(req.params.id);

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

// Start the server after connecting to MongoDB
async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
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

startServer();
