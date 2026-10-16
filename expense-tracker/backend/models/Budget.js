const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true, lowercase: true, unique: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Budget', budgetSchema);
