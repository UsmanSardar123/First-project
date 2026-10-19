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
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
