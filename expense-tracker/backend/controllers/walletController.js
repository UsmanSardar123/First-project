const mongoose = require('mongoose');
const { z } = require('zod');
const Expense = require('../models/Expense');
const Wallet = require('../models/Wallet');
const resolveDefaultWallet = require('../utils/defaultWallet');

const walletTypes = ['cash', 'bank', 'mobile', 'card', 'other'];
const walletFields = {
  name: z.string().trim().min(1).max(40),
  type: z.enum(walletTypes),
  openingBalance: z.coerce.number().finite().optional(),
  color: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
};
const createSchema = z.object(walletFields).strict();
const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0);
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const listSchema = z.object({ includeArchived: z.enum(['true', 'false']).optional() }).strict();

function parse(schema, input, res) {
  const result = schema.safeParse(input);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid wallet details' });
    return null;
  }
  return result.data;
}

function duplicateName(error) {
  return error?.code === 11000;
}

const getWallets = async (req, res, next) => {
  try {
    const query = parse(listSchema, req.query, res);
    if (!query) return;
    const defaultWallet = await resolveDefaultWallet(req.user.id);
    const filter = { userId: req.user.id };
    if (query.includeArchived !== 'true') filter.archived = false;
    const wallets = await Wallet.find(filter).sort({ isDefault: -1, createdAt: 1 }).lean();
    const balances = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $addFields: { effectiveType: { $ifNull: ['$type', 'expense'] } } },
      {
        $group: {
          _id: { $ifNull: ['$walletId', null] },
          income: { $sum: { $cond: [{ $eq: ['$effectiveType', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $ne: ['$effectiveType', 'income'] }, '$amount', 0] } },
        },
      },
    ]);
    const byWallet = new Map(balances.map((item) => [String(item._id), item]));
    for (const wallet of wallets) {
      const totals = byWallet.get(String(wallet._id)) || (String(wallet._id) === String(defaultWallet._id) ? byWallet.get('null') : null);
      wallet.balance = Number(wallet.openingBalance || 0) + Number(totals?.income || 0) - Number(totals?.expense || 0);
    }
    return res.status(200).json(wallets);
  } catch (error) {
    return next(error);
  }
};

const createWallet = async (req, res, next) => {
  try {
    const data = parse(createSchema, req.body, res);
    if (!data) return;
    const existingName = await Wallet.findOne({ userId: req.user.id, nameKey: data.name.toLocaleLowerCase() });
    if (existingName) return res.status(409).json({ message: 'A wallet with this name already exists' });
    const existingDefault = await Wallet.findOne({ userId: req.user.id, isDefault: true });
    const makeDefault = !existingDefault || Boolean(data.isDefault);
    const wallet = await Wallet.create({ ...data, userId: req.user.id, isDefault: false });
    if (makeDefault) {
      await Wallet.updateMany({ userId: req.user.id, isDefault: true }, { $set: { isDefault: false } });
      wallet.isDefault = true;
      await wallet.save();
    }
    return res.status(201).json(wallet);
  } catch (error) {
    if (duplicateName(error)) return res.status(409).json({ message: 'A wallet with this name already exists' });
    return next(error);
  }
};

const updateWallet = async (req, res, next) => {
  try {
    if (!idSchema.safeParse(req.params.id).success) return res.status(404).json({ message: 'Wallet not found' });
    const data = parse(updateSchema, req.body, res);
    if (!data) return;
    const wallet = await Wallet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    if (data.name) {
      const duplicate = await Wallet.findOne({ userId: req.user.id, nameKey: data.name.toLocaleLowerCase(), _id: { $ne: wallet._id } });
      if (duplicate) return res.status(409).json({ message: 'A wallet with this name already exists' });
    }
    if (data.isDefault === false && wallet.isDefault) return res.status(400).json({ message: 'Set another default wallet first' });
    if (data.isDefault) await Wallet.updateMany({ userId: req.user.id, isDefault: true, _id: { $ne: wallet._id } }, { $set: { isDefault: false } });
    Object.assign(wallet, data);
    await wallet.save();
    return res.status(200).json(wallet);
  } catch (error) {
    if (duplicateName(error)) return res.status(409).json({ message: 'A wallet with this name already exists' });
    return next(error);
  }
};

const archiveWallet = async (req, res, next) => {
  try {
    if (!idSchema.safeParse(req.params.id).success) return res.status(404).json({ message: 'Wallet not found' });
    const currentWallet = await Wallet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!currentWallet) return res.status(404).json({ message: 'Wallet not found' });
    if (currentWallet.isDefault) return res.status(409).json({ message: 'Set another default wallet before archiving this one' });
    const wallet = await Wallet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { archived: true } },
      { new: true }
    );
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    return res.status(200).json(wallet);
  } catch (error) {
    return next(error);
  }
};

const deleteWallet = async (req, res, next) => {
  try {
    if (!idSchema.safeParse(req.params.id).success) return res.status(404).json({ message: 'Wallet not found' });
    const wallet = await Wallet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    const recordFilter = { userId: req.user.id, $or: [{ walletId: wallet._id }] };
    if (wallet.isDefault) recordFilter.$or.push({ walletId: { $exists: false } }, { walletId: null });
    if (await Expense.exists(recordFilter)) return res.status(409).json({ message: 'Wallet has transactions and cannot be deleted' });
    await Wallet.deleteOne({ _id: wallet._id, userId: req.user.id });
    return res.status(200).json({ message: 'Wallet deleted' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getWallets, createWallet, updateWallet, archiveWallet, deleteWallet };
