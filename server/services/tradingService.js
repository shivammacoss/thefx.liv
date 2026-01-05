import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Admin from '../models/Admin.js';
import TradeService from './tradeService.js';

// Lot sizes for different instruments
const LOT_SIZES = {
  // NSE F&O
  'NIFTY': 25,
  'BANKNIFTY': 15,
  'FINNIFTY': 25,
  'MIDCPNIFTY': 50,
  'SENSEX': 10,
  'BANKEX': 15,
  // MCX Commodities
  'GOLD': 100,
  'SILVER': 30,
  'CRUDEOIL': 100,
  'NATURALGAS': 1250,
  'COPPER': 2500,
  'ZINC': 5000,
  'ALUMINIUM': 5000,
  'LEAD': 5000,
  'NICKEL': 1500,
};

// Market hours (IST)
const MARKET_HOURS = {
  NSE: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  BSE: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  NFO: { open: { hour: 9, minute: 15 }, close: { hour: 15, minute: 30 } },
  MCX: { open: { hour: 9, minute: 0 }, close: { hour: 23, minute: 30 } },
  BINANCE: { open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }, // 24/7
  CRYPTO: { open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }, // 24/7
};

// USD to INR conversion rate
const USD_TO_INR = 83;

class TradingService {
  
  // Get lot size for instrument
  static getLotSize(symbol, category, exchange) {
    const sym = symbol?.toUpperCase() || '';
    const cat = category?.toUpperCase() || '';
    const exch = exchange?.toUpperCase() || '';
    
    // MCX commodities
    if (exch === 'MCX' || cat === 'MCX') {
      if (sym.includes('GOLD') || cat.includes('GOLD')) return 100;
      if (sym.includes('SILVER') || cat.includes('SILVER')) return 30;
      if (sym.includes('CRUDEOIL') || cat.includes('CRUDEOIL')) return 100;
      if (sym.includes('NATURALGAS') || cat.includes('NATURALGAS')) return 1250;
      if (sym.includes('COPPER') || cat.includes('COPPER')) return 2500;
      if (sym.includes('ZINC') || cat.includes('ZINC')) return 5000;
      if (sym.includes('ALUMINIUM') || cat.includes('ALUMINIUM')) return 5000;
      if (sym.includes('LEAD') || cat.includes('LEAD')) return 5000;
      if (sym.includes('NICKEL') || cat.includes('NICKEL')) return 1500;
    }
    
    // NSE F&O by category
    if (cat) {
      if (cat.includes('NIFTY') && !cat.includes('BANK') && !cat.includes('FIN') && !cat.includes('MID')) return 25;
      if (cat.includes('BANKNIFTY')) return 15;
      if (cat.includes('FINNIFTY')) return 25;
      if (cat.includes('MIDCPNIFTY')) return 50;
    }
    
    // Check by symbol
    for (const [key, size] of Object.entries(LOT_SIZES)) {
      if (sym.includes(key)) return size;
    }
    return 1;
  }

  // Check if market is open
  static isMarketOpen(exchange = 'NSE') {
    // Crypto/Binance is always open 24/7
    if (exchange === 'BINANCE' || exchange === 'CRYPTO') {
      return { open: true, reason: 'Crypto markets are open 24/7' };
    }
    
    // Get current time in IST
    const now = new Date();
    const istOptions = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short' };
    const istTimeStr = now.toLocaleString('en-US', istOptions);
    
    // Parse IST time
    const [weekday, time] = istTimeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Check weekend (not for crypto)
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
    const { segment, productType, side, quantity, price, lotSize = 1, lots = 1 } = order;
    
    // For crypto, convert USD to INR for margin calculation
    const isCrypto = segment === 'CRYPTO' || order.isCrypto || order.exchange === 'BINANCE';
    const effectivePrice = isCrypto ? price * USD_TO_INR : price;
    
    // Trade value: quantity already includes lotSize from frontend (quantity = lots × lotSize)
    const tradeValue = quantity * effectivePrice;
    
    let baseMargin = 0;

    if (isCrypto) {
      // Crypto spot trading - full value required (1x leverage for spot)
      baseMargin = tradeValue;
      if (productType === 'MIS') baseMargin *= 0.1; // 10% margin for crypto intraday
    } else if (segment === 'EQUITY' || segment === 'equity') {
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
        // For option sell, use strike price for notional value
        const notionalValue = quantity * (order.strikePrice || effectivePrice * 10);
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
      leverage,
      isCrypto
    };
  }

  // Place order - Uses user's segment and script settings for all calculations
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

    // Get user's segment and script settings
    const segmentSettings = TradeService.getUserSegmentSettings(user, orderData.segment, orderData.instrumentType);
    const scriptSettings = TradeService.getUserScriptSettings(user, orderData.symbol, orderData.category);
    
