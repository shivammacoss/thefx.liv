import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { protectAdmin, superAdminOnly } from '../middleware/auth.js';
import { connectTicker, subscribeTokens, getMarketData, getTickerStatus, disconnectTicker } from '../services/zerodhaWebSocket.js';

const router = express.Router();

// Socket.IO instance (set from index.js)
let io = null;
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Zerodha session storage
let zerodhaSession = {
  accessToken: null,
  publicToken: null,
  userId: null,
  expiresAt: null
};

// Get Zerodha connection status
router.get('/status', (req, res) => {
  res.json({
    connected: !!zerodhaSession.accessToken,
    userId: zerodhaSession.userId,
    expiresAt: zerodhaSession.expiresAt
  });
});

// Get Kite login URL - redirect user to Zerodha for authentication
router.get('/login-url', protectAdmin, superAdminOnly, (req, res) => {
  try {
    const apiKey = process.env.ZERODHA_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ message: 'Zerodha API Key not configured in .env' });
    }
    
    // Kite Connect login URL
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
    
    res.json({ 
      loginUrl,
      redirectUrl: `${process.env.SERVER_URL || 'http://localhost:5001'}/api/zerodha/callback`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Callback URL - Zerodha redirects here after login
router.get('/callback', async (req, res) => {
  try {
    const { request_token, status } = req.query;
    
    if (status === 'cancelled') {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=cancelled`);
    }
    
    if (!request_token) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=error&message=No request token`);
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    const apiSecret = process.env.ZERODHA_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=error&message=API credentials not configured`);
    }
    
    // Generate checksum: SHA256(api_key + request_token + api_secret)
    const checksum = crypto
      .createHash('sha256')
      .update(apiKey + request_token + apiSecret)
      .digest('hex');
    
    // Exchange request token for access token
    const response = await axios.post(
      'https://api.kite.trade/session/token',
      new URLSearchParams({
        api_key: apiKey,
        request_token: request_token,
        checksum: checksum
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Kite-Version': '3'
        }
      }
    );
    
    if (response.data.status === 'success' && response.data.data) {
      zerodhaSession = {
        accessToken: response.data.data.access_token,
        publicToken: response.data.data.public_token,
        userId: response.data.data.user_id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Token valid for 1 day
      };
      
      console.log('Zerodha login successful:', zerodhaSession.userId);
      
      // Start WebSocket ticker for real-time data
      try {
        const Instrument = (await import('../models/Instrument.js')).default;
        const instruments = await Instrument.find({ isEnabled: true }).select('token').lean();
        const tokens = instruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
        
        connectTicker(apiKey, zerodhaSession.accessToken, tokens);
        console.log(`WebSocket ticker started with ${tokens.length} instruments`);
      } catch (wsError) {
        console.error('Failed to start WebSocket ticker:', wsError.message);
      }
      
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=success`);
    } else {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=error&message=${encodeURIComponent(response.data.message || 'Login failed')}`);
    }
  } catch (error) {
    console.error('Zerodha callback error:', error.response?.data || error.message);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/market-control?zerodha=error&message=${encodeURIComponent(error.response?.data?.message || error.message)}`);
  }
});

