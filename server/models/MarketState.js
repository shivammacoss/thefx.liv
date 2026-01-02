import mongoose from 'mongoose';

const marketStateSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'GLOBAL_MARKET'
  },
  
  // Global market status
  isMarketOpen: {
    type: Boolean,
    default: false
  },
  
  // Segment-wise status
  segments: {
    EQUITY: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:15' },
      closeTime: { type: String, default: '15:30' },
      intradaySquareOffTime: { type: String, default: '15:15' }
    },
    FNO: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:15' },
      closeTime: { type: String, default: '15:30' },
      intradaySquareOffTime: { type: String, default: '15:25' }
    }
  },
  
  // Trading holidays
  holidays: [{
    date: Date,
    description: String
  }],
  
  // Manual override by Super Admin
  manualOverride: {
    type: Boolean,
    default: false
  },
  
  // Message to show when market is closed
  closedMessage: {
    type: String,
    default: 'Market is closed. Trading disabled.'
  },
  
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

// Static method to get market state
marketStateSchema.statics.getState = async function() {
  let state = await this.findById('GLOBAL_MARKET');
  if (!state) {
    state = await this.create({ _id: 'GLOBAL_MARKET' });
  }
  return state;
};

// Static method to check if trading is allowed
marketStateSchema.statics.isTradingAllowed = async function(segment = 'EQUITY') {
  const state = await this.getState();
  
  // If manual override is on, use global status
  if (state.manualOverride) {
    return state.isMarketOpen;
  }
  
  // Check segment-specific status
  const segmentState = state.segments[segment];
  if (!segmentState) return state.isMarketOpen;
  
  return segmentState.isOpen && state.isMarketOpen;
};

// Method to update market status
marketStateSchema.statics.setMarketStatus = async function(isOpen, adminId) {
  const state = await this.getState();
  state.isMarketOpen = isOpen;
  state.manualOverride = true;
  state.lastUpdatedAt = new Date();
  state.updatedBy = adminId;
  await state.save();
  return state;
};

export default mongoose.model('MarketState', marketStateSchema);
