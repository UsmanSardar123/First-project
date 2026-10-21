const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    age: { type: Number, min: 1, max: 120 },
    gender: {
      type: String,
      enum: ['female', 'male', 'non-binary', 'prefer-not-to-say'],
      default: 'prefer-not-to-say',
    },
    profession: { type: String, trim: true, maxlength: 100, default: '' },
    workType: {
      type: String,
      enum: ['employee', 'business-owner', 'self-employed', 'student', 'other'],
      default: 'other',
    },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
