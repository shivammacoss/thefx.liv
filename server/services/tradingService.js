import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Admin from '../models/Admin.js';

// Lot sizes for different instruments
const LOT_SIZES = {
  'NIFTY': 25,
  'BANKNIFTY': 15,
  'FINNIFTY': 25,
  'MIDCPNIFTY': 50,
  'SENSEX': 10,
  'BANKEX': 15,
};

// Market hours (IST)
const MARKET_HOURS = {
  NSE: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  BSE: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  NFO: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  MCX: { open: { hour: 9, minute: 0 }, close: { hour: 23, minute: 30 } },
};

class TradingService {
  
  // Get lot size for instrument
  static getLotSize(symbol, category) {
    if (category) {
      const cat = category.toUpperCase();
      if (cat.includes('NIFTY') && !cat.includes('BANK') && !cat.includes('FIN') && !cat.includes('MID')) return 25;
      if (cat.includes('BANKNIFTY')) return 15;
      if (cat.includes('FINNIFTY')) return 25;
      if (cat.includes('MIDCPNIFTY')) return 50;
    }
    for (const [key, size] of Object.entries(LOT_SIZES)) {
      if (symbol.toUpperCase().includes(key)) return size;
    }
    return 1;
  }

  // Check if market is open
  static isMarketOpen(exchange = 'NSE') {
    // Get current time in IST
    const now = new Date();
    const istOptions = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short' };
    const istTimeStr = now.toLocaleString('en-US', istOptions);
    
    // Parse IST time
    const [weekday, time] = istTimeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Check weekend
    if (weekday === 'Sat' || weekday === 'Sun') {
      return { open: false, reason: 'Market closed on weekends' };
    }
    
    const marketHours = MARKET_HOURS[exchange] || MARKET_HOURS.NSE;
    const currentMinutes = hours * 60 + minutes;
    const openMinutes = marketHours.open.hour * 60 + marketHours.open.minute;
    const closeMinutes = marketHours.close.hour * 60 + marketHours.close.minute;
    
    console.log(`Market check for ${exchange}: Current IST ${hours}:${minutes} (${currentMinutes} mins), Open: ${openMinutes}, Close: ${closeMinutes}`);
    
    if (currentMinutes < openMinutes) {
      return { open: false, reason: `Market opens at ${marketHours.open.hour}:${String(marketHours.open.minute).padStart(2, '0')} IST` };
    }
    if (currentMinutes > closeMinutes) {
      return { open: false, reason: `Market closed at ${marketHours.close.hour}:${String(marketHours.close.minute).padStart(2, '0')} IST` };
    }
    
    return { open: true };
  }

  // Get admin settings for user
  static async getAdminSettings(user) {
    const admin = await Admin.findOne({ adminCode: user.adminCode });
    return admin || null;
  }

  // Get available leverages for user
  static async getAvailableLeverages(user) {
    const admin = await this.getAdminSettings(user);
    if (!admin || !admin.leverageSettings) {
      return [1, 2, 5, 10];
    }
    return admin.leverageSettings.enabledLeverages || [1, 2, 5, 10];
  }

  // Calculate margin required with leverage
  static calculateMargin(order, user, leverage = 1) {
    const { segment, productType, side, quantity, price, lotSize = 1 } = order;
    const effectiveLotSize = lotSize || this.getLotSize(order.symbol, order.category);
    const tradeValue = quantity * effectiveLotSize * price;
    
    let baseMargin = 0;

    if (segment === 'EQUITY' || segment === 'equity') {
      if (productType === 'CNC') {
        baseMargin = side === 'BUY' ? tradeValue : 0;
      } else if (productType === 'MIS') {
        baseMargin = tradeValue * 0.2;
      }
    } else if (segment === 'FNO' && order.instrumentType === 'FUTURES') {
      baseMargin = tradeValue * 0.15;
      if (productType === 'MIS') baseMargin *= 0.5;
    } else if (segment === 'FNO' && order.instrumentType === 'OPTIONS') {
      if (side === 'BUY') {
        baseMargin = tradeValue;
      } else {
        const notionalValue = quantity * effectiveLotSize * (order.strikePrice || price * 10);
        baseMargin = notionalValue * 0.20;
        if (productType === 'MIS') baseMargin *= 0.5;
      }
    } else if (segment === 'MCX' || segment === 'COMMODITY') {
      // MCX commodities - lower margin for B-book
      baseMargin = tradeValue * 0.05; // 5% margin for MCX
      if (productType === 'MIS') baseMargin *= 0.5; // 2.5% for intraday
    } else {
      baseMargin = tradeValue * 0.15;
    }

    const marginRequired = baseMargin / leverage;
    
    return {
      marginRequired: Math.round(marginRequired * 100) / 100,
      tradeValue: Math.round(tradeValue * 100) / 100,
      effectiveMargin: Math.round(baseMargin * 100) / 100,
      leverage
    };
  }

