const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: ['expense', 'income'], default: 'expense' },
    category: { type: String, default: 'General', trim: true },
    paymentMethod: { type: String, trim: true, default: '' },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
