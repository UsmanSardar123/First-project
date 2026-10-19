const Expense = require('../models/Expense');

// Get all expenses
const getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    next(error);
  }
};

const getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!expense) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    return res.status(200).json(expense);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    return next(error);
  }
};

module.exports = {
  getExpenses,
  getExpense,
};


