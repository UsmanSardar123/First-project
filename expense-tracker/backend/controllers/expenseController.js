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

module.exports = {
  getExpenses,
};