const express = require('express');
const router = express.Router();
const {
  getWallets,
  createWallet,
  updateWallet,
  archiveWallet,
  deleteWallet,
} = require('../controllers/walletController');

router.post('/', createWallet);
router.get('/', getWallets);
router.put('/:id', updateWallet);
router.patch('/:id/archive', archiveWallet);
router.delete('/:id', deleteWallet);

module.exports = router;
