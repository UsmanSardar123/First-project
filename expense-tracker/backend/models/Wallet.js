const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    // Internal normalized key keeps uniqueness case-insensitive without a data migration.
    nameKey: { type: String, required: true, select: false },
    type: { type: String, enum: ['cash', 'bank', 'mobile', 'card', 'other'], required: true },
    openingBalance: { type: Number, default: 0 },
    color: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: '' },
    isDefault: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (doc, value) => { delete value.nameKey; return value; } },
  }
);

walletSchema.pre('validate', function normalizeName() {
  if (this.isModified('name') && this.name) this.nameKey = this.name.trim().toLocaleLowerCase();
});

walletSchema.index({ userId: 1, nameKey: 1 }, { unique: true });
walletSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model('Wallet', walletSchema);