    // Validate segment is enabled
    if (!segmentSettings.enabled) {
      throw new Error(`Trading in ${orderData.segment} segment is not enabled for your account`);
    }
    
    // Check if script is blocked
    if (scriptSettings?.blocked) {
      throw new Error(`Trading in ${orderData.symbol} is blocked for your account`);
    }

    const lotSize = orderData.lotSize || this.getLotSize(orderData.symbol, orderData.category, orderData.exchange);
    const lots = orderData.lots || 1;
    const totalQuantity = lots * lotSize;
    
    // Validate lot limits from user settings
    // Script settings override segment settings, segment settings are the default
    const maxLots = scriptSettings?.lotSettings?.maxLots || segmentSettings?.maxLots || 50;
    const minLots = scriptSettings?.lotSettings?.minLots || segmentSettings?.minLots || 1;
    
    console.log('Lot Validation:', {
      requestedLots: lots,
      maxLots, minLots,
      fromScript: !!scriptSettings?.lotSettings?.maxLots,
      fromSegment: segmentSettings?.maxLots,
      segment: orderData.segment
    });
    
    if (lots < minLots) {
      throw new Error(`Minimum ${minLots} lots required for ${orderData.symbol}`);
    }
    if (lots > maxLots) {
      throw new Error(`Maximum ${maxLots} lots allowed for ${orderData.symbol}. Your limit is ${maxLots} lots.`);
    }

    // Calculate spread from user's script settings
    const spreadPoints = TradeService.calculateUserSpread(scriptSettings, orderData.side);
    
    // Calculate brokerage from user's segment/script settings
    const totalCommission = TradeService.calculateUserBrokerage(segmentSettings, scriptSettings, orderData, lots);
    
    // Calculate margin - check for fixed margin first
    const isIntraday = orderData.productType === 'MIS' || orderData.productType === 'INTRADAY';
    const isOption = orderData.instrumentType === 'OPTIONS';
    const isOptionBuy = isOption && orderData.side === 'BUY';
    const isOptionSell = isOption && orderData.side === 'SELL';
    
    let marginRequired = 0;
    let usedFixedMargin = false;
    let marginSource = 'calculated';
    const leverage = orderData.leverage || 1;
    const marginCalc = this.calculateMargin({ ...orderData, quantity: totalQuantity }, user, leverage);
    
    const price = orderData.price || 0;
    const tradeValue = price * lotSize * lots;
    
    // Priority 1: Check for fixed margin in script settings
    if (scriptSettings?.fixedMargin) {
      let fixedMarginPerLot = 0;
      if (isOptionBuy) {
        fixedMarginPerLot = isIntraday ? scriptSettings.fixedMargin.optionBuyIntraday : scriptSettings.fixedMargin.optionBuyCarry;
      } else if (isOptionSell) {
        fixedMarginPerLot = isIntraday ? scriptSettings.fixedMargin.optionSellIntraday : scriptSettings.fixedMargin.optionSellCarry;
      } else {
        fixedMarginPerLot = isIntraday ? scriptSettings.fixedMargin.intradayFuture : scriptSettings.fixedMargin.carryFuture;
      }
      
      if (fixedMarginPerLot > 0) {
        marginRequired = fixedMarginPerLot * lots;
        usedFixedMargin = true;
        marginSource = 'script_fixed';
      }
    }
    
    // Priority 2: Use segment exposure if no fixed margin
    // Exposure formula: margin = tradeValue / exposure
    if (!usedFixedMargin && segmentSettings) {
      const exposure = isIntraday 
        ? (segmentSettings.exposureIntraday || 1) 
        : (segmentSettings.exposureCarryForward || 1);
      
      if (exposure > 0) {
        marginRequired = tradeValue / exposure;
        marginSource = 'segment_exposure';
        console.log('Order margin from exposure:', { tradeValue, exposure, marginRequired, isIntraday });
      }
    }
    
    // Priority 3: Fall back to default calculated margin
    if (marginRequired === 0) {
      marginRequired = marginCalc.marginRequired;
      marginSource = 'default_calculated';
    }

    // Use tradingBalance for trading (dual wallet system)
    const walletBalance = user.wallet?.tradingBalance || user.wallet?.cashBalance || user.wallet?.balance || 0;
    const blockedMargin = user.wallet?.usedMargin || user.wallet?.blocked || 0;
    const availableBalance = walletBalance - blockedMargin;

    // Check if user has enough for margin + commission
    if ((marginRequired + totalCommission) > availableBalance) {
      throw new Error(`Insufficient funds. Required: ₹${(marginRequired + totalCommission).toLocaleString()}, Available: ₹${availableBalance.toLocaleString()}`);
    }

