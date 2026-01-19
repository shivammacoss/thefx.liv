/**
 * Admin Wallet & Fund Request Routes
 * Handles wallet operations and hierarchical fund requests
 * 
 * Fund Flow: Super Admin → Admin → Broker → Sub Broker → User
 * 
 * Routes:
 * - GET  /my-wallet              - Get own wallet details
 * - GET  /my-ledger              - Get own transaction ledger
 * - GET  /my-ledger/download     - Download ledger as CSV
 * - POST /fund-request           - Request funds from parent
 * - GET  /my-fund-requests       - Get own fund requests
 * - GET  /admin-fund-requests    - Get subordinate fund requests
 * - PUT  /admin-fund-requests/:id - Approve/reject fund request
 */

import express from 'express';
import Admin from '../../models/Admin.js';
import User from '../../models/User.js';
import WalletLedger from '../../models/WalletLedger.js';
import AdminFundRequest from '../../models/AdminFundRequest.js';
import { protectAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

// ============================================================================
// MY WALLET
// ============================================================================

/**
 * GET /my-wallet
 * Get own wallet details and user summary
 */
router.get('/my-wallet', protectAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    
    // Get user transaction summary
    const users = await User.find({ adminCode: admin.adminCode });
    
    let totalUserDeposits = 0;
    let totalUserWithdrawals = 0;
    let totalUserProfits = 0;
    let totalUserLosses = 0;
    let totalUserBalance = 0;
    
    users.forEach(user => {
      totalUserBalance += user.wallet?.cashBalance || 0;
      totalUserDeposits += user.wallet?.totalDeposited || 0;
      totalUserWithdrawals += user.wallet?.totalWithdrawn || 0;
      totalUserProfits += user.tradingStats?.totalProfit || 0;
      totalUserLosses += user.tradingStats?.totalLoss || 0;
    });
    
    // Get recent ledger entries
    const ledger = await WalletLedger.find({ ownerId: admin._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      wallet: admin.wallet,
      summary: {
        totalUsers: users.length,
        totalUserDeposits,
        totalUserWithdrawals,
        totalUserProfits,
        totalUserLosses,
        totalUserBalance,
        distributedToUsers: totalUserDeposits - totalUserWithdrawals
      },
      ledger
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// LEDGER
// ============================================================================

/**
 * GET /my-ledger
 * Get own transaction ledger
 */
router.get('/my-ledger', protectAdmin, async (req, res) => {
  try {
    const ledger = await WalletLedger.find({ ownerId: req.admin._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /my-ledger/download
 * Download ledger as CSV
 */
router.get('/my-ledger/download', protectAdmin, async (req, res) => {
  try {
    const ledger = await WalletLedger.find({ ownerId: req.admin._id })
      .sort({ createdAt: -1 });
    
    const csv = [
      'Date,Type,Reason,Amount,Balance After,Description',
      ...ledger.map(e => 
        `${new Date(e.createdAt).toLocaleString()},${e.type},${e.reason},${e.amount},${e.balanceAfter},"${e.description || ''}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ledger.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// FUND REQUESTS - CREATE & VIEW OWN
// ============================================================================

/**
 * POST /fund-request
 * Request funds from parent in hierarchy
 * - ADMIN requests from SUPER_ADMIN
 * - BROKER requests from ADMIN (their parent)
 * - SUB_BROKER requests from BROKER (their parent)
 */
router.post('/fund-request', protectAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Super Admin cannot request funds
    if (req.admin.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Super Admin cannot request funds' });
    }
    
    // Find parent to request from
    let targetAdmin = null;
    if (req.admin.parentId) {
      targetAdmin = await Admin.findById(req.admin.parentId);
    }
    
    // Fallback to Super Admin
    if (!targetAdmin) {
      targetAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });
    }
    
    if (!targetAdmin) {
      return res.status(400).json({ message: 'No parent admin found' });
    }
    
    const fundRequest = await AdminFundRequest.create({
      admin: req.admin._id,
      adminCode: req.admin.adminCode,
      requestorRole: req.admin.role,
      targetAdmin: targetAdmin._id,
      targetAdminCode: targetAdmin.adminCode,
      targetRole: targetAdmin.role,
      amount,
      reason: reason || ''
    });
    
    const targetName = targetAdmin.role === 'SUPER_ADMIN' 
      ? 'Super Admin' 
      : targetAdmin.name || targetAdmin.username;
    
    res.status(201).json({ 
      message: `Fund request submitted to ${targetName}`, 
      fundRequest 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /my-fund-requests
 * Get own fund request history
 */
router.get('/my-fund-requests', protectAdmin, async (req, res) => {
  try {
    const requests = await AdminFundRequest.find({ admin: req.admin._id })
      .populate('targetAdmin', 'name username role')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// FUND REQUESTS - VIEW & PROCESS SUBORDINATE REQUESTS
// ============================================================================

/**
 * GET /admin-fund-requests
 * Get fund requests from subordinates
 * - SUPER_ADMIN: sees all requests
 * - ADMIN: sees BROKER/SUB_BROKER requests targeted to them
 * - BROKER: sees SUB_BROKER requests targeted to them
 */
router.get('/admin-fund-requests', protectAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (req.admin.role === 'SUPER_ADMIN') {
      query = status ? { status } : {};
    } else if (req.admin.role === 'SUB_BROKER') {
      return res.json([]); // Sub Broker has no subordinates
    } else {
      query = { targetAdmin: req.admin._id };
      if (status) query.status = status;
    }
    
    const requests = await AdminFundRequest.find(query)
      .populate('admin', 'name username email adminCode wallet role')
      .populate('targetAdmin', 'name username adminCode role')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /admin-fund-requests/:id
 * Approve or reject fund request
 * - Deducts from approver's wallet (except Super Admin)
 * - Credits to requestor's wallet
 */
router.put('/admin-fund-requests/:id', protectAdmin, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Sub Broker cannot approve
    if (req.admin.role === 'SUB_BROKER') {
      return res.status(403).json({ message: 'Sub Broker cannot approve fund requests' });
    }
    
    const fundRequest = await AdminFundRequest.findById(req.params.id);
    if (!fundRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (fundRequest.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request already processed' });
    }
    
    // Check permission
    if (req.admin.role !== 'SUPER_ADMIN' && 
        fundRequest.targetAdmin.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: 'You can only approve requests directed to you' });
    }
    
    // Check balance for approval (except Super Admin)
    if (status === 'APPROVED' && req.admin.role !== 'SUPER_ADMIN') {
      if (req.admin.wallet.balance < fundRequest.amount) {
        return res.status(400).json({ 
          message: `Insufficient balance. You have ₹${req.admin.wallet.balance.toLocaleString()}` 
        });
      }
    }
    
    // Update request status
    fundRequest.status = status;
    fundRequest.processedBy = req.admin._id;
    fundRequest.processedAt = new Date();
    fundRequest.adminRemarks = remarks || '';
    await fundRequest.save();
    
    // Process wallet transfer if approved
    if (status === 'APPROVED') {
      const requestor = await Admin.findById(fundRequest.admin);
      
      if (requestor) {
        // Credit requestor
        requestor.wallet.balance += fundRequest.amount;
        requestor.wallet.totalDeposited += fundRequest.amount;
        await requestor.save();
        
        await WalletLedger.create({
          ownerType: 'ADMIN',
          ownerId: requestor._id,
          adminCode: requestor.adminCode,
          type: 'CREDIT',
          reason: 'ADMIN_DEPOSIT',
          amount: fundRequest.amount,
          balanceAfter: requestor.wallet.balance,
          description: `Fund request ${fundRequest.requestId} approved`,
          performedBy: req.admin._id
        });
        
        // Debit approver (except Super Admin)
        if (req.admin.role !== 'SUPER_ADMIN') {
          req.admin.wallet.balance -= fundRequest.amount;
          req.admin.wallet.totalWithdrawn = (req.admin.wallet.totalWithdrawn || 0) + fundRequest.amount;
          await req.admin.save();
          
          await WalletLedger.create({
            ownerType: 'ADMIN',
            ownerId: req.admin._id,
            adminCode: req.admin.adminCode,
            type: 'DEBIT',
            reason: 'ADMIN_TRANSFER',
            amount: fundRequest.amount,
            balanceAfter: req.admin.wallet.balance,
            description: `Transferred to ${requestor.role} - ${requestor.name || requestor.username}`,
            performedBy: req.admin._id
          });
        }
      }
    }
    
    res.json({ message: `Request ${status.toLowerCase()}`, fundRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// DIRECT FUND TRANSFER TO SUBORDINATE
// ============================================================================

/**
 * PUT /admins/:adminId/fund
 * Directly add/deduct funds to subordinate wallet
 */
router.put('/admins/:adminId/fund', protectAdmin, async (req, res) => {
  try {
    const { amount, type, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    if (!['ADD', 'DEDUCT'].includes(type)) {
      return res.status(400).json({ message: 'Type must be ADD or DEDUCT' });
    }
    
    const targetAdmin = await Admin.findById(req.params.adminId);
    if (!targetAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Check for deduction - target must have sufficient balance
    if (type === 'DEDUCT' && targetAdmin.wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance in target wallet' });
    }
    
    // Check approver balance for ADD (except Super Admin)
    if (type === 'ADD' && req.admin.role !== 'SUPER_ADMIN') {
      if (req.admin.wallet.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance in your wallet' });
      }
    }
    
    // Process transfer
    if (type === 'ADD') {
      targetAdmin.wallet.balance += amount;
      targetAdmin.wallet.totalDeposited += amount;
      
      // Debit from approver (except Super Admin)
      if (req.admin.role !== 'SUPER_ADMIN') {
        req.admin.wallet.balance -= amount;
        req.admin.wallet.totalWithdrawn += amount;
        await req.admin.save();
        
        await WalletLedger.create({
          ownerType: 'ADMIN',
          ownerId: req.admin._id,
          adminCode: req.admin.adminCode,
          type: 'DEBIT',
          reason: 'ADMIN_TRANSFER',
          amount,
          balanceAfter: req.admin.wallet.balance,
          description: `Transferred to ${targetAdmin.name || targetAdmin.username}`,
          performedBy: req.admin._id
        });
      }
    } else {
      targetAdmin.wallet.balance -= amount;
      targetAdmin.wallet.totalWithdrawn += amount;
      
      // Credit back to approver (except Super Admin)
      if (req.admin.role !== 'SUPER_ADMIN') {
        req.admin.wallet.balance += amount;
        req.admin.wallet.totalDeposited += amount;
        await req.admin.save();
      }
    }
    
    await targetAdmin.save();
    
    // Log transaction
    await WalletLedger.create({
      ownerType: 'ADMIN',
      ownerId: targetAdmin._id,
      adminCode: targetAdmin.adminCode,
      type: type === 'ADD' ? 'CREDIT' : 'DEBIT',
      reason: type === 'ADD' ? 'ADMIN_DEPOSIT' : 'ADMIN_WITHDRAWAL',
      amount,
      balanceAfter: targetAdmin.wallet.balance,
      description: reason || `${type} by ${req.admin.name || req.admin.username}`,
      performedBy: req.admin._id
    });
    
    res.json({ 
      message: `₹${amount} ${type === 'ADD' ? 'added to' : 'deducted from'} wallet`,
      newBalance: targetAdmin.wallet.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
