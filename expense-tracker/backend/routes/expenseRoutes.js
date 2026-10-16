const express = require('express');
const router = express.Router();

const { getExpenses } = require('../controllers/expenseController');

// GET /api/expenses
router.get('/', getExpenses);

module.exports = router;