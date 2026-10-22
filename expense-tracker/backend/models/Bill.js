const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['paid', 'reopened'], required: true },
  dueDate: { type: Date, required: true },
  paidAt: { type: Date },
  amount: { type: Number, min: 0.01 },
  reopenedAt: { type: Date },
}, { _id: false });

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  amount: { type: Number, required: true, min: 0.01 },
  dueDate: { type: Date, required: true },
  recurrence: { type: String, enum: ['one-time', 'weekly', 'monthly', 'yearly'], default: 'one-time' },
  anchorDay: { type: Number, required: true, min: 1, max: 31 },
  anchorMonth: { type: Number, required: true, min: 1, max: 12 },
  reminderDays: { type: [Number], default: [1] },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  paymentHistory: { type: [paymentHistorySchema], default: [] },
}, { timestamps: true });

billSchema.index({ userId: 1, dueDate: 1, status: 1 });

module.exports = mongoose.model('Bill', billSchema);