  // Place order
  static async placeOrder(userId, orderData) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const admin = await this.getAdminSettings(user);

    if (user.rmsSettings?.tradingBlocked) {
      throw new Error('Trading blocked. Contact admin.');
    }

    const exchange = orderData.exchange || 'NSE';
    const marketStatus = this.isMarketOpen(exchange);
    const allowOutsideHours = admin?.tradingSettings?.allowTradingOutsideMarketHours || false;
    
    if (orderData.orderType === 'MARKET' && !marketStatus.open && !allowOutsideHours) {
      throw new Error(marketStatus.reason);
    }

    const leverage = orderData.leverage || 1;
    const availableLeverages = await this.getAvailableLeverages(user);
    if (!availableLeverages.includes(leverage)) {
      throw new Error(`Leverage ${leverage}x not available. Available: ${availableLeverages.join(', ')}x`);
    }

    const marginCalc = this.calculateMargin(orderData, user, leverage);
    const marginRequired = marginCalc.marginRequired;

    // Use cashBalance (primary) or balance (legacy) for wallet
    const walletBalance = user.wallet?.cashBalance || user.wallet?.balance || 0;
    const blockedMargin = user.wallet?.usedMargin || user.wallet?.blocked || 0;
    const availableBalance = walletBalance - blockedMargin;

    if (marginRequired > availableBalance) {
      throw new Error(`Insufficient funds. Required: ₹${marginRequired.toLocaleString()}, Available: ₹${availableBalance.toLocaleString()}`);
    }

    const lotSize = orderData.lotSize || this.getLotSize(orderData.symbol, orderData.category);
    const totalQuantity = (orderData.lots || 1) * lotSize;
    const lots = orderData.lots || 1;

    // Get charge settings from admin
    const spreadPoints = admin?.chargeSettings?.spread || 0;
    const commissionType = admin?.chargeSettings?.commissionType || 'PER_LOT';
    const perLotCharge = admin?.chargeSettings?.perLotCharge || admin?.chargeSettings?.commission || 0;
    const perTradeCharge = admin?.chargeSettings?.perTradeCharge || 0;
    const perCroreCharge = admin?.chargeSettings?.perCroreCharge || 0;
    
    // Calculate trade value for per crore calculation
    const tradeValue = marginCalc.tradeValue;
    
    // Calculate commission based on type
    let totalCommission = 0;
    if (commissionType === 'PER_LOT') {
      totalCommission = perLotCharge * lots;
    } else if (commissionType === 'PER_TRADE') {
      totalCommission = perTradeCharge;
    } else if (commissionType === 'PER_CRORE') {
      totalCommission = (tradeValue / 10000000) * perCroreCharge; // Per crore = per 1,00,00,000
    }
    
    const spreadCost = spreadPoints * totalQuantity; // Spread affects P&L, not deducted upfront
    const totalCharges = totalCommission; // Only commission is deducted from wallet

    // Indian Net Trading: BUY uses Ask price, SELL uses Bid price
    // Entry price should be the actual execution price (ask for buy, bid for sell)
    let baseEntryPrice = orderData.price || 0;
    if (orderData.orderType === 'MARKET') {
      if (orderData.side === 'BUY') {
        // BUY at Ask price (the price sellers are asking)
        baseEntryPrice = orderData.askPrice || orderData.price || 0;
      } else {
        // SELL at Bid price (the price buyers are bidding)
        baseEntryPrice = orderData.bidPrice || orderData.price || 0;
      }
    }
    
    // Apply spread on top of bid/ask price
    let effectiveEntryPrice = baseEntryPrice;
    if (orderData.orderType === 'MARKET' && spreadPoints > 0) {
      if (orderData.side === 'BUY') {
        effectiveEntryPrice = baseEntryPrice + spreadPoints; // Buy at higher price
      } else {
        effectiveEntryPrice = baseEntryPrice - spreadPoints; // Sell at lower price
      }
    }

