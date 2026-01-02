import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import BankAccount from '../models/BankAccount.js';
import FundRequest from '../models/FundRequest.js';
import WalletLedger from '../models/WalletLedger.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Auth middleware
const protectUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    if (!req.user.isActive) return res.status(401).json({ message: 'Account is deactivated' });
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Get admin's bank accounts (for deposit)
router.get('/admin-bank-accounts', protectUser, async (req, res) => {
  try {
    const accounts = await BankAccount.find({ 
      adminCode: req.user.adminCode,
      isActive: true 
    }).select('-admin');
    
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fund request (deposit)
router.post('/fund-request/deposit', protectUser, async (req, res) => {
  try {
    const { amount, paymentMethod, bankAccountId, referenceId, proofUrl, remarks } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Verify bank account belongs to user's admin
    if (bankAccountId) {
      const bankAccount = await BankAccount.findOne({
        _id: bankAccountId,
        adminCode: req.user.adminCode
      });
      if (!bankAccount) {
        return res.status(400).json({ message: 'Invalid bank account' });
      }
    }
    
    const request = await FundRequest.create({
      user: req.user._id,
      userId: req.user.userId,
      adminCode: req.user.adminCode,
      type: 'DEPOSIT',
      amount,
      paymentMethod,
      bankAccount: bankAccountId || null,
      referenceId: referenceId || '',
      proofUrl: proofUrl || '',
      userRemarks: remarks || ''
    });
    
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fund request (withdrawal)
router.post('/fund-request/withdraw', protectUser, async (req, res) => {
  try {
    const { amount, paymentMethod, withdrawalDetails, remarks } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Check user balance
    if (req.user.wallet.cashBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Get admin to check withdrawal limits
    const admin = await Admin.findOne({ adminCode: req.user.adminCode });
    if (admin) {
      if (amount < admin.charges.minWithdrawal) {
        return res.status(400).json({ 
          message: `Minimum withdrawal amount is ₹${admin.charges.minWithdrawal}` 
        });
      }
      if (amount > admin.charges.maxWithdrawal) {
        return res.status(400).json({ 
          message: `Maximum withdrawal amount is ₹${admin.charges.maxWithdrawal}` 
        });
      }
    }
    
    const request = await FundRequest.create({
      user: req.user._id,
      userId: req.user.userId,
      adminCode: req.user.adminCode,
      type: 'WITHDRAWAL',
      amount,
      paymentMethod,
      userRemarks: remarks || '',
      withdrawalDetails: withdrawalDetails || {}
    });
    
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my fund requests
router.get('/fund-requests', protectUser, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { user: req.user._id };
    
    if (status) query.status = status;
    if (type) query.type = type;
    
    const requests = await FundRequest.find(query)
      .populate('bankAccount', 'type bankName upiId')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel fund request
router.post('/fund-requests/:id/cancel', protectUser, async (req, res) => {
  try {
    const request = await FundRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'PENDING'
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Fund request not found or cannot be cancelled' });
    }
    
    request.status = 'CANCELLED';
    await request.save();
    
    res.json({ message: 'Fund request cancelled', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my wallet ledger
router.get('/ledger', protectUser, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const ledger = await WalletLedger.find({
      ownerType: 'USER',
      ownerId: req.user._id
    }).sort({ createdAt: -1 }).limit(parseInt(limit));
    
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my admin info (limited)
router.get('/my-admin', protectUser, async (req, res) => {
  try {
    const admin = await Admin.findOne({ adminCode: req.user.adminCode })
      .select('name adminCode charges.minWithdrawal charges.maxWithdrawal charges.withdrawalFee');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
