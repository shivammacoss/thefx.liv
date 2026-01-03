import Trade from '../models/Trade.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import MarketState from '../models/MarketState.js';
import Charges from '../models/Charges.js';
import WalletLedger from '../models/WalletLedger.js';

class TradeService {
  
  // Check if market is open for trading
  static async checkMarketOpen(segment = 'EQUITY') {
    const isOpen = await MarketState.isTradingAllowed(segment);
    if (!isOpen) {
      throw new Error('Market is closed. Trading disabled.');
    }
    return true;
  }
  
  // Calculate required margin for a trade
  static calculateMargin(price, quantity, lotSize, leverage, productType) {
    const notionalValue = price * quantity * lotSize;
    
    if (productType === 'CNC') {
      return notionalValue; // Full amount for delivery
    }
    
    return notionalValue / leverage;
  }
  
  // Validate if user has sufficient margin
  static async validateMargin(userId, requiredMargin) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    const availableMargin = user.wallet.cashBalance - user.wallet.usedMargin + user.wallet.collateralValue;
    
    if (availableMargin < requiredMargin) {
      throw new Error(`Insufficient margin. Required: ₹${requiredMargin.toFixed(2)}, Available: ₹${availableMargin.toFixed(2)}`);
    }
    
    return { user, availableMargin };
  }
  
  // Open a new trade
  static async openTrade(tradeData, userId) {
    // 1. Check market status (CRYPTO is always open)
    await this.checkMarketOpen(tradeData.segment);
    
    // 2. Get user and admin
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    const admin = await Admin.findOne({ adminCode: user.adminCode });
    if (!admin) throw new Error('Admin not found');
    
    // 3. Get leverage from admin charges
    let leverage = 1;
    const isCrypto = tradeData.segment === 'CRYPTO' || tradeData.isCrypto;
    
    if (tradeData.productType === 'MIS') {
      if (tradeData.segment === 'EQUITY') {
        leverage = admin.charges?.intradayLeverage || 5;
      } else if (tradeData.instrumentType === 'FUTURES') {
        leverage = admin.charges?.futuresLeverage || 1;
      } else if (tradeData.instrumentType === 'OPTIONS') {
        leverage = tradeData.side === 'BUY' 
          ? admin.charges?.optionBuyLeverage || 1
          : admin.charges?.optionSellLeverage || 1;
      } else if (isCrypto) {
        // Crypto leverage (default 1x for spot, can be configured)
        leverage = admin.charges?.cryptoLeverage || 1;
      }
    }
    
    // 4. Calculate required margin
    const lotSize = tradeData.lotSize || 1;
    const lots = tradeData.lots || Math.ceil(tradeData.quantity / lotSize);
    
    // For crypto, price is in USD - convert to INR for margin calculation
    let entryPrice = tradeData.entryPrice;
    const usdToInr = 83; // Approximate USD to INR rate
    
    if (isCrypto) {
      // Crypto prices are in USD, convert to INR for margin
      entryPrice = tradeData.entryPrice * usdToInr;
    }
    
    const requiredMargin = this.calculateMargin(
      entryPrice,
      tradeData.quantity,
      lotSize,
      leverage,
      tradeData.productType
    );
    
    // 5. Validate margin
    await this.validateMargin(userId, requiredMargin);
    
    // 6. Block margin - use updateOne to avoid validation issues
    await User.updateOne(
      { _id: userId },
      { $inc: { 'wallet.usedMargin': requiredMargin } }
    );
    
    // 7. Create trade
    const trade = await Trade.create({
      user: userId,
      userId: user.userId,
      adminCode: user.adminCode,
      segment: tradeData.segment,
      instrumentType: tradeData.instrumentType,
      symbol: tradeData.symbol,
      token: tradeData.token,
      pair: tradeData.pair, // For crypto
      isCrypto: isCrypto,
      exchange: tradeData.exchange || (isCrypto ? 'BINANCE' : 'NSE'),
      expiry: tradeData.expiry,
      strike: tradeData.strike,
      optionType: tradeData.optionType,
      side: tradeData.side,
      productType: tradeData.productType || (isCrypto ? 'MIS' : 'MIS'),
      quantity: tradeData.quantity,
      lotSize,
      lots,
      entryPrice: tradeData.entryPrice, // Store original price (USD for crypto)
      currentPrice: tradeData.entryPrice,
      marginUsed: requiredMargin,
      leverage,
      status: 'OPEN',
      bookType: admin.bookType || 'B_BOOK'
    });
    
    return trade;
  }
  
  // Close a trade
  static async closeTrade(tradeId, exitPrice, reason = 'MANUAL') {
    const trade = await Trade.findById(tradeId);
    if (!trade) throw new Error('Trade not found');
    if (trade.status !== 'OPEN') throw new Error('Trade is not open');
    
    // Get user and admin
    const user = await User.findById(trade.user);
    const admin = await Admin.findOne({ adminCode: trade.adminCode });
    
    // Calculate charges
    trade.exitPrice = exitPrice;
    const charges = await Charges.calculateCharges(trade, trade.adminCode, trade.user);
    trade.charges = charges;
    
    // Close trade and calculate P&L
    trade.closeTrade(exitPrice, reason);
    
    // Release margin and book P&L - use updateOne to avoid validation issues
    await User.updateOne(
      { _id: user._id },
      { $inc: { 
        'wallet.usedMargin': -trade.marginUsed,
        'wallet.cashBalance': trade.netPnL,
        'wallet.realizedPnL': trade.netPnL,
        'wallet.todayRealizedPnL': trade.netPnL
      }}
    );
    
    await trade.save();
    
    // Create ledger entry for user
    await WalletLedger.create({
      ownerType: 'USER',
      ownerId: user._id,
      adminCode: user.adminCode,
      type: trade.netPnL >= 0 ? 'CREDIT' : 'DEBIT',
      reason: 'TRADE_PNL',
      amount: Math.abs(trade.netPnL),
      balanceAfter: user.wallet.cashBalance,
      reference: { type: 'Trade', id: trade._id },
      description: `${trade.symbol} ${trade.side} P&L`
    });
    
    // Update admin P&L (B_BOOK)
    if (trade.bookType === 'B_BOOK' && admin) {
      admin.tradingPnL.realized += trade.adminPnL;
      admin.tradingPnL.todayRealized += trade.adminPnL;
      admin.stats.totalPnL += trade.adminPnL;
      
      // Add brokerage to admin wallet
      admin.wallet.balance += charges.brokerage;
      admin.stats.totalBrokerage += charges.brokerage;
      
      await admin.save();
      
      // Create ledger entry for admin brokerage
      await WalletLedger.create({
        ownerType: 'ADMIN',
        ownerId: admin._id,
        adminCode: admin.adminCode,
        type: 'CREDIT',
        reason: 'BROKERAGE',
        amount: charges.brokerage,
        balanceAfter: admin.wallet.balance,
        reference: { type: 'Trade', id: trade._id },
        description: `Brokerage from ${trade.tradeId}`
      });
    }
    
    return trade;
  }
  
  // Update live P&L for all open trades
  static async updateLivePnL(priceUpdates) {
    // priceUpdates = { 'SYMBOL': price, ... }
    const openTrades = await Trade.find({ status: 'OPEN' });
    
    for (const trade of openTrades) {
      const currentPrice = priceUpdates[trade.symbol];
      if (currentPrice) {
        trade.calculateUnrealizedPnL(currentPrice);
        await trade.save();
      }
    }
    
    // Update user unrealized P&L
    const userPnL = {};
    for (const trade of openTrades) {
      if (!userPnL[trade.user]) userPnL[trade.user] = 0;
      userPnL[trade.user] += trade.unrealizedPnL;
    }
    
    for (const [userId, pnl] of Object.entries(userPnL)) {
      await User.findByIdAndUpdate(userId, {
        'wallet.unrealizedPnL': pnl,
        'wallet.todayUnrealizedPnL': pnl
      });
    }
    
    return openTrades;
  }
  
  // RMS Check - Auto square-off if wallet goes negative
  static async runRMSCheck() {
    const users = await User.find({ isActive: true });
    const squaredOffTrades = [];
    
    for (const user of users) {
      const effectiveBalance = user.wallet.cashBalance + user.wallet.unrealizedPnL;
      
      if (effectiveBalance <= 0) {
        // Get open trades sorted by P&L (most loss first)
        const openTrades = await Trade.find({ 
          user: user._id, 
          status: 'OPEN' 
        }).sort({ unrealizedPnL: 1 });
        
        // Close trades one by one until balance is positive
        for (const trade of openTrades) {
          const exitPrice = trade.currentPrice || trade.entryPrice;
          await this.closeTrade(trade._id, exitPrice, 'RMS');
          squaredOffTrades.push(trade);
          
          // Refresh user balance
          const updatedUser = await User.findById(user._id);
          if (updatedUser.wallet.cashBalance > 0) break;
        }
      }
    }
    
    return squaredOffTrades;
  }
  
  // Time-based auto square-off for intraday positions
  static async runIntradaySquareOff(segment = 'EQUITY') {
    const openTrades = await Trade.find({ 
      status: 'OPEN',
      productType: 'MIS',
      segment
    });
    
    const squaredOffTrades = [];
    
    for (const trade of openTrades) {
      const exitPrice = trade.currentPrice || trade.entryPrice;
      await this.closeTrade(trade._id, exitPrice, 'TIME_BASED');
      squaredOffTrades.push(trade);
    }
    
    return squaredOffTrades;
  }
  
  // Get user's open positions
  static async getOpenPositions(userId) {
    return Trade.find({ user: userId, status: 'OPEN' }).sort({ openedAt: -1 });
  }
  
  // Get user's closed positions
  static async getClosedPositions(userId, limit = 50) {
    return Trade.find({ user: userId, status: 'CLOSED' })
      .sort({ closedAt: -1 })
      .limit(limit);
  }
  
  // Get admin's all trades
  static async getAdminTrades(adminCode, status = null) {
    const query = { adminCode };
    if (status) query.status = status;
    return Trade.find(query).sort({ openedAt: -1 });
  }
  
  // Get trade summary for user
  static async getUserTradeSummary(userId) {
    const openTrades = await Trade.find({ user: userId, status: 'OPEN' });
    const todayTrades = await Trade.find({
      user: userId,
      status: 'CLOSED',
      closedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    
    const totalUnrealizedPnL = openTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const todayRealizedPnL = todayTrades.reduce((sum, t) => sum + t.netPnL, 0);
    const totalMarginUsed = openTrades.reduce((sum, t) => sum + t.marginUsed, 0);
    
    return {
      openPositions: openTrades.length,
      todayTrades: todayTrades.length,
      totalUnrealizedPnL,
      todayRealizedPnL,
      totalMarginUsed
    };
  }
}

export default TradeService;
