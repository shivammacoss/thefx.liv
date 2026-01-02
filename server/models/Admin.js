import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const generateLoginId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF${code}`;
};

// Generate unique admin code
const generateAdminCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ADM';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const adminSchema = new mongoose.Schema({
  // Role: SUPER_ADMIN or ADMIN
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN'],
    default: 'ADMIN'
  },
  
  // Unique admin code (auto-generated for ADMIN role)
  adminCode: {
    type: String,
    unique: true,
    sparse: true // Allows null for SUPER_ADMIN
  },
  
  // Basic Info
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Numeric login ID / code (4-6 digits)
  loginId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: ''
  },
  // Legacy password field (deprecated)
  password: {
    type: String
  },
  // Secure PIN for login (4 digits)
  pin: {
    type: String,
    required: false // Made optional to allow charge settings updates
  },
  
  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'ACTIVE'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin Charges (for ADMIN role)
  charges: {
    brokerage: {
      type: Number,
      default: 20 // Per lot/trade
    },
    intradayLeverage: {
      type: Number,
      default: 5
    },
    deliveryLeverage: {
      type: Number,
      default: 1
    },
    optionBuyLeverage: {
      type: Number,
      default: 1
    },
    optionSellLeverage: {
      type: Number,
      default: 1
    },
    futuresLeverage: {
      type: Number,
      default: 1
    },
    withdrawalFee: {
      type: Number,
      default: 0
    },
    profitShare: {
      type: Number,
      default: 0 // Percentage
    },
    minWithdrawal: {
      type: Number,
      default: 100
    },
    maxWithdrawal: {
      type: Number,
      default: 100000
    }
  },
  
  // Lot Management Settings
  lotSettings: {
    // NIFTY
    niftyMaxLotIntraday: { type: Number, default: 100 },
    niftyMaxLotCarryForward: { type: Number, default: 50 },
    niftyLotSize: { type: Number, default: 25 },
    // BANKNIFTY
    bankniftyMaxLotIntraday: { type: Number, default: 100 },
    bankniftyMaxLotCarryForward: { type: Number, default: 50 },
    bankniftyLotSize: { type: Number, default: 15 },
    // FINNIFTY
    finniftyMaxLotIntraday: { type: Number, default: 100 },
    finniftyMaxLotCarryForward: { type: Number, default: 50 },
    finniftyLotSize: { type: Number, default: 25 },
    // MIDCPNIFTY
    midcpniftyMaxLotIntraday: { type: Number, default: 100 },
    midcpniftyMaxLotCarryForward: { type: Number, default: 50 },
    midcpniftyLotSize: { type: Number, default: 50 },
    // EQUITY
    equityMaxQtyIntraday: { type: Number, default: 10000 },
    equityMaxQtyDelivery: { type: Number, default: 5000 },
    // Global
    maxOpenPositions: { type: Number, default: 20 },
    maxDailyTrades: { type: Number, default: 100 }
  },
  
  // Leverage Settings - Admin can activate specific leverage options for users
  leverageSettings: {
    enabledLeverages: { type: [Number], default: [1, 2, 5, 10] }, // Available leverage options
    maxLeverage: { type: Number, default: 10 }, // Maximum leverage allowed
    leverageOptions: {
      type: Map,
      of: Boolean,
      default: {
        '1': true,    // 1x (no leverage)
        '2': true,    // 2x
        '5': true,    // 5x
        '10': true,   // 10x
        '20': false,  // 20x
        '50': false,  // 50x
        '100': false, // 100x
        '200': false, // 200x
        '500': false, // 500x
        '800': false, // 800x
        '1000': false,// 1000x
        '1500': false,// 1500x
        '2000': false // 2000x
      }
    }
  },
  
  // Trading Settings
  tradingSettings: {
    allowTradingOutsideMarketHours: { type: Boolean, default: false },
    autoSquareOffTime: { type: String, default: '15:15' }, // IST time for auto square off
    marginCallPercentage: { type: Number, default: 80 }, // % of margin used triggers warning
    autoClosePercentage: { type: Number, default: 100 }, // % of margin used triggers auto close
    minTradeValue: { type: Number, default: 100 },
    maxTradeValue: { type: Number, default: 10000000 }
  },
  
  // Charge Settings - Spread and Commission
  chargeSettings: {
    spread: { type: Number, default: 0 }, // Points added to buy, subtracted from sell
    commission: { type: Number, default: 0 }, // ₹ per lot
    commissionType: { type: String, enum: ['PER_LOT', 'PER_TRADE', 'PER_CRORE'], default: 'PER_LOT' },
    perTradeCharge: { type: Number, default: 0 }, // Fixed charge per trade
    perCroreCharge: { type: Number, default: 0 }, // Charge per crore turnover
    perLotCharge: { type: Number, default: 0 } // Charge per lot
  },
  
  // Admin Wallet
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    blocked: {
      type: Number,
      default: 0
    },
    totalDeposited: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    totalProfitShare: {
      type: Number,
      default: 0
    }
  },
  
  // Statistics
  stats: {
    totalUsers: {
      type: Number,
      default: 0
    },
    activeUsers: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    totalBrokerage: {
      type: Number,
      default: 0
    },
    totalPnL: {
      type: Number,
      default: 0
    }
  },
  
  // Credit Mode: INFINITE = virtual credit, LIMITED = actual balance
  creditMode: {
    type: String,
    enum: ['INFINITE', 'LIMITED'],
    default: 'LIMITED'
  },
  
  // Book Type: A_BOOK = exchange, B_BOOK = admin takes opposite
  bookType: {
    type: String,
    enum: ['A_BOOK', 'B_BOOK'],
    default: 'B_BOOK'
  },
  
  // Admin P&L from trades (B_BOOK)
  tradingPnL: {
    realized: {
      type: Number,
      default: 0
    },
    unrealized: {
      type: Number,
      default: 0
    },
    todayRealized: {
      type: Number,
      default: 0
    }
  },
  
  // Created by (for ADMIN, reference to SUPER_ADMIN)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referralUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Pre-save: Hash password and generate admin code
adminSchema.pre('save', async function(next) {
  // Hash PIN if modified
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 12);
  }
  // Hash legacy passwords if still used
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Generate admin code for new admins (all roles)
  if (this.isNew && !this.adminCode) {
    let code = generateAdminCode();
    let exists = await mongoose.model('Admin').findOne({ adminCode: code });
    while (exists) {
      code = generateAdminCode();
      exists = await mongoose.model('Admin').findOne({ adminCode: code });
    }
    this.adminCode = code;
  }

  // Generate loginId if missing
  if (this.isNew && !this.loginId) {
    let loginId = generateLoginId();
    let exists = await mongoose.model('Admin').findOne({ loginId });
    while (exists) {
      loginId = generateLoginId();
      exists = await mongoose.model('Admin').findOne({ loginId });
    }
    this.loginId = loginId;
  }

  // Generate referral code if missing
  if (this.isNew && !this.referralCode) {
    let ref = generateReferralCode();
    let exists = await mongoose.model('Admin').findOne({ referralCode: ref });
    while (exists) {
      ref = generateReferralCode();
      exists = await mongoose.model('Admin').findOne({ referralCode: ref });
    }
    this.referralCode = ref;
  }

  // Always refresh referral URL
  if (this.referralCode) {
    const base = (process.env.APP_BASE_URL || process.env.FRONTEND_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    this.referralUrl = `${base}/login?ref=${this.referralCode}`;
  }
  
  next();
});

// Compare pin
adminSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Compare password (legacy password-based login)
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if super admin
adminSchema.methods.isSuperAdmin = function() {
  return this.role === 'SUPER_ADMIN';
};

// Get available balance
adminSchema.methods.getAvailableBalance = function() {
  return this.wallet.balance - this.wallet.blocked;
};

// Index for faster queries
adminSchema.index({ adminCode: 1 });
adminSchema.index({ role: 1, status: 1 });

export default mongoose.model('Admin', adminSchema);
