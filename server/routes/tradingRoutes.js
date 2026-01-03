import express from 'express';
import TradingService from '../services/tradingService.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Auth middleware
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Place order
router.post('/order', protect, async (req, res) => {
  try {
    // Check if user is in read-only mode
    if (req.user.isReadOnly) {
      return res.status(403).json({ message: 'Your account is in read-only mode. You can only view and close existing trades.' });
    }
    
    console.log('Order request:', req.body);
    const result = await TradingService.placeOrder(req.user._id, req.body);
    console.log('Order result:', result.success ? 'Success' : 'Failed');
    res.status(201).json(result);
  } catch (error) {
    console.error('Order error:', error.message);
    console.error('Order error stack:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

// Get orders
router.get('/orders', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await TradingService.getOrders(req.user._id, status);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get positions
router.get('/positions', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const positions = await TradingService.getPositions(req.user._id, status || 'OPEN');
    res.json(positions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Square off position
router.post('/positions/:id/squareoff', protect, async (req, res) => {
  try {
    const { exitPrice } = req.body;
    const result = await TradingService.squareOffPosition(
      req.params.id, 
      'MANUAL', 
      exitPrice
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Square off all positions
router.post('/positions/squareoff-all', protect, async (req, res) => {
  try {
    const positions = await TradingService.getPositions(req.user._id, 'OPEN');
    const results = [];
    
    for (const position of positions) {
      try {
        const result = await TradingService.squareOffPosition(position._id, 'MANUAL');
        results.push(result);
      } catch (error) {
        results.push({ error: error.message, positionId: position._id });
      }
    }
    
    res.json({ squaredOff: results.length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get wallet summary
router.get('/wallet', protect, async (req, res) => {
  try {
    const summary = await TradingService.getWalletSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Calculate margin for order (preview)
router.post('/margin-preview', protect, async (req, res) => {
  try {
    const leverage = req.body.leverage || 1;
    const marginCalc = TradingService.calculateMargin(req.body, req.user, leverage);
    
    // Use cashBalance (primary) or balance (legacy) for wallet - same as trading service
    const walletBalance = req.user.wallet?.cashBalance || req.user.wallet?.balance || 0;
    const blockedMargin = req.user.wallet?.usedMargin || req.user.wallet?.blocked || 0;
    const availableBalance = walletBalance - blockedMargin;
    
    res.json({
      marginRequired: marginCalc.marginRequired,
      tradeValue: marginCalc.tradeValue,
      effectiveMargin: marginCalc.effectiveMargin,
      leverage: marginCalc.leverage,
      canPlace: marginCalc.marginRequired <= availableBalance,
      availableBalance,
      shortfall: marginCalc.marginRequired > availableBalance ? marginCalc.marginRequired - availableBalance : 0
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get market status
router.get('/market-status', (req, res) => {
  const exchange = req.query.exchange || 'NSE';
  const status = TradingService.getMarketStatus(exchange);
  res.json(status);
});

// Get available leverages for user
router.get('/leverages', protect, async (req, res) => {
  try {
    const leverages = await TradingService.getAvailableLeverages(req.user);
    res.json({ leverages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending orders
router.get('/pending-orders', protect, async (req, res) => {
  try {
    const orders = await TradingService.getPendingOrders(req.user._id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trade history
router.get('/history', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const trades = await TradingService.getTradeHistory(req.user._id, limit);
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Close position (alias for squareoff)
router.post('/close/:id', protect, async (req, res) => {
  try {
    const { exitPrice, bidPrice, askPrice } = req.body;
    // Indian Net Trading: Use bid price for closing BUY, ask price for closing SELL
    const result = await TradingService.squareOffPosition(
      req.params.id, 
      'MANUAL', 
      exitPrice,
      bidPrice,
      askPrice
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cancel pending order (alias)
router.post('/cancel/:id', protect, async (req, res) => {
  try {
    const result = await TradingService.cancelOrder(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cancel pending order
router.post('/orders/:id/cancel', protect, async (req, res) => {
  try {
    const result = await TradingService.cancelOrder(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update P&L for all trades (called by price tick)
router.post('/update-pnl', protect, async (req, res) => {
  try {
    const { priceUpdates } = req.body;
    const result = await TradingService.updateTradesPnL(priceUpdates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Process pending orders (check if any should execute)
router.post('/process-pending', protect, async (req, res) => {
  try {
    const { priceUpdates } = req.body;
    const result = await TradingService.processPendingOrders(priceUpdates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get lot size for symbol
router.get('/lot-size/:symbol', (req, res) => {
  const category = req.query.category;
  const lotSize = TradingService.getLotSize(req.params.symbol, category);
  res.json({ symbol: req.params.symbol, lotSize, category });
});

// ==================== ADMIN CHARGE SETTINGS ====================

// Admin auth middleware
const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = await Admin.findById(decoded.id).select('-password');
    if (!req.admin) return res.status(401).json({ message: 'Admin not found' });
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Get charge settings
router.get('/admin/charge-settings', protectAdmin, async (req, res) => {
  try {
    const admin = req.admin;
    const chargeSettings = admin.chargeSettings || { 
      spread: 0, 
      commission: 0,
      commissionType: 'PER_LOT',
      perLotCharge: 0,
      perTradeCharge: 0,
      perCroreCharge: 0
    };
    res.json(chargeSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save charge settings
router.post('/admin/charge-settings', protectAdmin, async (req, res) => {
  try {
    const { spread, commissionType, perLotCharge, perTradeCharge, perCroreCharge } = req.body;
    const admin = req.admin;
    
    admin.chargeSettings = {
      spread: spread || 0,
      commission: perLotCharge || 0, // Keep backward compatibility
      commissionType: commissionType || 'PER_LOT',
      perLotCharge: perLotCharge || 0,
      perTradeCharge: perTradeCharge || 0,
      perCroreCharge: perCroreCharge || 0
    };
    await admin.save();
    
    res.json({ message: 'Charge settings saved', chargeSettings: admin.chargeSettings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
