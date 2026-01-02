import mongoose from 'mongoose';

const walletLedgerSchema = new mongoose.Schema({
  // Owner type and ID
  ownerType: {
    type: String,
    enum: ['ADMIN', 'USER'],
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'ownerType'
  },
  
  // Admin code (for filtering)
  adminCode: {
    type: String,
    index: true
  },
  
  // Transaction type
  type: {
    type: String,
    enum: ['CREDIT', 'DEBIT'],
    required: true
  },
  
  // Reason for transaction
  reason: {
    type: String,
    enum: [
      'FUND_ADD',           // Admin adds fund to user
      'FUND_WITHDRAW',      // User withdraws fund
      'TRADE_PNL',          // Trading profit/loss
      'BROKERAGE',          // Brokerage charges
      'PROFIT_SHARE',       // Profit share to admin
      'ADMIN_DEPOSIT',      // Super admin deposits to admin
      'ADMIN_WITHDRAW',     // Admin withdraws
      'REFUND',             // Refund
      'ADJUSTMENT',         // Manual adjustment
      'BONUS',              // Bonus credit
      'PENALTY'             // Penalty debit
    ],
    required: true
  },
  
  // Amount
  amount: {
    type: Number,
    required: true
  },
  
  // Balance after transaction
  balanceAfter: {
    type: Number,
    required: true
  },
  
  // Reference to related document
  reference: {
    type: {
      type: String,
      enum: ['FundRequest', 'Trade', 'Position', 'Order', 'Manual'],
      default: 'Manual'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  
  // Description
  description: {
    type: String,
    default: ''
  },
  
  // Performed by (admin who made the transaction)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, { timestamps: true });

// Index for faster queries
walletLedgerSchema.index({ ownerType: 1, ownerId: 1, createdAt: -1 });
walletLedgerSchema.index({ adminCode: 1, createdAt: -1 });
walletLedgerSchema.index({ reason: 1, createdAt: -1 });

export default mongoose.model('WalletLedger', walletLedgerSchema);
