const Expense = require('../models/Expense');
const Wallet = require('../models/Wallet');
const resolveDefaultWallet = require('../utils/defaultWallet');

// Get all expenses
const getExpenses = async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    const conditions = [];
    if (req.query.type === 'income') {
      filter.type = 'income';
    } else if (req.query.type === 'expense') {
      conditions.push({ $or: [{ type: 'expense' }, { type: { $exists: false } }, { type: null }] });
    } else if (req.query.type !== undefined) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    if (req.query.walletId !== undefined) {
      if (!/^[a-f\d]{24}$/i.test(req.query.walletId)) return res.status(400).json({ message: 'Invalid wallet ID' });
      const wallet = await Wallet.findOne({ _id: req.query.walletId, userId: req.user.id });
      if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
      if (wallet.isDefault) {
        conditions.push({ $or: [{ walletId: wallet._id }, { walletId: { $exists: false } }, { walletId: null }] });
      } else {
        filter.walletId = wallet._id;
      }
    }
    if (conditions.length) filter.$and = conditions;

    const expenses = await Expense.find(filter).sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const month = req.query.month;
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: 'Month must use YYYY-MM format' });
    }

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const match = { userId: req.user._id, date: { $gte: start, $lt: end } };
    if (req.query.walletId !== undefined) {
      if (typeof req.query.walletId !== 'string' || !/^[a-f\d]{24}$/i.test(req.query.walletId)) {
        return res.status(400).json({ message: 'Invalid wallet ID' });
      }
      const wallet = await Wallet.findOne({ _id: req.query.walletId, userId: req.user.id });
      if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
      if (wallet.isDefault) {
        match.$or = [{ walletId: wallet._id }, { walletId: { $exists: false } }, { walletId: null }];
      } else {
        match.walletId = wallet._id;
      }
    }
    const totals = await Expense.aggregate([
      { $match: match },
      { $addFields: { transactionType: { $ifNull: ['$type', 'expense'] } } },
      {
        $group: {
          _id: { type: '$transactionType', category: { $ifNull: ['$category', 'General'] } },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const summary = { income: 0, expense: 0, net: 0, categories: { income: [], expense: [] } };
    for (const item of totals) {
      const type = item._id.type === 'income' ? 'income' : 'expense';
      summary[type] += item.total;
      summary.categories[type].push({ category: item._id.category, total: item.total });
    }
    summary.net = summary.income - summary.expense;
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
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
  getSummary,
};