    // Check if user has enough for margin + commission
    if ((marginRequired + totalCommission) > availableBalance) {
      throw new Error(`Insufficient funds. Required: ₹${(marginRequired + totalCommission).toLocaleString()}, Available: ₹${availableBalance.toLocaleString()}`);
    }

    // Get adminCode from user or fetch from admin if not set
    let adminCode = user.adminCode;
    if (!adminCode && user.admin) {
      const userAdmin = await Admin.findById(user.admin);
      adminCode = userAdmin?.adminCode || 'SYSTEM';
      // Update user with adminCode for future trades
      user.adminCode = adminCode;
      await user.save();
    }
    if (!adminCode) {
      throw new Error('User not linked to any admin. Please contact support.');
    }

    const trade = new Trade({
      user: userId,
      userId: user.userId,
      adminCode: adminCode,
      segment: orderData.segment || 'FNO',
      instrumentType: orderData.instrumentType || 'OPTIONS',
      symbol: orderData.symbol,
      token: orderData.token, // Store token for price lookup
      exchange: orderData.exchange || 'NFO',
      expiry: orderData.expiry,
      strike: orderData.strike,
      optionType: orderData.optionType,
      side: orderData.side,
      productType: orderData.productType || 'MIS',
      orderType: orderData.orderType || 'MARKET',
      quantity: totalQuantity,
      lotSize: lotSize,
      lots: lots,
      entryPrice: orderData.orderType === 'MARKET' ? effectiveEntryPrice : 0,
      limitPrice: orderData.orderType === 'LIMIT' ? orderData.limitPrice : null,
      triggerPrice: orderData.triggerPrice || null,
      stopLoss: orderData.stopLoss || null,
      target: orderData.target || null,
      marginUsed: marginRequired,
      leverage: leverage,
      effectiveMargin: marginCalc.effectiveMargin,
      spread: spreadPoints,
      commission: totalCommission,
      totalCharges: totalCharges,
      status: orderData.orderType === 'MARKET' ? 'OPEN' : 'PENDING',
      bookType: 'B_BOOK'
    });

    if (orderData.orderType === 'MARKET') {
      trade.entryPrice = effectiveEntryPrice;
      trade.currentPrice = orderData.price; // Current price is actual market price
      trade.marketPrice = orderData.price; // Store original market price
    }
    
    // Block margin from balance and deduct commission
    // Margin is blocked (reserved), commission is deducted permanently
    // Update both cashBalance (primary) and balance (legacy) for compatibility
    user.wallet.cashBalance = (user.wallet.cashBalance || 0) - marginRequired - totalCommission;
    user.wallet.balance = (user.wallet.balance || 0) - marginRequired - totalCommission;
    user.wallet.usedMargin = (user.wallet.usedMargin || 0) + marginRequired;
    user.wallet.blocked = (user.wallet.blocked || 0) + marginRequired;
    await user.save();
    await trade.save();

