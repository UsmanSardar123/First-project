const express = require('express');
const router = express.Router();

const { getExpense, getExpenses, getSummary } = require('../controllers/expenseController');

// GET /api/expenses
router.get('/', getExpenses);
router.get('/summary', getSummary);
router.get('/:id', getExpense);

module.exports = router;
