import express from 'express';
import jwt from 'jsonwebtoken';
import Instrument from '../models/Instrument.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import marketDataService from '../services/marketDataService.js';

const router = express.Router();

// Auth middleware for admins
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

// Auth middleware for users
const protectUser = async (req, res, next) => {
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

// Super Admin only
const superAdminOnly = (req, res, next) => {
  if (req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Super Admin access required' });
  }
  next();
};

// ==================== PUBLIC ROUTES ====================

// Get all enabled instruments (for users)
router.get('/public', async (req, res) => {
  try {
    const { segment, category, search } = req.query;
    
    let query = { isEnabled: true };
    if (segment) query.segment = segment;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const instruments = await Instrument.find(query)
      .select('token symbol name exchange segment instrumentType optionType strike expiry lotSize ltp open high low close change changePercent volume lastUpdated category isFeatured sortOrder')
      .sort({ isFeatured: -1, category: 1, sortOrder: 1, symbol: 1 })
      .limit(500);
    
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instruments for a specific user (respects admin visibility settings)
router.get('/user', protectUser, async (req, res) => {
  try {
    const { segment, category, search } = req.query;
    const adminCode = req.user.adminCode;
    
    let query = {
      isEnabled: true,
      $or: [
        { visibleToAdmins: { $size: 0 } },
        { visibleToAdmins: adminCode }
      ],
      hiddenFromAdmins: { $ne: adminCode }
    };
    
    if (segment) query.segment = segment;
    if (category) query.category = category;
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { symbol: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    const instruments = await Instrument.find(query)
      .select('token symbol name exchange segment instrumentType lotSize ltp open high low close change changePercent volume lastUpdated category isFeatured')
      .sort({ isFeatured: -1, category: 1, sortOrder: 1, symbol: 1 })
      .limit(200);
    
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all instruments (admin view)
router.get('/admin', protectAdmin, async (req, res) => {
  try {
    const { segment, category, search, enabled, optionType } = req.query;
    
    let query = {};
    if (segment) query.segment = segment;
    if (category) query.category = category;
    if (enabled !== undefined) query.isEnabled = enabled === 'true';
    if (optionType) {
      if (optionType === 'FUT') {
        query.instrumentType = 'FUTURES';
      } else {
        query.optionType = optionType;
      }
    }
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const instruments = await Instrument.find(query)
      .sort({ category: 1, optionType: 1, strike: 1, sortOrder: 1, symbol: 1 })
      .limit(500);
    
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new instrument (Super Admin only)
router.post('/admin', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const instrument = await Instrument.create(req.body);
    res.status(201).json(instrument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk add instruments (Super Admin only)
router.post('/admin/bulk', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { instruments } = req.body;
    
    const result = await Instrument.insertMany(instruments, { ordered: false });
    res.status(201).json({ 
      message: `${result.length} instruments added`,
      count: result.length 
    });
  } catch (error) {
    if (error.writeErrors) {
      res.status(207).json({ 
        message: `Partial success: ${error.insertedDocs?.length || 0} added, ${error.writeErrors.length} failed`,
        errors: error.writeErrors.map(e => e.errmsg)
      });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// Update instrument
router.put('/admin/:id', protectAdmin, async (req, res) => {
  try {
    // Regular admins can only toggle visibility for their users
    if (req.admin.role !== 'SUPER_ADMIN') {
      const { isEnabled } = req.body;
      if (isEnabled !== undefined) {
        // Add/remove from hiddenFromAdmins
        const instrument = await Instrument.findById(req.params.id);
        if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
        
        if (!isEnabled) {
          if (!instrument.hiddenFromAdmins.includes(req.admin.adminCode)) {
            instrument.hiddenFromAdmins.push(req.admin.adminCode);
          }
        } else {
          instrument.hiddenFromAdmins = instrument.hiddenFromAdmins.filter(
            code => code !== req.admin.adminCode
          );
        }
        await instrument.save();
        return res.json(instrument);
      }
      return res.status(403).json({ message: 'Only Super Admin can modify instrument details' });
    }
    
    const instrument = await Instrument.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
    res.json(instrument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle instrument enabled status (Super Admin only)
router.put('/admin/:id/toggle', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
    
    instrument.isEnabled = !instrument.isEnabled;
    await instrument.save();
    
    res.json(instrument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk toggle instruments
router.put('/admin/bulk-toggle', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const { ids, isEnabled } = req.body;
    
    await Instrument.updateMany(
      { _id: { $in: ids } },
      { isEnabled }
    );
    
    res.json({ message: `${ids.length} instruments updated` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete instrument (Super Admin only)
router.delete('/admin/:id', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const instrument = await Instrument.findByIdAndDelete(req.params.id);
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
    res.json({ message: 'Instrument deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ==================== SEED DEFAULT INSTRUMENTS ====================

router.post('/admin/seed-defaults', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const defaultInstruments = [
      // Indices
      { token: '99926000', symbol: 'NIFTY', name: 'Nifty 50', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'INDEX', category: 'INDICES', lotSize: 1, isFeatured: true, sortOrder: 1 },
      { token: '99926009', symbol: 'BANKNIFTY', name: 'Bank Nifty', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'INDEX', category: 'INDICES', lotSize: 1, isFeatured: true, sortOrder: 2 },
      { token: '99926037', symbol: 'FINNIFTY', name: 'Fin Nifty', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'INDEX', category: 'INDICES', lotSize: 1, isFeatured: true, sortOrder: 3 },
      { token: '99926074', symbol: 'MIDCPNIFTY', name: 'Midcap Nifty', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'INDEX', category: 'INDICES', lotSize: 1, sortOrder: 4 },
      
      // Popular Stocks
      { token: '2885', symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, isFeatured: true, sortOrder: 1 },
      { token: '3045', symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, isFeatured: true, sortOrder: 2 },
      { token: '1333', symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, isFeatured: true, sortOrder: 3 },
      { token: '11536', symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 4 },
      { token: '1594', symbol: 'INFY', name: 'Infosys', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 5 },
      { token: '17963', symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 6 },
      { token: '1922', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 7 },
      { token: '3456', symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 8 },
      { token: '11630', symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 9 },
      { token: '10999', symbol: 'MARUTI', name: 'Maruti Suzuki', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 10 },
      { token: '1660', symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 11 },
      { token: '3787', symbol: 'WIPRO', name: 'Wipro', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 12 },
      { token: '317', symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 13 },
      { token: '16675', symbol: 'AXISBANK', name: 'Axis Bank', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 14 },
      { token: '2031', symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 15 },
      { token: '1348', symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', exchange: 'NSE', segment: 'EQUITY', instrumentType: 'STOCK', category: 'STOCKS', lotSize: 1, sortOrder: 16 },
      
      // MCX Commodities
      { token: '53523', symbol: 'GOLDM', name: 'Gold Mini', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 10, isFeatured: true, sortOrder: 1 },
      { token: '53524', symbol: 'GOLD', name: 'Gold', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 100, isFeatured: true, sortOrder: 2 },
      { token: '53525', symbol: 'SILVERM', name: 'Silver Mini', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 5, isFeatured: true, sortOrder: 3 },
      { token: '53526', symbol: 'SILVER', name: 'Silver', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 30, sortOrder: 4 },
      { token: '53527', symbol: 'CRUDEOIL', name: 'Crude Oil', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 100, isFeatured: true, sortOrder: 5 },
      { token: '53528', symbol: 'CRUDEOILM', name: 'Crude Oil Mini', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 10, sortOrder: 6 },
      { token: '53529', symbol: 'NATURALGAS', name: 'Natural Gas', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 1250, sortOrder: 7 },
      { token: '53530', symbol: 'COPPER', name: 'Copper', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 2500, sortOrder: 8 },
      { token: '53531', symbol: 'ZINC', name: 'Zinc', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 5000, sortOrder: 9 },
      { token: '53532', symbol: 'ALUMINIUM', name: 'Aluminium', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 5000, sortOrder: 10 },
      { token: '53533', symbol: 'LEAD', name: 'Lead', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 5000, sortOrder: 11 },
      { token: '53534', symbol: 'NICKEL', name: 'Nickel', exchange: 'MCX', segment: 'MCX', instrumentType: 'FUTURES', category: 'MCX', lotSize: 1500, sortOrder: 12 },
    ];
    
    let added = 0;
    let skipped = 0;
    
    for (const inst of defaultInstruments) {
      const exists = await Instrument.findOne({ token: inst.token });
      if (!exists) {
        await Instrument.create(inst);
        added++;
      } else {
        skipped++;
      }
    }
    
    res.json({ 
      message: `Seeded ${added} instruments, ${skipped} already existed`,
      added,
      skipped
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Seed F&O instruments with current expiry
router.post('/admin/seed-fno', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    // Calculate current and next month expiry (last Thursday of month)
    const getLastThursday = (year, month) => {
      const lastDay = new Date(year, month + 1, 0);
      const dayOfWeek = lastDay.getDay();
      const diff = (dayOfWeek >= 4) ? (dayOfWeek - 4) : (dayOfWeek + 3);
      return new Date(year, month + 1, -diff);
    };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get weekly expiry (next Thursday)
    const getNextThursday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
      const nextThurs = new Date(today);
      nextThurs.setDate(today.getDate() + daysUntilThursday);
      return nextThurs;
    };
    
    const weeklyExpiry = getNextThursday();
    const monthlyExpiry = getLastThursday(currentYear, currentMonth);
    const nextMonthExpiry = getLastThursday(currentYear, currentMonth + 1);
    
    // Use weekly expiry if monthly has passed
    const currentExpiry = monthlyExpiry > now ? monthlyExpiry : weeklyExpiry;
    
    const formatExpiry = (date) => {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return `${date.getDate()}${months[date.getMonth()]}${date.getFullYear().toString().slice(-2)}`;
    };
    
    const expiryStr = formatExpiry(currentExpiry);
    const nextExpiryStr = formatExpiry(nextMonthExpiry);
    
    // NIFTY current price ~26250, BANKNIFTY ~60000
    const niftyStrikes = [25800, 25900, 26000, 26100, 26200, 26300, 26400, 26500, 26600, 26700];
    const bankniftyStrikes = [59000, 59200, 59400, 59600, 59800, 60000, 60200, 60400, 60600, 60800];
    
    const fnoInstruments = [];
    
    // NIFTY Futures
    fnoInstruments.push({
      token: `NFO_NIFTY_FUT_${expiryStr}`,
      symbol: `NIFTY${expiryStr}FUT`,
      name: `NIFTY ${expiryStr} FUT`,
      exchange: 'NFO',
      segment: 'FNO',
      instrumentType: 'FUTURES',
      category: 'NIFTY',
      expiry: currentExpiry,
      lotSize: 25,
      isFeatured: true,
      sortOrder: 1
    });
    
    // NIFTY Next Month Future
    fnoInstruments.push({
      token: `NFO_NIFTY_FUT_${nextExpiryStr}`,
      symbol: `NIFTY${nextExpiryStr}FUT`,
      name: `NIFTY ${nextExpiryStr} FUT`,
      exchange: 'NFO',
      segment: 'FNO',
      instrumentType: 'FUTURES',
      category: 'NIFTY',
      expiry: nextMonthExpiry,
      lotSize: 25,
      sortOrder: 2
    });
    
    // NIFTY Options (CE and PE)
    niftyStrikes.forEach((strike, idx) => {
      // Call Option
      fnoInstruments.push({
        token: `NFO_NIFTY_${strike}CE_${expiryStr}`,
        symbol: `NIFTY${expiryStr}${strike}CE`,
        name: `NIFTY ${expiryStr} ${strike} CE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'CE',
        strike: strike,
        category: 'NIFTY',
        expiry: currentExpiry,
        lotSize: 25,
        sortOrder: 10 + idx
      });
      
      // Put Option
      fnoInstruments.push({
        token: `NFO_NIFTY_${strike}PE_${expiryStr}`,
        symbol: `NIFTY${expiryStr}${strike}PE`,
        name: `NIFTY ${expiryStr} ${strike} PE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'PE',
        strike: strike,
        category: 'NIFTY',
        expiry: currentExpiry,
        lotSize: 25,
        sortOrder: 30 + idx
      });
    });
    
    // BANKNIFTY Futures
    fnoInstruments.push({
      token: `NFO_BANKNIFTY_FUT_${expiryStr}`,
      symbol: `BANKNIFTY${expiryStr}FUT`,
      name: `BANKNIFTY ${expiryStr} FUT`,
      exchange: 'NFO',
      segment: 'FNO',
      instrumentType: 'FUTURES',
      category: 'BANKNIFTY',
      expiry: currentExpiry,
      lotSize: 15,
      isFeatured: true,
      sortOrder: 1
    });
    
    // BANKNIFTY Next Month Future
    fnoInstruments.push({
      token: `NFO_BANKNIFTY_FUT_${nextExpiryStr}`,
      symbol: `BANKNIFTY${nextExpiryStr}FUT`,
      name: `BANKNIFTY ${nextExpiryStr} FUT`,
      exchange: 'NFO',
      segment: 'FNO',
      instrumentType: 'FUTURES',
      category: 'BANKNIFTY',
      expiry: nextMonthExpiry,
      lotSize: 15,
      sortOrder: 2
    });
    
    // BANKNIFTY Options (CE and PE)
    bankniftyStrikes.forEach((strike, idx) => {
      // Call Option
      fnoInstruments.push({
        token: `NFO_BANKNIFTY_${strike}CE_${expiryStr}`,
        symbol: `BANKNIFTY${expiryStr}${strike}CE`,
        name: `BANKNIFTY ${expiryStr} ${strike} CE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'CE',
        strike: strike,
        category: 'BANKNIFTY',
        expiry: currentExpiry,
        lotSize: 15,
        sortOrder: 10 + idx
      });
      
      // Put Option
      fnoInstruments.push({
        token: `NFO_BANKNIFTY_${strike}PE_${expiryStr}`,
        symbol: `BANKNIFTY${expiryStr}${strike}PE`,
        name: `BANKNIFTY ${expiryStr} ${strike} PE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'PE',
        strike: strike,
        category: 'BANKNIFTY',
        expiry: currentExpiry,
        lotSize: 15,
        sortOrder: 30 + idx
      });
    });
    
    // FINNIFTY Futures and Options
    const finniftyStrikes = [24000, 24100, 24200, 24300, 24400, 24500, 24600, 24700, 24800, 24900];
    
    fnoInstruments.push({
      token: `NFO_FINNIFTY_FUT_${expiryStr}`,
      symbol: `FINNIFTY${expiryStr}FUT`,
      name: `FINNIFTY ${expiryStr} FUT`,
      exchange: 'NFO',
      segment: 'FNO',
      instrumentType: 'FUTURES',
      category: 'FINNIFTY',
      expiry: currentExpiry,
      lotSize: 25,
      isFeatured: true,
      sortOrder: 1
    });
    
    finniftyStrikes.forEach((strike, idx) => {
      fnoInstruments.push({
        token: `NFO_FINNIFTY_${strike}CE_${expiryStr}`,
        symbol: `FINNIFTY${expiryStr}${strike}CE`,
        name: `FINNIFTY ${expiryStr} ${strike} CE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'CE',
        strike: strike,
        category: 'FINNIFTY',
        expiry: currentExpiry,
        lotSize: 25,
        sortOrder: 10 + idx
      });
      
      fnoInstruments.push({
        token: `NFO_FINNIFTY_${strike}PE_${expiryStr}`,
        symbol: `FINNIFTY${expiryStr}${strike}PE`,
        name: `FINNIFTY ${expiryStr} ${strike} PE`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'OPTIONS',
        optionType: 'PE',
        strike: strike,
        category: 'FINNIFTY',
        expiry: currentExpiry,
        lotSize: 25,
        sortOrder: 30 + idx
      });
    });
    
    let added = 0;
    let skipped = 0;
    
    for (const inst of fnoInstruments) {
      const exists = await Instrument.findOne({ token: inst.token });
      if (!exists) {
        await Instrument.create(inst);
        added++;
      } else {
        skipped++;
      }
    }
    
    res.json({ 
      message: `Seeded F&O instruments: ${added} added, ${skipped} already existed`,
      added,
      skipped,
      expiry: expiryStr,
      nextExpiry: nextExpiryStr,
      totalInstruments: fnoInstruments.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sync F&O instruments with real Angel One tokens
router.post('/admin/sync-fno-tokens', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    const axiosLib = (await import('axios')).default;
    
    // Get Angel One session
    const statusRes = await axiosLib.get('http://localhost:5001/api/angelone/status');
    if (!statusRes.data.connected) {
      return res.status(400).json({ message: 'Angel One not connected. Please login first.' });
    }
    
    // Current expiry - find next Thursday
    const getNextThursday = () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
      const nextThurs = new Date(today);
      nextThurs.setDate(today.getDate() + daysUntilThursday);
      return nextThurs;
    };
    
    const expiry = getNextThursday();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const expiryStr = `${expiry.getDate()}${months[expiry.getMonth()]}${expiry.getFullYear().toString().slice(-2)}`;
    
    // Delete old F&O instruments
    await Instrument.deleteMany({ segment: 'FNO' });
    
    // NIFTY strikes around current price (~26250)
    const niftyStrikes = [25800, 25900, 26000, 26100, 26200, 26300, 26400, 26500, 26600, 26700];
    // BANKNIFTY strikes around current price (~60000)
    const bankniftyStrikes = [59000, 59500, 60000, 60500, 61000];
    
    const fnoInstruments = [];
    
    // Helper to search Angel One for token
    const searchToken = async (query) => {
      try {
        const { data } = await axiosLib.get(`http://localhost:5001/api/angelone/search?query=${query}&exchange=NFO`);
        if (Array.isArray(data) && data.length > 0) {
          const match = data.find(d => d.tradingsymbol === query);
          return match ? match.symboltoken : (data[0]?.symboltoken || null);
        }
        return null;
      } catch (e) {
        return null;
      }
    };
    
    // NIFTY Future
    const niftyFutSymbol = `NIFTY${expiryStr}FUT`;
    const niftyFutToken = await searchToken(niftyFutSymbol);
    if (niftyFutToken) {
      fnoInstruments.push({
        token: niftyFutToken,
        symbol: niftyFutSymbol,
        name: `NIFTY ${expiryStr} FUT`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'FUTURES',
        category: 'NIFTY',
        expiry: expiry,
        lotSize: 25,
        isFeatured: true,
        sortOrder: 1
      });
    }
    
    // NIFTY Options
    for (const strike of niftyStrikes) {
      // CE
      const ceSymbol = `NIFTY${expiryStr}${strike}CE`;
      const ceToken = await searchToken(ceSymbol);
      if (ceToken) {
        fnoInstruments.push({
          token: ceToken,
          symbol: ceSymbol,
          name: `NIFTY ${expiryStr} ${strike} CE`,
          exchange: 'NFO',
          segment: 'FNO',
          instrumentType: 'OPTIONS',
          optionType: 'CE',
          strike: strike,
          category: 'NIFTY',
          expiry: expiry,
          lotSize: 25,
          sortOrder: 10 + niftyStrikes.indexOf(strike)
        });
      }
      
      // PE
      const peSymbol = `NIFTY${expiryStr}${strike}PE`;
      const peToken = await searchToken(peSymbol);
      if (peToken) {
        fnoInstruments.push({
          token: peToken,
          symbol: peSymbol,
          name: `NIFTY ${expiryStr} ${strike} PE`,
          exchange: 'NFO',
          segment: 'FNO',
          instrumentType: 'OPTIONS',
          optionType: 'PE',
          strike: strike,
          category: 'NIFTY',
          expiry: expiry,
          lotSize: 25,
          sortOrder: 30 + niftyStrikes.indexOf(strike)
        });
      }
    }
    
    // BANKNIFTY Future
    const bnFutSymbol = `BANKNIFTY${expiryStr}FUT`;
    const bnFutToken = await searchToken(bnFutSymbol);
    if (bnFutToken) {
      fnoInstruments.push({
        token: bnFutToken,
        symbol: bnFutSymbol,
        name: `BANKNIFTY ${expiryStr} FUT`,
        exchange: 'NFO',
        segment: 'FNO',
        instrumentType: 'FUTURES',
        category: 'BANKNIFTY',
        expiry: expiry,
        lotSize: 15,
        isFeatured: true,
        sortOrder: 1
      });
    }
    
    // BANKNIFTY Options
    for (const strike of bankniftyStrikes) {
      const ceSymbol = `BANKNIFTY${expiryStr}${strike}CE`;
      const ceToken = await searchToken(ceSymbol);
      if (ceToken) {
        fnoInstruments.push({
          token: ceToken,
          symbol: ceSymbol,
          name: `BANKNIFTY ${expiryStr} ${strike} CE`,
          exchange: 'NFO',
          segment: 'FNO',
          instrumentType: 'OPTIONS',
          optionType: 'CE',
          strike: strike,
          category: 'BANKNIFTY',
          expiry: expiry,
          lotSize: 15,
          sortOrder: 10 + bankniftyStrikes.indexOf(strike)
        });
      }
      
      const peSymbol = `BANKNIFTY${expiryStr}${strike}PE`;
      const peToken = await searchToken(peSymbol);
      if (peToken) {
        fnoInstruments.push({
          token: peToken,
          symbol: peSymbol,
          name: `BANKNIFTY ${expiryStr} ${strike} PE`,
          exchange: 'NFO',
          segment: 'FNO',
          instrumentType: 'OPTIONS',
          optionType: 'PE',
          strike: strike,
          category: 'BANKNIFTY',
          expiry: expiry,
          lotSize: 15,
          sortOrder: 30 + bankniftyStrikes.indexOf(strike)
        });
      }
    }
    
    // Insert all instruments
    let added = 0;
    for (const inst of fnoInstruments) {
      try {
        await Instrument.create(inst);
        added++;
      } catch (e) {
        console.error('Error adding instrument:', inst.symbol, e.message);
      }
    }
    
    res.json({
      message: `Synced F&O instruments with real Angel One tokens`,
      expiry: expiryStr,
      added,
      totalSearched: niftyStrikes.length * 2 + bankniftyStrikes.length * 2 + 2
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== SEED CRYPTO INSTRUMENTS ====================

router.post('/admin/seed-crypto', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    // Popular crypto instruments
    const cryptoInstruments = [
      { symbol: 'BTC', name: 'Bitcoin', pair: 'BTCUSDT', lotSize: 0.001 },
      { symbol: 'ETH', name: 'Ethereum', pair: 'ETHUSDT', lotSize: 0.01 },
      { symbol: 'BNB', name: 'Binance Coin', pair: 'BNBUSDT', lotSize: 0.1 },
      { symbol: 'XRP', name: 'Ripple', pair: 'XRPUSDT', lotSize: 10 },
      { symbol: 'ADA', name: 'Cardano', pair: 'ADAUSDT', lotSize: 10 },
      { symbol: 'DOGE', name: 'Dogecoin', pair: 'DOGEUSDT', lotSize: 100 },
      { symbol: 'SOL', name: 'Solana', pair: 'SOLUSDT', lotSize: 0.1 },
      { symbol: 'DOT', name: 'Polkadot', pair: 'DOTUSDT', lotSize: 1 },
      { symbol: 'MATIC', name: 'Polygon', pair: 'MATICUSDT', lotSize: 10 },
      { symbol: 'LTC', name: 'Litecoin', pair: 'LTCUSDT', lotSize: 0.1 },
      { symbol: 'AVAX', name: 'Avalanche', pair: 'AVAXUSDT', lotSize: 0.1 },
      { symbol: 'LINK', name: 'Chainlink', pair: 'LINKUSDT', lotSize: 1 },
      { symbol: 'ATOM', name: 'Cosmos', pair: 'ATOMUSDT', lotSize: 1 },
      { symbol: 'UNI', name: 'Uniswap', pair: 'UNIUSDT', lotSize: 1 },
      { symbol: 'XLM', name: 'Stellar', pair: 'XLMUSDT', lotSize: 100 },
      { symbol: 'SHIB', name: 'Shiba Inu', pair: 'SHIBUSDT', lotSize: 1000000 },
      { symbol: 'TRX', name: 'TRON', pair: 'TRXUSDT', lotSize: 100 },
      { symbol: 'ETC', name: 'Ethereum Classic', pair: 'ETCUSDT', lotSize: 1 },
      { symbol: 'NEAR', name: 'NEAR Protocol', pair: 'NEARUSDT', lotSize: 1 },
      { symbol: 'APT', name: 'Aptos', pair: 'APTUSDT', lotSize: 1 }
    ];

    let added = 0;
    let updated = 0;

    for (const crypto of cryptoInstruments) {
      const existing = await Instrument.findOne({ symbol: crypto.symbol, exchange: 'BINANCE' });
      
      if (existing) {
        await Instrument.updateOne(
          { _id: existing._id },
          { 
            $set: { 
              name: crypto.name,
              pair: crypto.pair,
              lotSize: crypto.lotSize,
              isEnabled: true,
              isCrypto: true
            }
          }
        );
        updated++;
      } else {
        await Instrument.create({
          symbol: crypto.symbol,
          name: crypto.name,
          exchange: 'BINANCE',
          token: crypto.pair,
          pair: crypto.pair,
          segment: 'CRYPTO',
          category: 'CRYPTO',
          instrumentType: 'CRYPTO',
          lotSize: crypto.lotSize,
          tickSize: 0.01,
          isEnabled: true,
          isFeatured: false,
          isCrypto: true
        });
        added++;
      }
    }

    res.json({
      message: 'Crypto instruments seeded successfully',
      added,
      updated,
      total: cryptoInstruments.length
    });
  } catch (error) {
    console.error('Seed crypto error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== WEBSOCKET STATUS ====================

router.get('/websocket/status', protectAdmin, (req, res) => {
  res.json(marketDataService.getStatus());
});

router.post('/websocket/connect', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    // Get session from angelone routes
    const { feedToken, clientCode, apiKey } = req.body;
    
    if (feedToken) {
      marketDataService.init(feedToken, clientCode, apiKey);
      marketDataService.connect();
      res.json({ message: 'WebSocket connection initiated' });
    } else {
      res.status(400).json({ message: 'Feed token required' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/websocket/subscribe', protectAdmin, async (req, res) => {
  try {
    const { tokens } = req.body;
    marketDataService.subscribeTokens(tokens);
    res.json({ message: `Subscribed to ${tokens.length} tokens` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