    // Indian Net Trading: BUY uses Ask price, SELL uses Bid price
    let baseEntryPrice = orderData.price || 0;
    if (orderData.orderType === 'MARKET') {
      if (orderData.side === 'BUY') {
        baseEntryPrice = orderData.askPrice || orderData.price || 0;
      } else {
        baseEntryPrice = orderData.bidPrice || orderData.price || 0;
      }
    }
    
    // Apply spread from user settings on top of bid/ask price
    let effectiveEntryPrice = baseEntryPrice;
    if (orderData.orderType === 'MARKET' && spreadPoints > 0) {
      if (orderData.side === 'BUY') {
        effectiveEntryPrice = baseEntryPrice + spreadPoints;
      } else {
        effectiveEntryPrice = baseEntryPrice - spreadPoints;
      }
    }
    
    const finalTradeValue = totalQuantity * effectiveEntryPrice;
    const totalCharges = totalCommission;

    // Get adminCode from user or fetch from admin if not set
    let adminCode = user.adminCode;
    if (!adminCode && user.admin) {
      const userAdmin = await Admin.findById(user.admin);
      adminCode = userAdmin?.adminCode || 'SYSTEM';
      // Update user with adminCode for future trades using updateOne to avoid validation issues
      await User.updateOne({ _id: user._id }, { $set: { adminCode: adminCode } });
      user.adminCode = adminCode;
    }
    // If still no adminCode, use SYSTEM as default for crypto trades
    if (!adminCode) {
      if (orderData.isCrypto || orderData.segment === 'CRYPTO' || orderData.exchange === 'BINANCE') {
        adminCode = 'SYSTEM';
        console.log('Using SYSTEM adminCode for crypto trade');
      } else {
        throw new Error('User not linked to any admin. Please contact support.');
      }
    }

    // Determine if crypto trade
    const isCrypto = orderData.segment === 'CRYPTO' || orderData.isCrypto || orderData.exchange === 'BINANCE';
    
