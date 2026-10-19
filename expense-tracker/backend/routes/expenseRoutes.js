const express = require('express');
const router = express.Router();

const { getExpense, getExpenses } = require('../controllers/expenseController');

// GET /api/expenses
router.get('/', getExpenses);
router.get('/:id', getExpense);

module.exports = router;