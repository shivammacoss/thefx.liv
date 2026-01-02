import mongoose from 'mongoose';

const chargesSchema = new mongoose.Schema({
  // Scope determines priority: GLOBAL < ADMIN < SEGMENT < INSTRUMENT < USER
  scope: {
    type: String,
    enum: ['GLOBAL', 'ADMIN', 'SEGMENT', 'INSTRUMENT', 'USER'],
    required: true
  },
  
  // For ADMIN, SEGMENT, INSTRUMENT, USER scopes
  adminCode: {
    type: String,
    default: null
  },
  
  // For USER scope
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // For SEGMENT and INSTRUMENT scopes
  segment: {
    type: String,
    enum: ['EQUITY', 'FNO', null],
    default: null
  },
  instrumentType: {
    type: String,
    enum: ['STOCK', 'FUTURES', 'OPTIONS', null],
    default: null
  },
  
  // Charge configuration
  brokerage: {
    type: {
      type: String,
      enum: ['PER_LOT', 'PERCENTAGE', 'FLAT'],
      default: 'PER_LOT'
    },
    value: {
      type: Number,
      default: 20
    }
  },
  
  // Exchange transaction charges (percentage)
  exchangeCharges: {
    type: Number,
    default: 0.00325 // 0.00325%
  },
  
  // GST on brokerage (percentage)
  gst: {
    type: Number,
    default: 18 // 18%
  },
  
  // SEBI charges (per crore)
  sebiCharges: {
    type: Number,
    default: 10 // ₹10 per crore
  },
  
  // Stamp duty (percentage)
  stampDuty: {
    type: Number,
    default: 0.015 // 0.015%
  },
  
  // STT (Securities Transaction Tax)
  stt: {
    equity: {
      delivery: { type: Number, default: 0.1 }, // 0.1% on both buy and sell
      intraday: { type: Number, default: 0.025 } // 0.025% on sell
    },
    futures: { type: Number, default: 0.0125 }, // 0.0125% on sell
    options: { type: Number, default: 0.0625 } // 0.0625% on premium (sell)
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Static method: Get charges for a trade (hierarchical resolution)
chargesSchema.statics.getChargesForTrade = async function(trade, adminCode, userId) {
  // Priority order: USER > INSTRUMENT > SEGMENT > ADMIN > GLOBAL
  
  // 1. Check user-specific charges
  let charges = await this.findOne({ 
    scope: 'USER', 
    userId: userId,
    isActive: true 
  });
  if (charges) return charges;
  
  // 2. Check instrument-specific charges
  charges = await this.findOne({ 
    scope: 'INSTRUMENT',
    adminCode: adminCode,
    segment: trade.segment,
    instrumentType: trade.instrumentType,
    isActive: true 
  });
  if (charges) return charges;
  
  // 3. Check segment-specific charges
  charges = await this.findOne({ 
    scope: 'SEGMENT',
    adminCode: adminCode,
    segment: trade.segment,
    isActive: true 
  });
  if (charges) return charges;
  
  // 4. Check admin default charges
  charges = await this.findOne({ 
    scope: 'ADMIN',
    adminCode: adminCode,
    isActive: true 
  });
  if (charges) return charges;
  
  // 5. Fall back to global charges
  charges = await this.findOne({ 
    scope: 'GLOBAL',
    isActive: true 
  });
  
  // If no charges found, return default
  if (!charges) {
    charges = {
      brokerage: { type: 'PER_LOT', value: 20 },
      exchangeCharges: 0.00325,
      gst: 18,
      sebiCharges: 10,
      stampDuty: 0.015,
      stt: {
        equity: { delivery: 0.1, intraday: 0.025 },
        futures: 0.0125,
        options: 0.0625
      }
    };
  }
  
  return charges;
};

// Static method: Calculate charges for a trade
chargesSchema.statics.calculateCharges = async function(trade, adminCode, userId) {
  const chargesConfig = await this.getChargesForTrade(trade, adminCode, userId);
  
  const turnover = trade.entryPrice * trade.quantity * trade.lotSize;
  const exitTurnover = (trade.exitPrice || trade.entryPrice) * trade.quantity * trade.lotSize;
  const totalTurnover = turnover + exitTurnover;
  
  // Calculate brokerage
  let brokerage = 0;
  if (chargesConfig.brokerage.type === 'PER_LOT') {
    brokerage = chargesConfig.brokerage.value * trade.lots * 2; // Entry + Exit
  } else if (chargesConfig.brokerage.type === 'PERCENTAGE') {
    brokerage = (totalTurnover * chargesConfig.brokerage.value) / 100;
  } else {
    brokerage = chargesConfig.brokerage.value * 2; // Flat per trade
  }
  
  // Exchange charges
  const exchangeCharges = (totalTurnover * chargesConfig.exchangeCharges) / 100;
  
  // GST on brokerage + exchange charges
  const gst = ((brokerage + exchangeCharges) * chargesConfig.gst) / 100;
  
  // SEBI charges
  const sebiCharges = (totalTurnover / 10000000) * chargesConfig.sebiCharges;
  
  // Stamp duty (on buy side only)
  const stampDuty = (turnover * chargesConfig.stampDuty) / 100;
  
  // STT calculation based on instrument type
  let stt = 0;
  if (trade.segment === 'EQUITY') {
    if (trade.productType === 'CNC') {
      stt = (totalTurnover * chargesConfig.stt.equity.delivery) / 100;
    } else {
      stt = (exitTurnover * chargesConfig.stt.equity.intraday) / 100;
    }
  } else if (trade.instrumentType === 'FUTURES') {
    stt = (exitTurnover * chargesConfig.stt.futures) / 100;
  } else if (trade.instrumentType === 'OPTIONS') {
    // STT on premium for options
    const premium = trade.entryPrice * trade.quantity * trade.lotSize;
    stt = (premium * chargesConfig.stt.options) / 100;
  }
  
  const total = brokerage + exchangeCharges + gst + sebiCharges + stampDuty + stt;
  
  return {
    brokerage: Math.round(brokerage * 100) / 100,
    exchange: Math.round(exchangeCharges * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    sebi: Math.round(sebiCharges * 100) / 100,
    stamp: Math.round(stampDuty * 100) / 100,
    stt: Math.round(stt * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// Index for faster lookups
chargesSchema.index({ scope: 1, adminCode: 1, segment: 1, instrumentType: 1 });
chargesSchema.index({ scope: 1, userId: 1 });

export default mongoose.model('Charges', chargesSchema);