    const trade = new Trade({
      user: userId,
      userId: user.userId,
      adminCode: adminCode,
      segment: orderData.segment || 'FNO',
      instrumentType: orderData.instrumentType || 'OPTIONS',
      symbol: orderData.symbol,
      token: orderData.token, // Store token for price lookup
      pair: orderData.pair, // For crypto trading pairs
      isCrypto: isCrypto,
      exchange: orderData.exchange || (isCrypto ? 'BINANCE' : 'NFO'),
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
    
    // Block margin from tradingBalance and deduct commission (dual wallet system)
    // For crypto trades, no margin is blocked - only commission is deducted
    let newTradingBalance, newUsedMargin, newBlocked;
    
    if (isCrypto) {
      // Crypto trades: Only deduct commission, no margin blocking
      newTradingBalance = (user.wallet.tradingBalance || 0) - totalCommission;
      newUsedMargin = user.wallet.usedMargin || 0; // No change
      newBlocked = user.wallet.blocked || 0; // No change
      console.log('Crypto trade: Only commission deducted, no margin blocked');
    } else {
      // Regular trades: Block margin and deduct commission
      newTradingBalance = (user.wallet.tradingBalance || 0) - marginRequired - totalCommission;
      newUsedMargin = (user.wallet.usedMargin || 0) + marginRequired;
      newBlocked = (user.wallet.blocked || 0) + marginRequired;
    }
    
    // Use updateOne to avoid validation issues with segmentPermissions
    await User.updateOne(
      { _id: user._id },
      { $set: { 
        'wallet.tradingBalance': newTradingBalance,
        'wallet.usedMargin': newUsedMargin,
        'wallet.blocked': newBlocked
      }}
    );
    
    // Update local user object
    user.wallet.tradingBalance = newTradingBalance;
    user.wallet.usedMargin = newUsedMargin;
    user.wallet.blocked = newBlocked;
    
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

    // Release blocked margin and add/subtract P&L to tradingBalance (dual wallet system)
    // For crypto trades, no margin was blocked, so only add P&L
    let newUsedMargin, newBlocked, newTradingBalance;
    
    if (trade.isCrypto) {
      // Crypto trades: No margin to release, just add P&L
      newUsedMargin = user.wallet.usedMargin || 0; // No change
      newBlocked = user.wallet.blocked || 0; // No change
      newTradingBalance = (user.wallet.tradingBalance || 0) + netPnL;
      console.log('Crypto trade closed: No margin to release, only P&L added');
    } else {
      // Regular trades: Release margin and add P&L
      newUsedMargin = Math.max(0, (user.wallet.usedMargin || 0) - trade.marginUsed);
      newBlocked = Math.max(0, (user.wallet.blocked || 0) - trade.marginUsed);
      newTradingBalance = (user.wallet.tradingBalance || 0) + trade.marginUsed + netPnL;
    }
    const newRealizedPnL = (user.wallet.realizedPnL || 0) + netPnL;
    
    // Use updateOne to avoid validation issues with segmentPermissions
    await User.updateOne(
      { _id: user._id },
      { $set: { 
        'wallet.usedMargin': newUsedMargin,
        'wallet.blocked': newBlocked,
        'wallet.tradingBalance': newTradingBalance,
        'wallet.realizedPnL': newRealizedPnL
      }}
    );

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
        const walletBalance = user.wallet?.tradingBalance || user.wallet?.cashBalance || user.wallet?.balance || 0;
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

  // Get positions - optimized with lean() for faster response
  static async getPositions(userId, status = 'OPEN') {
    return Trade.find({ user: userId, status })
      .select('userId symbol token pair isCrypto exchange segment instrumentType optionType strike expiry side productType quantity lotSize lots entryPrice currentPrice marketPrice unrealizedPnL marginUsed leverage spread commission status openedAt')
      .sort({ openedAt: -1 })
      .lean();
  }

  // Get pending orders - optimized
  static async getPendingOrders(userId) {
    return Trade.find({ user: userId, status: 'PENDING' })
      .select('userId symbol exchange segment side productType quantity lots entryPrice limitPrice triggerPrice marginUsed status createdAt orderType isCrypto commission')
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get trade history - optimized
  static async getTradeHistory(userId, limit = 50) {
    return Trade.find({ user: userId, status: 'CLOSED' })
      .select('userId symbol exchange segment side productType quantity lots entryPrice exitPrice realizedPnL netPnL marginUsed commission closedAt closeReason isCrypto')
      .sort({ closedAt: -1 })
      .limit(limit)
      .lean();
  }

  // Get wallet summary - optimized with aggregation for faster P&L
  static async getWalletSummary(userId) {
    const user = await User.findById(userId).select('wallet').lean();
    if (!user) throw new Error('User not found');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Use aggregation for faster P&L calculation
    const [openStats, closedStats] = await Promise.all([
      Trade.aggregate([
        { $match: { user: userId, status: 'OPEN' } },
        { $group: {
          _id: null,
          unrealizedPnL: { $sum: { $ifNull: ['$unrealizedPnL', 0] } },
          marginUsed: { $sum: { $ifNull: ['$marginUsed', 0] } },
          count: { $sum: 1 }
        }}
      ]),
      Trade.aggregate([
        { $match: { user: userId, status: 'CLOSED', closedAt: { $gte: todayStart } } },
        { $group: {
          _id: null,
          realizedPnL: { $sum: { $ifNull: ['$realizedPnL', 0] } }
        }}
      ])
    ]);

    const unrealizedPnL = openStats[0]?.unrealizedPnL || 0;
    const marginUsed = openStats[0]?.marginUsed || 0;
    const openPositions = openStats[0]?.count || 0;
    const realizedPnL = closedStats[0]?.realizedPnL || 0;

    // Use tradingBalance for trading (dual wallet system)
    const walletBalance = user.wallet?.tradingBalance || user.wallet?.cashBalance || user.wallet?.balance || 0;
    const blockedMargin = user.wallet?.usedMargin || user.wallet?.blocked || 0;
    
    return {
      balance: walletBalance,
      tradingBalance: walletBalance,
      blocked: blockedMargin,
      usedMargin: blockedMargin,
      available: walletBalance - blockedMargin,
      availableMargin: walletBalance - blockedMargin,
      unrealizedPnL,
      realizedPnL,
      totalPnL: unrealizedPnL + realizedPnL,
      marginUsed,
      openPositions
    };
  }

  // Cancel order
  static async cancelOrder(tradeId, userId) {
    const trade = await Trade.findOne({ _id: tradeId, user: userId, status: 'PENDING' });
    if (!trade) throw new Error('Pending order not found');

    const user = await User.findById(userId);
    // Release blocked margin - update both primary and legacy fields
    // For crypto trades, no margin was blocked
    let newUsedMargin, newBlocked, newTradingBalance;
    
    if (trade.isCrypto) {
      // Crypto trades: No margin to release
      newUsedMargin = user.wallet.usedMargin || 0; // No change
      newBlocked = user.wallet.blocked || 0; // No change
      newTradingBalance = user.wallet.tradingBalance || 0; // No change
      console.log('Crypto order cancelled: No margin to release');
    } else {
      // Regular trades: Release margin
      newUsedMargin = Math.max(0, (user.wallet.usedMargin || 0) - trade.marginUsed);
      newBlocked = Math.max(0, (user.wallet.blocked || 0) - trade.marginUsed);
      newTradingBalance = (user.wallet.tradingBalance || 0) + trade.marginUsed;
    }
    
    await User.updateOne(
      { _id: userId },
      { $set: { 
        'wallet.usedMargin': newUsedMargin,
        'wallet.blocked': newBlocked,
        'wallet.tradingBalance': newTradingBalance
      }}
    );

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
