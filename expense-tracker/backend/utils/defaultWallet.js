const Wallet = require('../models/Wallet');

async function resolveDefaultWallet(userId) {
  let wallet = await Wallet.findOne({ userId, isDefault: true });
  if (wallet) return wallet;
  wallet = await Wallet.findOne({ userId }).sort({ createdAt: 1 });
  if (wallet) {
    wallet.isDefault = true;
    await wallet.save();
    return wallet;
  }
  try {
    return await Wallet.create({ userId, name: 'Cash', nameKey: 'cash', type: 'cash', isDefault: true });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return Wallet.findOne({ userId, isDefault: true });
  }
}

module.exports = resolveDefaultWallet;
