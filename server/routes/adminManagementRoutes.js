import express from 'express';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import BankAccount from '../models/BankAccount.js';
import FundRequest from '../models/FundRequest.js';
import WalletLedger from '../models/WalletLedger.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Auth middleware - validates admin token
const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id).select('-password');
    
    if (!req.admin) return res.status(401).json({ message: 'Admin not found' });
    if (req.admin.status !== 'ACTIVE') return res.status(401).json({ message: 'Account suspended' });
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Super Admin only middleware
const superAdminOnly = (req, res, next) => {
  if (req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

// Apply adminCode filter for non-super admins
const applyAdminFilter = (req, query = {}) => {
  if (req.admin.role !== 'SUPER_ADMIN') {
    query.adminCode = req.admin.adminCode;
  }
  return query;
};

// ==================== SUPER ADMIN ROUTES ====================

// Get all admins (Super Admin only)
router.get('/admins', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const admins = await Admin.find({ role: 'ADMIN' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Get user counts for each admin
    const adminData = await Promise.all(admins.map(async (admin) => {
      const userCount = await User.countDocuments({ adminCode: admin.adminCode });
      const activeUsers = await User.countDocuments({ adminCode: admin.adminCode, isActive: true });
      return {
        ...admin.toObject(),
        stats: {
          ...admin.stats,
          totalUsers: userCount,
          activeUsers
        }
      };
    }));
    
    res.json(adminData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new admin (Super Admin only)
router.post('/admins', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { username, name, email, phone, password, pin, charges } = req.body;
    
    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }

    const normalizedPin = pin.toString().trim();
    if (!/^\d{4,6}$/.test(normalizedPin)) {
      return res.status(400).json({ message: 'PIN must be a 4-6 digit number' });
    }
    
    // Check if admin exists
    const exists = await Admin.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: 'Admin with this email or username already exists' });
    }
    
    const admin = await Admin.create({
      role: 'ADMIN',
      username,
      name,
      email,
      phone,
      password,
      pin: normalizedPin,
      charges: charges || {},
      createdBy: req.admin._id
    });
    
    res.status(201).json({
      _id: admin._id,
      adminCode: admin.adminCode,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      charges: admin.charges,
      wallet: admin.wallet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single admin details (Super Admin only)
router.get('/admins/:id', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    // Get user stats
    const userCount = await User.countDocuments({ adminCode: admin.adminCode });
    const activeUsers = await User.countDocuments({ adminCode: admin.adminCode, isActive: true });
    
    res.json({
      ...admin.toObject(),
      stats: { ...admin.stats, totalUsers: userCount, activeUsers }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update admin (Super Admin only)
router.put('/admins/:id', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { name, phone, status, charges } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ message: 'Cannot modify Super Admin' });
    
    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (status) {
      admin.status = status;
      admin.isActive = status === 'ACTIVE';
    }
    if (charges) admin.charges = { ...admin.charges, ...charges };
    
    await admin.save();
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update admin lot settings (Super Admin only)
router.put('/admins/:id/lot-settings', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { lotSettings, enabledLeverages, allowTradingOutsideMarketHours, marginCallPercentage } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ message: 'Cannot modify Super Admin settings' });
    
    // Update lot settings
    if (lotSettings) {
      admin.lotSettings = { ...admin.lotSettings, ...lotSettings };
    }
    
    // Update leverage settings
    if (enabledLeverages) {
      if (!admin.leverageSettings) admin.leverageSettings = {};
      admin.leverageSettings.enabledLeverages = enabledLeverages;
      admin.leverageSettings.maxLeverage = Math.max(...enabledLeverages);
    }
    
    // Update trading settings
    if (!admin.tradingSettings) admin.tradingSettings = {};
    if (typeof allowTradingOutsideMarketHours === 'boolean') {
      admin.tradingSettings.allowTradingOutsideMarketHours = allowTradingOutsideMarketHours;
    }
    if (marginCallPercentage) {
      admin.tradingSettings.autoClosePercentage = marginCallPercentage;
    }
    
    await admin.save();
    
    res.json({ 
      message: 'Settings updated successfully', 
      lotSettings: admin.lotSettings,
      leverageSettings: admin.leverageSettings,
      tradingSettings: admin.tradingSettings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user (Super Admin only) - can assign to any admin
router.post('/create-user', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { username, email, password, fullName, phone, adminCode, initialBalance } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }
    
    // Find the target admin if adminCode is provided and not SUPER
    let targetAdmin = null;
    let targetAdminCode = adminCode || 'SUPER';
    
    if (adminCode && adminCode !== 'SUPER') {
      targetAdmin = await Admin.findOne({ adminCode });
      if (!targetAdmin) {
        return res.status(400).json({ message: 'Invalid admin code' });
      }
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      fullName: fullName || '',
      phone: phone || '',
      adminCode: targetAdminCode,
      admin: targetAdmin?._id || null,
      wallet: {
        balance: initialBalance || 0,
        blocked: 0
      },
      isActive: true
    });
    
    // Update admin stats if assigned to an admin
    if (targetAdmin) {
      targetAdmin.stats.totalUsers = (targetAdmin.stats.totalUsers || 0) + 1;
      targetAdmin.stats.activeUsers = (targetAdmin.stats.activeUsers || 0) + 1;
      await targetAdmin.save();
    }
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: user._id,
        userId: user.userId,
        username: user.username,
        email: user.email,
        adminCode: user.adminCode
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Transfer user to another admin (Super Admin only)
router.post('/users/:userId/transfer', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { targetAdminId } = req.body;
    const { userId } = req.params;
    
    if (!targetAdminId) {
      return res.status(400).json({ message: 'Target admin ID is required' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the target admin
    const targetAdmin = await Admin.findById(targetAdminId);
    if (!targetAdmin) {
      return res.status(404).json({ message: 'Target admin not found' });
    }
    
    if (targetAdmin.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Target admin is not active' });
    }
    
    // Get the old admin to update stats
    const oldAdmin = await Admin.findById(user.admin);
    
    // Update user's admin reference
    const oldAdminCode = user.adminCode;
    user.admin = targetAdmin._id;
    user.adminCode = targetAdmin.adminCode;
    await user.save();
    
    // Update old admin stats
    if (oldAdmin) {
      oldAdmin.stats.totalUsers = Math.max(0, (oldAdmin.stats.totalUsers || 1) - 1);
      if (user.isActive) {
        oldAdmin.stats.activeUsers = Math.max(0, (oldAdmin.stats.activeUsers || 1) - 1);
      }
      await oldAdmin.save();
    }
    
    // Update new admin stats
    targetAdmin.stats.totalUsers = (targetAdmin.stats.totalUsers || 0) + 1;
    if (user.isActive) {
      targetAdmin.stats.activeUsers = (targetAdmin.stats.activeUsers || 0) + 1;
    }
    await targetAdmin.save();
    
    res.json({ 
      message: 'User transferred successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        oldAdminCode,
        newAdminCode: targetAdmin.adminCode,
        newAdminName: targetAdmin.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users for Super Admin (can see all users across all admins)
router.get('/all-users', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('admin', 'name adminCode')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add funds to admin wallet (Super Admin only)
router.post('/admins/:id/add-funds', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    // Update admin wallet
    admin.wallet.balance += amount;
    admin.wallet.totalDeposited += amount;
    await admin.save();
    
    // Create ledger entry
    await WalletLedger.create({
      ownerType: 'ADMIN',
      ownerId: admin._id,
      adminCode: admin.adminCode,
      type: 'CREDIT',
      reason: 'ADMIN_DEPOSIT',
      amount,
      balanceAfter: admin.wallet.balance,
      description: description || 'Fund added by Super Admin',
      performedBy: req.admin._id
    });
    
    res.json({ message: 'Funds added successfully', wallet: admin.wallet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deduct funds from admin wallet (Super Admin only)
router.post('/admins/:id/deduct-funds', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    if (admin.wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Update admin wallet
    admin.wallet.balance -= amount;
    admin.wallet.totalWithdrawn += amount;
    await admin.save();
    
    // Create ledger entry
    await WalletLedger.create({
      ownerType: 'ADMIN',
      ownerId: admin._id,
      adminCode: admin.adminCode,
      type: 'DEBIT',
      reason: 'ADMIN_WITHDRAW',
      amount,
      balanceAfter: admin.wallet.balance,
      description: description || 'Fund deducted by Super Admin',
      performedBy: req.admin._id
    });
    
    res.json({ message: 'Funds deducted successfully', wallet: admin.wallet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard stats (Super Admin)
router.get('/dashboard-stats', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments({ role: 'ADMIN' });
    const activeAdmins = await Admin.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Aggregate admin wallet balances
    const adminWallets = await Admin.aggregate([
      { $match: { role: 'ADMIN' } },
      { $group: { _id: null, totalBalance: { $sum: '$wallet.balance' } } }
    ]);
    
    // Aggregate user wallet balances
    const userWallets = await User.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$wallet.cashBalance' } } }
    ]);
    
    res.json({
      totalAdmins,
      activeAdmins,
      totalUsers,
      activeUsers,
      totalAdminBalance: adminWallets[0]?.totalBalance || 0,
      totalUserBalance: userWallets[0]?.totalBalance || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== ADMIN ROUTES (Both Super Admin & Admin) ====================

// Get my profile
router.get('/profile', protectAdmin, async (req, res) => {
  try {
    res.json(req.admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update my profile
router.put('/profile', protectAdmin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    if (name) req.admin.name = name;
    if (phone) req.admin.phone = phone;
    
    await req.admin.save();
    res.json(req.admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my users (Admin sees only their users, Super Admin sees all)
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const query = applyAdminFilter(req);
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user (Admin creates user with their adminCode)
router.post('/users', protectAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;
    
    // Only ADMIN role can create users (not SUPER_ADMIN directly)
    if (req.admin.role === 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'Super Admin cannot create users directly. Create an Admin first.' });
    }
    
    // Check if user exists
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }
    
    const user = await User.create({
      adminCode: req.admin.adminCode,
      admin: req.admin._id,
      username,
      email,
      password,
      fullName,
      phone
    });
    
    // Update admin stats
    req.admin.stats.totalUsers += 1;
    req.admin.stats.activeUsers += 1;
    await req.admin.save();
    
    res.status(201).json({
      _id: user._id,
      userId: user.userId,
      adminCode: user.adminCode,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      wallet: user.wallet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single user
router.get('/users/:id', protectAdmin, async (req, res) => {
  try {
    const query = applyAdminFilter(req, { _id: req.params.id });
    const user = await User.findOne(query).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.put('/users/:id', protectAdmin, async (req, res) => {
  try {
    const query = applyAdminFilter(req, { _id: req.params.id });
    const user = await User.findOne(query);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { fullName, phone, tradingStatus, isActive } = req.body;
    
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (tradingStatus) user.tradingStatus = tradingStatus;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add funds to user (Admin → User)
router.post('/users/:id/add-funds', protectAdmin, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    
    const query = applyAdminFilter(req, { _id: req.params.id });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // For ADMIN role, check if admin has sufficient balance
    if (req.admin.role === 'ADMIN') {
      if (req.admin.wallet.balance < amount) {
        return res.status(400).json({ message: 'Insufficient admin wallet balance' });
      }
      
      // Deduct from admin wallet
      req.admin.wallet.balance -= amount;
      await req.admin.save();
      
      // Create admin ledger entry
      await WalletLedger.create({
        ownerType: 'ADMIN',
        ownerId: req.admin._id,
        adminCode: req.admin.adminCode,
        type: 'DEBIT',
        reason: 'FUND_ADD',
        amount,
        balanceAfter: req.admin.wallet.balance,
        description: `Fund added to user ${user.userId}`,
        performedBy: req.admin._id
      });
    }
    
    // Add to user wallet
    user.wallet.cashBalance += amount;
    user.wallet.balance = user.wallet.cashBalance; // Legacy field
    await user.save();
    
    // Create user ledger entry
    await WalletLedger.create({
      ownerType: 'USER',
      ownerId: user._id,
      adminCode: user.adminCode,
      type: 'CREDIT',
      reason: 'FUND_ADD',
      amount,
      balanceAfter: user.wallet.cashBalance,
      description: description || 'Fund added by admin',
      performedBy: req.admin._id
    });
    
    res.json({ 
      message: 'Funds added successfully', 
      userWallet: user.wallet,
      adminWallet: req.admin.role === 'ADMIN' ? req.admin.wallet : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deduct funds from user
router.post('/users/:id/deduct-funds', protectAdmin, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    
    const query = applyAdminFilter(req, { _id: req.params.id });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.wallet.cashBalance < amount) {
      return res.status(400).json({ message: 'Insufficient user balance' });
    }
    
    // Deduct from user wallet
    user.wallet.cashBalance -= amount;
    user.wallet.balance = user.wallet.cashBalance;
    await user.save();
    
    // For ADMIN role, add back to admin wallet
    if (req.admin.role === 'ADMIN') {
      req.admin.wallet.balance += amount;
      await req.admin.save();
      
      // Create admin ledger entry
      await WalletLedger.create({
        ownerType: 'ADMIN',
        ownerId: req.admin._id,
        adminCode: req.admin.adminCode,
        type: 'CREDIT',
        reason: 'FUND_WITHDRAW',
        amount,
        balanceAfter: req.admin.wallet.balance,
        description: `Fund deducted from user ${user.userId}`,
        performedBy: req.admin._id
      });
    }
    
    // Create user ledger entry
    await WalletLedger.create({
      ownerType: 'USER',
      ownerId: user._id,
      adminCode: user.adminCode,
      type: 'DEBIT',
      reason: 'FUND_WITHDRAW',
      amount,
      balanceAfter: user.wallet.cashBalance,
      description: description || 'Fund deducted by admin',
      performedBy: req.admin._id
    });
    
    res.json({ 
      message: 'Funds deducted successfully', 
      userWallet: user.wallet,
      adminWallet: req.admin.role === 'ADMIN' ? req.admin.wallet : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== BANK ACCOUNT ROUTES ====================

// Get bank accounts
router.get('/bank-accounts', protectAdmin, async (req, res) => {
  try {
    const query = req.admin.role === 'SUPER_ADMIN' ? {} : { adminCode: req.admin.adminCode };
    const accounts = await BankAccount.find(query).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add bank account
router.post('/bank-accounts', protectAdmin, async (req, res) => {
  try {
    if (req.admin.role === 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'Super Admin cannot add bank accounts' });
    }
    
    const { type, holderName, bankName, accountNumber, ifsc, accountType, upiId, qrCodeUrl } = req.body;
    
    const account = await BankAccount.create({
      adminCode: req.admin.adminCode,
      admin: req.admin._id,
      type,
      holderName,
      bankName,
      accountNumber,
      ifsc,
      accountType,
      upiId,
      qrCodeUrl
    });
    
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update bank account
router.put('/bank-accounts/:id', protectAdmin, async (req, res) => {
  try {
    const query = req.admin.role === 'SUPER_ADMIN' 
      ? { _id: req.params.id }
      : { _id: req.params.id, adminCode: req.admin.adminCode };
    
    const account = await BankAccount.findOne(query);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });
    
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'adminCode' && key !== 'admin') {
        account[key] = updates[key];
      }
    });
    
    await account.save();
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete bank account
router.delete('/bank-accounts/:id', protectAdmin, async (req, res) => {
  try {
    const query = req.admin.role === 'SUPER_ADMIN' 
      ? { _id: req.params.id }
      : { _id: req.params.id, adminCode: req.admin.adminCode };
    
    const account = await BankAccount.findOneAndDelete(query);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });
    
    res.json({ message: 'Bank account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== FUND REQUEST ROUTES ====================

// Get ALL fund requests (Super Admin only)
router.get('/all-fund-requests', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};
    if (status && status !== 'ALL') query.status = status;
    if (type) query.type = type;
    
    const requests = await FundRequest.find(query)
      .populate('user', 'username fullName email userId adminCode')
      .populate('processedBy', 'username adminCode')
      .populate('bankAccount', 'bankName accountNumber')
      .sort({ createdAt: -1 })
      .limit(500);
    
    // Add admin info from adminCode
    const requestsWithAdmin = await Promise.all(requests.map(async (req) => {
      const reqObj = req.toObject();
      if (req.adminCode) {
        const admin = await Admin.findOne({ adminCode: req.adminCode });
        reqObj.admin = admin ? { username: admin.username, adminCode: admin.adminCode } : null;
      }
      return reqObj;
    }));
    
    // Calculate stats
    const allRequests = await FundRequest.find({});
    const stats = {
      pending: allRequests.filter(r => r.status === 'PENDING').length,
      approved: allRequests.filter(r => r.status === 'APPROVED').length,
      rejected: allRequests.filter(r => r.status === 'REJECTED').length,
      totalDeposits: allRequests.filter(r => r.type === 'DEPOSIT' && r.status === 'APPROVED').reduce((sum, r) => sum + r.amount, 0),
      totalWithdrawals: allRequests.filter(r => r.type === 'WITHDRAWAL' && r.status === 'APPROVED').reduce((sum, r) => sum + r.amount, 0)
    };
    
    res.json({ requests: requestsWithAdmin, stats });
  } catch (error) {
    console.error('Error fetching all fund requests:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get fund requests (for specific admin)
router.get('/fund-requests', protectAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = applyAdminFilter(req);
    if (status) query.status = status;
    
    const requests = await FundRequest.find(query)
      .populate('user', 'username fullName email userId')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve fund request
router.post('/fund-requests/:id/approve', protectAdmin, async (req, res) => {
  try {
    const query = applyAdminFilter(req, { _id: req.params.id, status: 'PENDING' });
    const request = await FundRequest.findOne(query);
    
    if (!request) return res.status(404).json({ message: 'Fund request not found or already processed' });
    
    const user = await User.findById(request.user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (request.type === 'DEPOSIT') {
      // For deposits, admin wallet is debited, user wallet is credited
      if (req.admin.role === 'ADMIN') {
        if (req.admin.wallet.balance < request.amount) {
          return res.status(400).json({ message: 'Insufficient admin wallet balance' });
        }
        
        req.admin.wallet.balance -= request.amount;
        await req.admin.save();
        
        await WalletLedger.create({
          ownerType: 'ADMIN',
          ownerId: req.admin._id,
          adminCode: req.admin.adminCode,
          type: 'DEBIT',
          reason: 'FUND_ADD',
          amount: request.amount,
          balanceAfter: req.admin.wallet.balance,
          reference: { type: 'FundRequest', id: request._id },
          performedBy: req.admin._id
        });
      }
      
      user.wallet.cashBalance += request.amount;
      user.wallet.balance = user.wallet.cashBalance;
      await user.save();
      
      await WalletLedger.create({
        ownerType: 'USER',
        ownerId: user._id,
        adminCode: user.adminCode,
        type: 'CREDIT',
        reason: 'FUND_ADD',
        amount: request.amount,
        balanceAfter: user.wallet.cashBalance,
        reference: { type: 'FundRequest', id: request._id },
        performedBy: req.admin._id
      });
    } else {
      // For withdrawals, user wallet is debited
      if (user.wallet.cashBalance < request.amount) {
        return res.status(400).json({ message: 'Insufficient user balance' });
      }
      
      user.wallet.cashBalance -= request.amount;
      user.wallet.balance = user.wallet.cashBalance;
      await user.save();
      
      await WalletLedger.create({
        ownerType: 'USER',
        ownerId: user._id,
        adminCode: user.adminCode,
        type: 'DEBIT',
        reason: 'FUND_WITHDRAW',
        amount: request.amount,
        balanceAfter: user.wallet.cashBalance,
        reference: { type: 'FundRequest', id: request._id },
        performedBy: req.admin._id
      });
    }
    
    request.status = 'APPROVED';
    request.processedBy = req.admin._id;
    request.processedAt = new Date();
    request.adminRemarks = req.body.remarks || '';
    await request.save();
    
    res.json({ message: 'Fund request approved', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject fund request
router.post('/fund-requests/:id/reject', protectAdmin, async (req, res) => {
  try {
    const query = applyAdminFilter(req, { _id: req.params.id, status: 'PENDING' });
    const request = await FundRequest.findOne(query);
    
    if (!request) return res.status(404).json({ message: 'Fund request not found or already processed' });
    
    request.status = 'REJECTED';
    request.processedBy = req.admin._id;
    request.processedAt = new Date();
    request.adminRemarks = req.body.remarks || '';
    await request.save();
    
    res.json({ message: 'Fund request rejected', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== LEDGER ROUTES ====================

// Get wallet ledger
router.get('/ledger', protectAdmin, async (req, res) => {
  try {
    const { ownerType, ownerId, limit = 50 } = req.query;
    const query = applyAdminFilter(req);
    
    if (ownerType) query.ownerType = ownerType;
    if (ownerId) query.ownerId = ownerId;
    
    const ledger = await WalletLedger.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get admin's own ledger
router.get('/my-ledger', protectAdmin, async (req, res) => {
  try {
    const ledger = await WalletLedger.find({
      ownerType: 'ADMIN',
      ownerId: req.admin._id
    }).sort({ createdAt: -1 }).limit(100);
    
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PASSWORD & PROFILE ROUTES ====================

// Change own password
router.put('/change-password', protectAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    admin.password = newPassword;
    await admin.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update own profile
router.put('/update-profile', protectAdmin, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    
    if (email && email !== req.admin.email) {
      const exists = await Admin.findOne({ email, _id: { $ne: req.admin._id } });
      if (exists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      req.admin.email = email;
    }
    
    if (name) req.admin.name = name;
    if (phone) req.admin.phone = phone;
    
    await req.admin.save();
    res.json(req.admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SUPER ADMIN - ADMIN PASSWORD RESET ====================

// Reset admin password (Super Admin only)
router.put('/admins/:id/reset-password', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ message: 'Cannot reset Super Admin password here' });
    
    admin.password = newPassword;
    await admin.save();
    
    res.json({ message: 'Admin password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== SUPER ADMIN - DETAILED VIEWS ====================

// Get admin with all their users
router.get('/admins/:id/users', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    const users = await User.find({ adminCode: admin.adminCode }).select('-password');
    
    res.json({ admin, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get admin's ledger (Super Admin only)
router.get('/admins/:id/ledger', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    const ledger = await WalletLedger.find({
      ownerType: 'ADMIN',
      ownerId: admin._id
    }).sort({ createdAt: -1 }).limit(200);
    
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions across all admins (Super Admin only)
router.get('/all-transactions', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { limit = 100, ownerType } = req.query;
    const query = {};
    if (ownerType) query.ownerType = ownerType;
    
    const transactions = await WalletLedger.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('performedBy', 'username name');
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get comprehensive stats (Super Admin only)
router.get('/comprehensive-stats', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    // Admin stats
    const admins = await Admin.find({ role: 'ADMIN' }).select('-password');
    
    // Get user counts per admin
    const userCounts = await User.aggregate([
      { $group: { _id: '$adminCode', count: { $sum: 1 }, activeCount: { $sum: { $cond: ['$isActive', 1, 0] } } } }
    ]);
    
    const userCountMap = {};
    userCounts.forEach(uc => { userCountMap[uc._id] = uc; });
    
    // Enhance admin data with user counts
    const adminData = admins.map(admin => ({
      ...admin.toObject(),
      userCount: userCountMap[admin.adminCode]?.count || 0,
      activeUserCount: userCountMap[admin.adminCode]?.activeCount || 0
    }));
    
    // Total stats
    const totalAdmins = admins.length;
    const activeAdmins = admins.filter(a => a.status === 'ACTIVE').length;
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Wallet totals
    const adminWalletTotal = admins.reduce((sum, a) => sum + (a.wallet?.balance || 0), 0);
    const userWalletTotal = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$wallet.cashBalance' } } }
    ]);
    
    // Recent transactions
    const recentTransactions = await WalletLedger.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('performedBy', 'username name');
    
    res.json({
      admins: adminData,
      stats: {
        totalAdmins,
        activeAdmins,
        totalUsers,
        activeUsers,
        adminWalletTotal,
        userWalletTotal: userWalletTotal[0]?.total || 0
      },
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend/Activate admin (Super Admin only)
router.put('/admins/:id/status', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    if (admin.role === 'SUPER_ADMIN') return res.status(403).json({ message: 'Cannot modify Super Admin' });
    
    admin.status = status;
    admin.isActive = status === 'ACTIVE';
    await admin.save();
    
    res.json({ message: `Admin ${status.toLowerCase()}`, admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update admin charges (Super Admin only)
router.put('/admins/:id/charges', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    
    const { charges } = req.body;
    admin.charges = { ...admin.charges, ...charges };
    await admin.save();
    
    res.json({ message: 'Charges updated', admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
