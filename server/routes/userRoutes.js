import express from 'express';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import BankSettings from '../models/BankSettings.js';
import BankAccount from '../models/BankAccount.js';
import FundRequest from '../models/FundRequest.js';
import { protectUser, generateToken } from '../middleware/auth.js';

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, adminCode, referralCode } = req.body;
    
    let admin;
    
    // If admin code or referral code provided, use that admin
    if (adminCode || referralCode) {
      const lookup = adminCode
        ? { adminCode: adminCode.trim().toUpperCase() }
        : { referralCode: referralCode.trim().toUpperCase() };

      admin = await Admin.findOne(lookup);

      if (!admin) {
        return res.status(400).json({ message: 'Invalid admin or referral code' });
      }

      if (admin.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Admin is not active. Contact support.' });
      }
    } else {
      // No admin code provided - assign to Super Admin by default
      admin = await Admin.findOne({ role: 'SUPER_ADMIN', status: 'ACTIVE' });
      
      if (!admin) {
        return res.status(400).json({ message: 'System not configured. Please contact support.' });
      }
    }
    
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      phone,
      admin: admin._id,
      adminCode: admin.adminCode
    });

    // Update admin stats - increment user count
    admin.stats.totalUsers = (admin.stats.totalUsers || 0) + 1;
    admin.stats.activeUsers = (admin.stats.activeUsers || 0) + 1;
    await admin.save();

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      adminCode: user.adminCode,
      wallet: user.wallet,
      marginAvailable: user.marginAvailable,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    if (await user.comparePassword(password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        wallet: user.wallet,
        marginAvailable: user.marginAvailable,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/profile', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bank details for deposits - Shows admin's bank accounts, not Super Admin's
router.get('/bank-details', protectUser, async (req, res) => {
  try {
    // Get the user's admin code to fetch their admin's bank accounts
    const userAdminCode = req.user.adminCode;
    
    // First try to get the admin's bank accounts
    const adminBankAccounts = await BankAccount.find({ 
      adminCode: userAdminCode, 
      type: 'BANK',
      isActive: true 
    }).sort({ isPrimary: -1 });
    
    const adminUpiAccounts = await BankAccount.find({ 
      adminCode: userAdminCode, 
      type: 'UPI',
      isActive: true 
    }).sort({ isPrimary: -1 });
    
    // Get global settings for limits and instructions
    const settings = await BankSettings.getSettings();
    
    // If admin has bank accounts configured, use them
    if (adminBankAccounts.length > 0 || adminUpiAccounts.length > 0) {
      const bankAccount = adminBankAccounts[0]; // Primary or first active
      const upiAccount = adminUpiAccounts[0]; // Primary or first active
      
      res.json({
        bankName: bankAccount?.bankName || 'Not configured',
        accountName: bankAccount?.holderName || 'Not configured',
        accountNumber: bankAccount?.accountNumber || 'Not configured',
        ifscCode: bankAccount?.ifsc || 'Not configured',
        branch: bankAccount?.accountType || '',
        upiId: upiAccount?.upiId || 'Not configured',
        upiName: upiAccount?.holderName || 'Not configured',
        depositInstructions: settings.depositInstructions,
        minimumDeposit: settings.minimumDeposit,
        maximumDeposit: settings.maximumDeposit
      });
    } else {
      // Fallback to global settings (Super Admin's bank) if admin hasn't configured any
      const bankAccount = settings.bankAccounts.find(acc => acc.isPrimary && acc.isActive) 
        || settings.bankAccounts.find(acc => acc.isActive);
      
      const upiAccount = settings.upiAccounts.find(acc => acc.isPrimary && acc.isActive)
        || settings.upiAccounts.find(acc => acc.isActive);
      
      res.json({
        bankName: bankAccount?.bankName || 'Not configured',
        accountName: bankAccount?.accountName || 'Not configured',
        accountNumber: bankAccount?.accountNumber || 'Not configured',
        ifscCode: bankAccount?.ifscCode || 'Not configured',
        branch: bankAccount?.branch || '',
        upiId: upiAccount?.upiId || 'Not configured',
        upiName: upiAccount?.name || 'Not configured',
        depositInstructions: settings.depositInstructions,
        minimumDeposit: settings.minimumDeposit,
        maximumDeposit: settings.maximumDeposit
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit deposit request
router.post('/deposit-request', protectUser, async (req, res) => {
  try {
    const { amount, utrNumber, paymentMethod, remarks } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!utrNumber) {
      return res.status(400).json({ message: 'UTR/Transaction ID is required' });
    }

    const request = await FundRequest.create({
      user: req.user._id,
      userId: req.user.userId,
      adminCode: req.user.adminCode || 'SUPER',
      type: 'DEPOSIT',
      amount,
      paymentMethod: paymentMethod || 'BANK',
      referenceId: utrNumber,
      userRemarks: remarks || ''
    });
    
    res.status(201).json({ 
      message: 'Deposit request submitted successfully',
      requestId: request.requestId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit withdrawal request
router.post('/withdraw-request', protectUser, async (req, res) => {
  try {
    const { amount, accountDetails, paymentMethod, remarks } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user._id);
    
    if (amount > user.wallet.cashBalance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    const request = await FundRequest.create({
      user: req.user._id,
      userId: req.user.userId,
      adminCode: req.user.adminCode || 'SUPER',
      type: 'WITHDRAWAL',
      amount,
      paymentMethod: paymentMethod || 'BANK',
      userRemarks: remarks || '',
      withdrawalDetails: {
        notes: accountDetails || ''
      }
    });
    
    res.status(201).json({ 
      message: 'Withdrawal request submitted successfully',
      requestId: request.requestId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get wallet info (enhanced)
router.get('/wallet', protectUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wallet marginSettings rmsSettings');
    
    // Calculate available margin
    const availableMargin = user.wallet.cashBalance 
      + user.wallet.collateralValue 
      + Math.max(0, user.wallet.unrealizedPnL)
      - Math.abs(Math.min(0, user.wallet.unrealizedPnL))
      - user.wallet.usedMargin;

    res.json({
      // Core wallet fields
      cashBalance: user.wallet.cashBalance,
      usedMargin: user.wallet.usedMargin,
      collateralValue: user.wallet.collateralValue,
      realizedPnL: user.wallet.realizedPnL,
      unrealizedPnL: user.wallet.unrealizedPnL,
      todayRealizedPnL: user.wallet.todayRealizedPnL,
      todayUnrealizedPnL: user.wallet.todayUnrealizedPnL,
      
      // Calculated fields
      availableMargin,
      totalBalance: user.wallet.cashBalance + user.wallet.realizedPnL,
      
      // Legacy fields for backward compatibility
      wallet: {
        balance: user.wallet.cashBalance,
        transactions: user.wallet.transactions
      },
      marginAvailable: availableMargin,
      
      // Settings
      marginSettings: user.marginSettings,
      rmsStatus: user.rmsSettings?.tradingBlocked ? 'BLOCKED' : 'ACTIVE',
      rmsBlockReason: user.rmsSettings?.blockReason
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.post('/change-password', protectUser, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide old and new password' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if old password matches
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
