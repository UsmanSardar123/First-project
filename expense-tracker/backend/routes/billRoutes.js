const express = require('express');
const {
  listBills,
  createBill,
  updateBill,
  markBillPaid,
  reopenBill,
  deleteBill,
} = require('../controllers/billController');

const router = express.Router();

router.get('/', listBills);
router.post('/', createBill);
router.put('/:id', updateBill);
router.patch('/:id/paid', markBillPaid);
router.patch('/:id/reopen', reopenBill);
router.delete('/:id', deleteBill);

module.exports = router;