// Logout / Invalidate session
router.post('/logout', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (zerodhaSession.accessToken) {
      const apiKey = process.env.ZERODHA_API_KEY;
      
      // Invalidate session on Zerodha
      try {
        await axios.delete(
          `https://api.kite.trade/session/token?api_key=${apiKey}&access_token=${zerodhaSession.accessToken}`,
          {
            headers: {
              'X-Kite-Version': '3',
              'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
            }
          }
        );
      } catch (e) {
        // Ignore logout errors
      }
    }
    
    zerodhaSession = {
      accessToken: null,
      publicToken: null,
      userId: null,
      expiresAt: null
    };
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get market data - returns WebSocket data if available, otherwise fetches from API
router.get('/market-data', async (req, res) => {
  try {
    // First check if we have WebSocket data
    const wsData = getMarketData();
    const wsDataCount = Object.keys(wsData).length;
    
    // If we have WebSocket data, return it
    if (wsDataCount > 0) {
      console.log(`Returning ${wsDataCount} WebSocket market data entries`);
      return res.json(wsData);
    }
    
    console.log('No WebSocket data, trying REST API fallback...');
    
    if (!zerodhaSession.accessToken) {
      // Return empty data instead of 401 so dashboard doesn't show errors
      console.log('No Zerodha session, returning empty data');
      return res.json({});
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // Get instruments from database
    const Instrument = (await import('../models/Instrument.js')).default;
    const dbInstruments = await Instrument.find({ isEnabled: true }).select('token symbol exchange').lean();
    
    // Create a map of symbol to database token for matching
    const symbolToDbToken = {};
    for (const inst of dbInstruments) {
      if (inst.symbol) {
        const key = `${inst.exchange}:${inst.symbol}`;
        symbolToDbToken[key] = inst.token;
      }
    }
    
    // Build instrument list for Zerodha (format: EXCHANGE:TRADINGSYMBOL)
    const instruments = dbInstruments
      .filter(i => i.symbol)
      .map(i => `${i.exchange}:${i.symbol}`)
      .slice(0, 500); // Zerodha limit
    
    if (instruments.length === 0) {
      return res.json({});
    }
    
    // Fetch quotes via REST API (fallback when WebSocket not connected)
    const response = await axios.get(
      `https://api.kite.trade/quote?${instruments.map(i => `i=${i}`).join('&')}`,
      {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
        }
      }
    );
    
    if (response.data.status === 'success' && response.data.data) {
      const marketData = {};
      
      for (const [key, quote] of Object.entries(response.data.data)) {
        // Use database token as key so frontend can match
        const dbToken = symbolToDbToken[key];
        const zerodhaToken = quote.instrument_token?.toString();
        const tokenKey = dbToken || zerodhaToken;
        
        if (tokenKey) {
          marketData[tokenKey] = {
            symbol: quote.tradingsymbol,
            token: tokenKey,
            zerodhaToken: zerodhaToken,
            exchange: key.split(':')[0],
            ltp: quote.last_price,
            open: quote.ohlc?.open,
            high: quote.ohlc?.high,
            low: quote.ohlc?.low,
            close: quote.ohlc?.close,
            change: quote.net_change,
            changePercent: quote.net_change && quote.ohlc?.close ? 
              ((quote.net_change / quote.ohlc.close) * 100).toFixed(2) : 0,
            volume: quote.volume,
            lastUpdated: new Date()
          };
        }
      }
      
      res.json(marketData);
    } else {
      res.status(400).json({ message: response.data.message || 'Failed to fetch market data' });
    }
  } catch (error) {
    console.error('Zerodha market data error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Get LTP for specific instruments
router.post('/ltp', async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha' });
    }
    
    const { instruments } = req.body; // Array of "EXCHANGE:SYMBOL"
    
    if (!instruments || !Array.isArray(instruments) || instruments.length === 0) {
      return res.status(400).json({ message: 'Instruments array required' });
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    const response = await axios.get(
      `https://api.kite.trade/quote/ltp?${instruments.map(i => `i=${i}`).join('&')}`,
      {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
        }
      }
    );
    
    if (response.data.status === 'success') {
      res.json(response.data.data);
    } else {
      res.status(400).json({ message: response.data.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Download and sync instruments from Zerodha
router.post('/sync-instruments', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha' });
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // Download instruments CSV
    const response = await axios.get(
      'https://api.kite.trade/instruments',
      {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
        }
      }
    );
    
    // Parse CSV
    const lines = response.data.split('\n');
    const headers = lines[0].split(',');
    
    const instruments = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const inst = {};
      headers.forEach((h, idx) => {
        inst[h.trim()] = values[idx]?.trim();
      });
      instruments.push(inst);
    }
    
    // Filter for NFO (F&O) and NSE equity
    const nfoInstruments = instruments.filter(i => 
      i.exchange === 'NFO' && 
      (i.instrument_type === 'FUT' || i.instrument_type === 'CE' || i.instrument_type === 'PE') &&
      (i.name === 'NIFTY' || i.name === 'BANKNIFTY' || i.name === 'FINNIFTY')
    );
    
    const nseEquity = instruments.filter(i => 
      i.exchange === 'NSE' && 
      i.segment === 'NSE' &&
      i.instrument_type === 'EQ'
    );
    
    // Filter for MCX commodities
    const mcxInstruments = instruments.filter(i => 
      i.exchange === 'MCX' && 
      i.instrument_type === 'FUT'
    );
    
    res.json({
      message: 'Instruments fetched successfully',
      total: instruments.length,
      nfo: nfoInstruments.length,
      nseEquity: nseEquity.length,
      mcx: mcxInstruments.length,
      sample: {
        nfo: nfoInstruments.slice(0, 5),
        equity: nseEquity.slice(0, 5),
        mcx: mcxInstruments.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Sync instruments error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Get historical data for charts
router.get('/historical/:instrumentToken', async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.json([]); // Return empty array instead of error
    }
    
    const { instrumentToken } = req.params;
    const { interval } = req.query;
    
    // Map frontend interval to Zerodha interval
    const intervalMap = {
      'ONE_MINUTE': 'minute',
      'FIVE_MINUTE': '5minute',
      'FIFTEEN_MINUTE': '15minute',
      'THIRTY_MINUTE': '30minute',
      'ONE_HOUR': '60minute',
      'ONE_DAY': 'day'
    };
    
    const zerodhaInterval = intervalMap[interval] || '15minute';
    
    // Calculate date range (last 30 days for intraday, 1 year for daily)
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const fromDate = new Date();
    if (zerodhaInterval === 'day') {
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else {
      fromDate.setDate(fromDate.getDate() - 30);
    }
    const from = fromDate.toISOString().split('T')[0];
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    const response = await axios.get(
      `https://api.kite.trade/instruments/historical/${instrumentToken}/${zerodhaInterval}?from=${from}&to=${to}`,
      {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
        }
      }
    );
    
    if (response.data.status === 'success' && response.data.data?.candles) {
      // Convert Zerodha format to lightweight-charts format
      const candles = response.data.data.candles.map(c => ({
        time: Math.floor(new Date(c[0]).getTime() / 1000),
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }));
      res.json(candles);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Historical data error:', error.response?.data || error.message);
    res.json([]); // Return empty array on error
  }
});

// Seed MCX instruments with real Zerodha tokens
router.post('/seed-mcx', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha. Please connect first.' });
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // Download instruments CSV from Zerodha
    const response = await axios.get(
      'https://api.kite.trade/instruments',
      {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
        }
      }
    );
    
    // Parse CSV
    const lines = response.data.split('\n');
    const headers = lines[0].split(',');
    
    const allInstruments = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const inst = {};
      headers.forEach((h, idx) => {
        inst[h.trim()] = values[idx]?.trim();
      });
      allInstruments.push(inst);
    }
    
    // Filter MCX futures - get current month contracts
    const mcxFutures = allInstruments.filter(i => 
      i.exchange === 'MCX' && 
      i.instrument_type === 'FUT'
    );
    
    // Group by tradingsymbol base (GOLD, SILVER, CRUDEOIL, etc.)
    const mcxSymbols = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'CRUDEOILM', 'NATURALGAS', 'COPPER', 'ZINC', 'ALUMINIUM', 'LEAD', 'NICKEL'];
    
    const Instrument = (await import('../models/Instrument.js')).default;
    let added = 0;
    let updated = 0;
    
    for (const baseSymbol of mcxSymbols) {
      // Find the nearest expiry contract for this symbol
      const contracts = mcxFutures.filter(i => 
        i.tradingsymbol && i.tradingsymbol.startsWith(baseSymbol) && 
        !i.tradingsymbol.includes('MINI') // Avoid duplicates
      ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
      
      if (contracts.length > 0) {
        const contract = contracts[0]; // Nearest expiry
        
        // Check if exists in database by symbol OR by token
        const existingBySymbol = await Instrument.findOne({ symbol: baseSymbol, exchange: 'MCX' });
        const existingByToken = await Instrument.findOne({ token: contract.instrument_token });
        
        const instrumentData = {
          token: contract.instrument_token,
          symbol: baseSymbol,
          name: contract.name || baseSymbol,
          exchange: 'MCX',
          segment: 'MCX',
          instrumentType: 'FUTURES',
          category: 'MCX',
          lotSize: parseInt(contract.lot_size) || 1,
          tickSize: parseFloat(contract.tick_size) || 1,
          expiry: contract.expiry ? new Date(contract.expiry) : null,
          tradingSymbol: contract.tradingsymbol,
          isEnabled: true,
          isFeatured: ['GOLD', 'GOLDM', 'SILVER', 'CRUDEOIL'].includes(baseSymbol)
        };
        
        try {
          if (existingBySymbol) {
            // Update existing by symbol
            await Instrument.findByIdAndUpdate(existingBySymbol._id, instrumentData);
            updated++;
          } else if (existingByToken) {
            // Token exists but different symbol - update it
            await Instrument.findByIdAndUpdate(existingByToken._id, instrumentData);
            updated++;
          } else {
            // Create new
            await Instrument.create(instrumentData);
            added++;
          }
        } catch (dupError) {
          // Handle duplicate key error - try to update instead
          if (dupError.code === 11000) {
            const existingAny = await Instrument.findOne({ 
              $or: [{ token: contract.instrument_token }, { symbol: baseSymbol, exchange: 'MCX' }]
            });
            if (existingAny) {
              await Instrument.findByIdAndUpdate(existingAny._id, { ...instrumentData, token: existingAny.token });
              updated++;
            }
          } else {
            console.error(`Error seeding ${baseSymbol}:`, dupError.message);
          }
        }
      }
    }
    
    // Subscribe to new MCX tokens
    const mcxInstruments = await Instrument.find({ exchange: 'MCX', isEnabled: true }).select('token').lean();
    const tokens = mcxInstruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    if (tokens.length > 0) {
      subscribeTokens(tokens);
    }
    
    res.json({
      message: `MCX instruments seeded: ${added} added, ${updated} updated`,
      added,
      updated,
      subscribedTokens: tokens.length
    });
  } catch (error) {
    console.error('Seed MCX error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Subscribe to all enabled instruments
router.post('/subscribe-all', protectAdmin, async (req, res) => {
  try {
    const Instrument = (await import('../models/Instrument.js')).default;
    const instruments = await Instrument.find({ isEnabled: true }).select('token exchange').lean();
    const tokens = instruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    if (tokens.length > 0) {
      subscribeTokens(tokens);
      res.json({ message: `Subscribed to ${tokens.length} instruments`, tokens: tokens.length });
    } else {
      res.json({ message: 'No instruments to subscribe', tokens: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