    return {
      success: true,
      trade,
      marginBlocked: marginRequired,
      tradeValue: marginCalc.tradeValue,
      leverage,
      spread: spreadPoints,
      commission: totalCommission,
      totalCharges: totalCharges,
      availableBalance: availableBalance - marginRequired - totalCommission
    };
  }

  // Execute pending order when price matches
  static async executePendingOrder(tradeId, currentPrice) {
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== 'PENDING') return null;

    let shouldExecute = false;

    if (trade.orderType === 'LIMIT') {
      if (trade.side === 'BUY' && currentPrice <= trade.limitPrice) shouldExecute = true;
      else if (trade.side === 'SELL' && currentPrice >= trade.limitPrice) shouldExecute = true;
    } else if (trade.orderType === 'SL' || trade.orderType === 'SL-M') {
      if (trade.side === 'BUY' && currentPrice >= trade.triggerPrice) shouldExecute = true;
      else if (trade.side === 'SELL' && currentPrice <= trade.triggerPrice) shouldExecute = true;
    }

    if (shouldExecute) {
      trade.status = 'OPEN';
      trade.entryPrice = currentPrice;
      trade.currentPrice = currentPrice;
      trade.openedAt = new Date();
      await trade.save();
      return trade;
    }

    return null;
  }

  // Check stop loss and target
  static async checkStopLossTarget(tradeId, currentPrice) {
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== 'OPEN') return null;

    let shouldClose = false;
    let closeReason = null;

    if (trade.stopLoss) {
      if (trade.side === 'BUY' && currentPrice <= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'STOP_LOSS';
      } else if (trade.side === 'SELL' && currentPrice >= trade.stopLoss) {
        shouldClose = true;
        closeReason = 'STOP_LOSS';
      }
    }

    if (trade.target && !shouldClose) {
      if (trade.side === 'BUY' && currentPrice >= trade.target) {
        shouldClose = true;
        closeReason = 'TARGET';
      } else if (trade.side === 'SELL' && currentPrice <= trade.target) {
        shouldClose = true;
        closeReason = 'TARGET';
      }
    }

    if (shouldClose) {
      return await this.closeTrade(tradeId, currentPrice, closeReason);
    }

    return null;
  }

  // Close trade
  static async closeTrade(tradeId, exitPrice, reason = 'MANUAL') {
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== 'OPEN') {
      throw new Error('Trade not found or already closed');
    }

    const user = await User.findById(trade.user);
    if (!user) throw new Error('User not found');

    // Apply spread to exit price (opposite of entry)
    const spreadPoints = trade.spread || 0;
    let effectiveExitPrice = exitPrice;
    
    if (spreadPoints > 0) {
      if (trade.side === 'BUY') {
        // When closing a BUY, we SELL - so we get lower price
        effectiveExitPrice = exitPrice - spreadPoints;
      } else {
        // When closing a SELL, we BUY - so we pay higher price
        effectiveExitPrice = exitPrice + spreadPoints;
      }
    }

    // Calculate P&L based on entry price (which already has spread applied) and effective exit price
    const multiplier = trade.side === 'BUY' ? 1 : -1;
    const priceDiff = (effectiveExitPrice - trade.entryPrice) * multiplier;
    const grossPnL = priceDiff * trade.quantity;
    
    // Net P&L is gross P&L (commission was already deducted at entry)
    const netPnL = grossPnL;

    trade.exitPrice = exitPrice; // Store actual market exit price
    trade.effectiveExitPrice = effectiveExitPrice; // Store effective exit price after spread
    trade.status = 'CLOSED';
    trade.closeReason = reason;
    trade.closedAt = new Date();
    trade.realizedPnL = grossPnL;
    trade.pnl = grossPnL;
    trade.unrealizedPnL = 0;
    trade.netPnL = netPnL;
    trade.adminPnL = -grossPnL; // Admin's P&L is opposite (B-book)

    await trade.save();

    // Release blocked margin and add/subtract P&L
    // Update both primary (cashBalance/usedMargin) and legacy (balance/blocked) fields
    user.wallet.usedMargin = Math.max(0, (user.wallet.usedMargin || 0) - trade.marginUsed);
    user.wallet.blocked = Math.max(0, (user.wallet.blocked || 0) - trade.marginUsed);
    user.wallet.cashBalance = (user.wallet.cashBalance || 0) + trade.marginUsed + netPnL; // Return margin + P&L
    user.wallet.balance = (user.wallet.balance || 0) + trade.marginUsed + netPnL; // Return margin + P&L
    user.wallet.realizedPnL = (user.wallet.realizedPnL || 0) + netPnL; // Track realized P&L
    await user.save();

    return { 
      trade, 
      pnl: netPnL,
      grossPnL,
      exitPrice,
      effectiveExitPrice,
      spread: spreadPoints
    };
  }

  // Update P&L for all open trades
  static async updateTradesPnL(priceUpdates) {
    const openTrades = await Trade.find({ status: 'OPEN' });
    const results = [];

    for (const trade of openTrades) {
      const currentPrice = priceUpdates[trade.symbol];
      if (!currentPrice) continue;

      const multiplier = trade.side === 'BUY' ? 1 : -1;
      const priceDiff = (currentPrice - trade.entryPrice) * multiplier;
      trade.unrealizedPnL = priceDiff * trade.quantity;
      trade.currentPrice = currentPrice;
      await trade.save();

      const closeResult = await this.checkStopLossTarget(trade._id, currentPrice);
      if (closeResult) {
        results.push({ trade: closeResult.trade, action: 'CLOSED', reason: closeResult.trade.closeReason });
        continue;
      }

      // Margin call check
      const user = await User.findById(trade.user);
      if (user && trade.unrealizedPnL < 0) {
        const walletBalance = user.wallet?.cashBalance || user.wallet?.balance || 0;
        const blockedMargin = user.wallet?.usedMargin || user.wallet?.blocked || 0;
        const availableBalance = walletBalance - blockedMargin;
        if (Math.abs(trade.unrealizedPnL) >= availableBalance) {
          const closeResult = await this.closeTrade(trade._id, currentPrice, 'RMS');
          results.push({ trade: closeResult.trade, action: 'MARGIN_CALL', pnl: closeResult.pnl });
        }
      }
    }

    return results;
  }

  // Get positions
  static async getPositions(userId, status = 'OPEN') {
    return Trade.find({ user: userId, status }).sort({ openedAt: -1 });
  }

  // Get pending orders
  static async getPendingOrders(userId) {
    return Trade.find({ user: userId, status: 'PENDING' }).sort({ createdAt: -1 });
  }

  // Get trade history
  static async getTradeHistory(userId, limit = 50) {
    return Trade.find({ user: userId, status: 'CLOSED' }).sort({ closedAt: -1 }).limit(limit);
  }

  // Get wallet summary
  static async getWalletSummary(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const openTrades = await Trade.find({ user: userId, status: 'OPEN' });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayClosedTrades = await Trade.find({
      user: userId,
      status: 'CLOSED',
      closedAt: { $gte: todayStart }
    });

    const unrealizedPnL = openTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);
    const realizedPnL = todayClosedTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const marginUsed = openTrades.reduce((sum, t) => sum + (t.marginUsed || 0), 0);

    // Use cashBalance (primary) or balance (legacy)
    const walletBalance = user.wallet?.cashBalance || user.wallet?.balance || 0;
    const blockedMargin = user.wallet?.usedMargin || user.wallet?.blocked || 0;
    
    return {
      balance: walletBalance,
      cashBalance: walletBalance,
      blocked: blockedMargin,
      usedMargin: blockedMargin,
      available: walletBalance - blockedMargin,
      availableMargin: walletBalance - blockedMargin,
      unrealizedPnL,
      realizedPnL,
      totalPnL: unrealizedPnL + realizedPnL,
      marginUsed,
      openPositions: openTrades.length
    };
  }

  // Cancel order
  static async cancelOrder(tradeId, userId) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'PENDING' });
    if (!trade) throw new Error('Pending order not found');

    const user = await User.findById(userId);
    // Release blocked margin - update both primary and legacy fields
    user.wallet.usedMargin = Math.max(0, (user.wallet.usedMargin || 0) - trade.marginUsed);
    user.wallet.blocked = Math.max(0, (user.wallet.blocked || 0) - trade.marginUsed);
    // Return margin to balance (commission was already deducted, so just return margin)
    user.wallet.cashBalance = (user.wallet.cashBalance || 0) + trade.marginUsed;
    user.wallet.balance = (user.wallet.balance || 0) + trade.marginUsed;
    await user.save();

    trade.status = 'CANCELLED';
    await trade.save();

    return { success: true, trade };
  }

  // Legacy methods
  static async getOrders(userId, status = null) {
    const query = { user: userId };
    if (status) query.status = status;
    return Trade.find(query).sort({ createdAt: -1 });
  }

  static async squareOffPosition(positionId, reason = 'MANUAL', exitPrice = null, bidPrice = null, askPrice = null) {
    const trade = await Trade.findById(positionId);
    if (!trade) throw new Error('Position not found');
    
    // Indian Net Trading: Use correct price based on position side
    // BUY position closes at Bid price (you sell at bid)
    // SELL position closes at Ask price (you buy at ask)
    let price = exitPrice || trade.currentPrice || trade.entryPrice;
    if (trade.side === 'BUY' && bidPrice) {
      price = bidPrice;
    } else if (trade.side === 'SELL' && askPrice) {
      price = askPrice;
    }
    
    return this.closeTrade(positionId, price, reason);
  }

  static async processPendingOrders(priceUpdates) {
    const pendingTrades = await Trade.find({ status: 'PENDING' });
    const results = [];

    for (const trade of pendingTrades) {
      const currentPrice = priceUpdates[trade.symbol];
      if (!currentPrice) continue;

      const executed = await this.executePendingOrder(trade._id, currentPrice);
      if (executed) {
        results.push({ trade: executed, action: 'EXECUTED' });
      }
    }

    return results;
  }

  static getMarketStatus(exchange = 'NSE') {
    return this.isMarketOpen(exchange);
  }
}

export default TradingService;
