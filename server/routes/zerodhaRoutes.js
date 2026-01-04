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
    
    let { instrumentToken } = req.params;
    const { interval, symbol, exchange } = req.query;
    
    // If token is not numeric, try to find it from database
    if (isNaN(parseInt(instrumentToken))) {
      const Instrument = (await import('../models/Instrument.js')).default;
      const inst = await Instrument.findOne({ 
        $or: [
          { symbol: instrumentToken },
          { symbol: symbol },
          { tradingSymbol: instrumentToken }
        ]
      });
      if (inst) {
        instrumentToken = inst.token;
      } else {
        return res.json([]);
      }
    }
    
    // Map frontend interval to Zerodha interval
    const intervalMap = {
      'ONE_MINUTE': 'minute',
      'FIVE_MINUTE': '5minute',
      'FIFTEEN_MINUTE': '15minute',
      'THIRTY_MINUTE': '30minute',
      'ONE_HOUR': '60minute',
      'ONE_DAY': 'day',
      '1': 'minute',
      '5': '5minute',
      '15': '15minute',
      '30': '30minute',
      '60': '60minute',
      'D': 'day',
      '1D': 'day'
    };
    
    const zerodhaInterval = intervalMap[interval] || '15minute';
    
    // Calculate date range based on interval
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const fromDate = new Date();
    
    if (zerodhaInterval === 'day') {
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else if (zerodhaInterval === 'minute') {
      fromDate.setDate(fromDate.getDate() - 5); // 5 days for 1-min
    } else if (zerodhaInterval === '5minute') {
      fromDate.setDate(fromDate.getDate() - 15); // 15 days for 5-min
    } else if (zerodhaInterval === '15minute') {
      fromDate.setDate(fromDate.getDate() - 30); // 30 days for 15-min
    } else if (zerodhaInterval === '30minute' || zerodhaInterval === '60minute') {
      fromDate.setDate(fromDate.getDate() - 60); // 60 days for 30/60-min
    } else {
      fromDate.setDate(fromDate.getDate() - 30);
    }
    const from = fromDate.toISOString().split('T')[0];
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    console.log(`Fetching historical data for token ${instrumentToken}, interval ${zerodhaInterval}, from ${from} to ${to}`);
    
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
      console.log(`Returning ${candles.length} candles for ${instrumentToken}`);
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

// Sync ALL instruments from Zerodha and save to database
router.post('/sync-all-instruments', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha. Please connect first.' });
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // Download instruments CSV from Zerodha
    console.log('Downloading instruments from Zerodha...');
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
    
    console.log(`Total instruments from Zerodha: ${allInstruments.length}`);
    
    const Instrument = (await import('../models/Instrument.js')).default;
    
    let added = 0;
    let updated = 0;
    let errors = 0;
    
    // 1. NSE Equity (Stocks) - Top 200 by volume/popularity
    const nseEquity = allInstruments.filter(i => 
      i.exchange === 'NSE' && 
      i.segment === 'NSE' &&
      i.instrument_type === 'EQ'
    );
    
    // Popular stocks list (Nifty 50 + Nifty Next 50 + popular ones)
    const popularStocks = [
      'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 'BHARTIARTL',
      'KOTAKBANK', 'ITC', 'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN', 'BAJFINANCE',
      'SUNPHARMA', 'ULTRACEMCO', 'NESTLEIND', 'WIPRO', 'HCLTECH', 'TATAMOTORS', 'POWERGRID',
      'NTPC', 'ONGC', 'JSWSTEEL', 'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'COALINDIA',
      'BAJAJFINSV', 'TECHM', 'GRASIM', 'INDUSINDBK', 'HINDALCO', 'DRREDDY', 'CIPLA',
      'EICHERMOT', 'DIVISLAB', 'BPCL', 'BRITANNIA', 'HEROMOTOCO', 'APOLLOHOSP', 'SBILIFE',
      'HDFCLIFE', 'TATACONSUM', 'UPL', 'SHREECEM', 'BAJAJ-AUTO', 'M&M',
      // Additional popular stocks
      'ZOMATO', 'PAYTM', 'NYKAA', 'DELHIVERY', 'IRCTC', 'TATAELXSI', 'PERSISTENT',
      'COFORGE', 'MPHASIS', 'LTIM', 'PIIND', 'AARTIIND', 'DEEPAKNTR', 'NAVINFLUOR',
      'AUROPHARMA', 'BIOCON', 'LUPIN', 'TORNTPHARM', 'ALKEM', 'IPCALAB',
      'BANKBARODA', 'PNB', 'CANBK', 'UNIONBANK', 'IOB', 'FEDERALBNK', 'IDFCFIRSTB',
      'VEDL', 'NMDC', 'SAIL', 'JINDALSTEL', 'NATIONALUM', 'HINDZINC',
      'TATAPOWER', 'ADANIGREEN', 'ADANIPOWER', 'NHPC', 'SJVN', 'IRFC',
      'HAL', 'BEL', 'BHEL', 'L&TFH', 'RECLTD', 'PFC',
      'INDIGO', 'TRENT', 'DMART', 'PAGEIND', 'MANYAVAR', 'ABFRL',
      'PIDILITIND', 'BERGEPAINT', 'KANSAINER', 'AKZONOBEL',
      'GODREJCP', 'DABUR', 'MARICO', 'COLPAL', 'EMAMILTD',
      'HAVELLS', 'VOLTAS', 'BLUESTARCO', 'CROMPTON', 'ORIENTELEC',
      'POLYCAB', 'KEI', 'FINOLEX', 'AMBER',
      'DLF', 'GODREJPROP', 'OBEROIRLTY', 'PRESTIGE', 'BRIGADE', 'SOBHA',
      'ZYDUSLIFE', 'GLENMARK', 'NATCOPHARM', 'LAURUSLABS', 'GRANULES'
    ];
    
    for (const stock of nseEquity) {
      if (popularStocks.includes(stock.tradingsymbol)) {
        try {
          const existing = await Instrument.findOne({ token: stock.instrument_token });
          const instrumentData = {
            token: stock.instrument_token,
            symbol: stock.tradingsymbol,
            name: stock.name || stock.tradingsymbol,
            exchange: 'NSE',
            segment: 'EQUITY',
            instrumentType: 'STOCK',
            category: 'STOCKS',
            lotSize: parseInt(stock.lot_size) || 1,
            tickSize: parseFloat(stock.tick_size) || 0.05,
            isEnabled: true,
            isFeatured: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'].includes(stock.tradingsymbol)
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
        } catch (e) {
          errors++;
        }
      }
    }
    
    // 2. NSE Indices
    const indices = allInstruments.filter(i => 
      i.exchange === 'NSE' && i.segment === 'INDICES'
    );
    
    const popularIndices = ['NIFTY 50', 'NIFTY BANK', 'NIFTY FIN SERVICE', 'NIFTY MIDCAP 50', 'NIFTY IT', 'INDIA VIX'];
    
    for (const idx of indices) {
      if (popularIndices.includes(idx.tradingsymbol)) {
        try {
          const existing = await Instrument.findOne({ token: idx.instrument_token });
          const instrumentData = {
            token: idx.instrument_token,
            symbol: idx.tradingsymbol.replace(' ', ''),
            name: idx.tradingsymbol,
            exchange: 'NSE',
            segment: 'EQUITY',
            instrumentType: 'INDEX',
            category: 'INDICES',
            lotSize: 1,
            isEnabled: true,
            isFeatured: true
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
        } catch (e) {
          errors++;
        }
      }
    }
    
    // 3. NFO - Futures and Options (current week + next week expiry)
    const nfoFutures = allInstruments.filter(i => 
      i.exchange === 'NFO' && 
      i.instrument_type === 'FUT' &&
      (i.name === 'NIFTY' || i.name === 'BANKNIFTY' || i.name === 'FINNIFTY')
    );
    
    // Get nearest 2 expiries for futures
    const sortedFutures = nfoFutures.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    const nearestFutures = sortedFutures.slice(0, 6); // 2 expiries x 3 indices
    
    for (const fut of nearestFutures) {
      try {
        const existing = await Instrument.findOne({ token: fut.instrument_token });
        const instrumentData = {
          token: fut.instrument_token,
          symbol: fut.tradingsymbol,
          name: `${fut.name} FUT`,
          exchange: 'NFO',
          segment: 'FNO',
          instrumentType: 'FUTURES',
          category: fut.name,
          lotSize: parseInt(fut.lot_size) || 25,
          tickSize: parseFloat(fut.tick_size) || 0.05,
          expiry: new Date(fut.expiry),
          tradingSymbol: fut.tradingsymbol,
          isEnabled: true,
          isFeatured: true
        };
        
        if (existing) {
          await Instrument.findByIdAndUpdate(existing._id, instrumentData);
          updated++;
        } else {
          await Instrument.create(instrumentData);
          added++;
        }
      } catch (e) {
        errors++;
      }
    }
    
    // 4. NFO Options - ATM strikes for current week
    const nfoOptions = allInstruments.filter(i => 
      i.exchange === 'NFO' && 
      (i.instrument_type === 'CE' || i.instrument_type === 'PE') &&
      (i.name === 'NIFTY' || i.name === 'BANKNIFTY')
    );
    
    // Get current week expiry options
    const today = new Date();
    const currentWeekOptions = nfoOptions.filter(opt => {
      const expiry = new Date(opt.expiry);
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    });
    
    // NIFTY ATM strikes (around 24000-24500)
    const niftyStrikes = [23500, 23600, 23700, 23800, 23900, 24000, 24100, 24200, 24300, 24400, 24500, 24600, 24700, 24800, 24900, 25000];
    // BANKNIFTY ATM strikes (around 51000-52000)
    const bnStrikes = [50500, 50700, 50900, 51000, 51100, 51300, 51500, 51700, 51900, 52000, 52100, 52300, 52500];
    
    for (const opt of currentWeekOptions) {
      const strike = parseFloat(opt.strike);
      const isNiftyATM = opt.name === 'NIFTY' && niftyStrikes.includes(strike);
      const isBNATM = opt.name === 'BANKNIFTY' && bnStrikes.includes(strike);
      
      if (isNiftyATM || isBNATM) {
        try {
          const existing = await Instrument.findOne({ token: opt.instrument_token });
          const instrumentData = {
            token: opt.instrument_token,
            symbol: opt.tradingsymbol,
            name: `${opt.name} ${strike} ${opt.instrument_type}`,
            exchange: 'NFO',
            segment: 'FNO',
            instrumentType: 'OPTIONS',
            optionType: opt.instrument_type,
            strike: strike,
            category: opt.name,
            lotSize: parseInt(opt.lot_size) || 25,
            tickSize: parseFloat(opt.tick_size) || 0.05,
            expiry: new Date(opt.expiry),
            tradingSymbol: opt.tradingsymbol,
            isEnabled: true
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
        } catch (e) {
          errors++;
        }
      }
    }
    
    // 5. MCX Commodities
    const mcxFutures = allInstruments.filter(i => 
      i.exchange === 'MCX' && i.instrument_type === 'FUT'
    );
    
    const mcxSymbols = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'CRUDEOILM', 'NATURALGAS', 'COPPER', 'ZINC', 'ALUMINIUM', 'LEAD', 'NICKEL'];
    
    for (const baseSymbol of mcxSymbols) {
      const contracts = mcxFutures.filter(i => 
        i.tradingsymbol && i.tradingsymbol.startsWith(baseSymbol)
      ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
      
      if (contracts.length > 0) {
        const contract = contracts[0]; // Nearest expiry
        try {
          const existing = await Instrument.findOne({ symbol: baseSymbol, exchange: 'MCX' });
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
            expiry: new Date(contract.expiry),
            tradingSymbol: contract.tradingsymbol,
            isEnabled: true,
            isFeatured: ['GOLD', 'GOLDM', 'SILVER', 'CRUDEOIL'].includes(baseSymbol)
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
        } catch (e) {
          errors++;
        }
      }
    }
    
    // Subscribe to all new tokens
    const allDbInstruments = await Instrument.find({ isEnabled: true }).select('token').lean();
    const tokens = allDbInstruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    if (tokens.length > 0) {
      subscribeTokens(tokens);
    }
    
    res.json({
      message: `Instruments synced from Zerodha`,
      added,
      updated,
      errors,
      totalInDatabase: await Instrument.countDocuments(),
      subscribedTokens: tokens.length
    });
  } catch (error) {
    console.error('Sync all instruments error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Reset instruments and sync fresh from Zerodha
router.post('/reset-and-sync', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha. Please connect first.' });
    }
    
    const Instrument = (await import('../models/Instrument.js')).default;
    
    // Delete all instruments
    const deleteResult = await Instrument.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} instruments`);
    
    // Now call sync-all-nse logic
    const apiKey = process.env.ZERODHA_API_KEY;
    
    console.log('Downloading ALL instruments from Zerodha...');
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
    
    console.log(`Total instruments from Zerodha: ${allInstruments.length}`);
    
    let added = 0;
    let errors = 0;
    const counts = { nse: 0, nsefo: 0, mcx: 0, bsefo: 0, currency: 0, indices: 0 };
    
    // 1. NSE EQUITY (Stocks)
    const nseEquity = allInstruments.filter(i => 
      i.exchange === 'NSE' && i.segment === 'NSE' && i.instrument_type === 'EQ'
    );
    
    for (const stock of nseEquity) {
      try {
        await Instrument.create({
          token: stock.instrument_token,
          symbol: stock.tradingsymbol,
          name: stock.name || stock.tradingsymbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          displaySegment: 'NSE',
          instrumentType: 'STOCK',
          category: 'STOCKS',
          tradingSymbol: stock.tradingsymbol,
          lotSize: parseInt(stock.lot_size) || 1,
          tickSize: parseFloat(stock.tick_size) || 0.05,
          isEnabled: true,
          isFeatured: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'].includes(stock.tradingsymbol),
          sortOrder: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'].includes(stock.tradingsymbol) ? 1 : 100
        });
        added++;
        counts.nse++;
      } catch (e) { errors++; }
    }
    
    // 2. NSE INDICES
    const indices = allInstruments.filter(i => i.exchange === 'NSE' && i.segment === 'INDICES');
    
    for (const idx of indices) {
      try {
        const isMajorIndex = ['NIFTY 50', 'NIFTY BANK', 'NIFTY FIN SERVICE', 'INDIA VIX'].includes(idx.tradingsymbol);
        await Instrument.create({
          token: idx.instrument_token,
          symbol: idx.tradingsymbol.replace(/ /g, ''),
          name: idx.tradingsymbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          displaySegment: 'NSE',
          instrumentType: 'INDEX',
          category: 'INDICES',
          tradingSymbol: idx.tradingsymbol,
          lotSize: 1,
          isEnabled: true,
          isFeatured: isMajorIndex,
          sortOrder: isMajorIndex ? 0 : 50
        });
        added++;
        counts.indices++;
      } catch (e) { errors++; }
    }
    
    // 3. NSE F&O (Index Futures)
    const nfoFutures = allInstruments.filter(i => 
      i.exchange === 'NFO' && i.instrument_type === 'FUT' && ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(i.name)
    ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    
    const futuresByName = {};
    for (const fut of nfoFutures) {
      if (!futuresByName[fut.name]) futuresByName[fut.name] = [];
      if (futuresByName[fut.name].length < 2) futuresByName[fut.name].push(fut);
    }
    
    for (const [name, futures] of Object.entries(futuresByName)) {
      for (const fut of futures) {
        try {
          await Instrument.create({
            token: fut.instrument_token,
            symbol: fut.tradingsymbol,
            name: `${fut.name} FUT`,
            exchange: 'NFO',
            segment: 'FNO',
            displaySegment: 'NSE F&O',
            instrumentType: 'FUTURES',
            category: fut.name === 'NIFTY' ? 'NIFTY' : fut.name === 'BANKNIFTY' ? 'BANKNIFTY' : 'FINNIFTY',
            tradingSymbol: fut.tradingsymbol,
            lotSize: parseInt(fut.lot_size) || 25,
            tickSize: parseFloat(fut.tick_size) || 0.05,
            expiry: new Date(fut.expiry),
            isEnabled: true,
            isFeatured: true,
            sortOrder: 0
          });
          added++;
          counts.nsefo++;
        } catch (e) { errors++; }
      }
    }
    
    // 4. MCX COMMODITIES
    const mcxFutures = allInstruments.filter(i => i.exchange === 'MCX' && i.instrument_type === 'FUT');
    const mcxBySymbol = {};
    for (const fut of mcxFutures) {
      const baseSymbol = fut.name || fut.tradingsymbol.replace(/\d+[A-Z]+FUT$/, '');
      if (!mcxBySymbol[baseSymbol] || new Date(fut.expiry) < new Date(mcxBySymbol[baseSymbol].expiry)) {
        mcxBySymbol[baseSymbol] = fut;
      }
    }
    
    const mcxPriority = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'NATURALGAS', 'COPPER', 'ZINC', 'ALUMINIUM', 'LEAD', 'NICKEL'];
    
    for (const [baseSymbol, contract] of Object.entries(mcxBySymbol)) {
      try {
        const priorityIndex = mcxPriority.indexOf(baseSymbol);
        await Instrument.create({
          token: contract.instrument_token,
          symbol: baseSymbol,
          name: contract.name || baseSymbol,
          exchange: 'MCX',
          segment: 'MCX',
          displaySegment: 'MCX',
          instrumentType: 'FUTURES',
          category: 'MCX',
          tradingSymbol: contract.tradingsymbol,
          lotSize: parseInt(contract.lot_size) || 1,
          tickSize: parseFloat(contract.tick_size) || 1,
          expiry: new Date(contract.expiry),
          isEnabled: true,
          isFeatured: priorityIndex >= 0 && priorityIndex < 5,
          sortOrder: priorityIndex >= 0 ? priorityIndex : 100
        });
        added++;
        counts.mcx++;
      } catch (e) { errors++; }
    }
    
    // 5. BSE F&O
    const bseFutures = allInstruments.filter(i => 
      i.exchange === 'BFO' && i.instrument_type === 'FUT' && ['SENSEX', 'BANKEX'].includes(i.name)
    ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    
    const bseFuturesByName = {};
    for (const fut of bseFutures) {
      if (!bseFuturesByName[fut.name]) bseFuturesByName[fut.name] = [];
      if (bseFuturesByName[fut.name].length < 2) bseFuturesByName[fut.name].push(fut);
    }
    
    for (const [name, futures] of Object.entries(bseFuturesByName)) {
      for (const fut of futures) {
        try {
          await Instrument.create({
            token: fut.instrument_token,
            symbol: fut.tradingsymbol,
            name: `${fut.name} FUT`,
            exchange: 'BFO',
            segment: 'FNO',
            displaySegment: 'BSE F&O',
            instrumentType: 'FUTURES',
            category: 'BSE',
            tradingSymbol: fut.tradingsymbol,
            lotSize: parseInt(fut.lot_size) || 10,
            tickSize: parseFloat(fut.tick_size) || 0.05,
            expiry: new Date(fut.expiry),
            isEnabled: true,
            isFeatured: true,
            sortOrder: 0
          });
          added++;
          counts.bsefo++;
        } catch (e) { errors++; }
      }
    }
    
    // 6. CURRENCY (CDS)
    const currencyPairs = ['USDINR', 'EURINR', 'GBPINR', 'JPYINR'];
    const cdsFutures = allInstruments.filter(i => i.exchange === 'CDS' && i.instrument_type === 'FUT');
    const cdsBySymbol = {};
    for (const fut of cdsFutures) {
      if (currencyPairs.includes(fut.name)) {
        if (!cdsBySymbol[fut.name] || new Date(fut.expiry) < new Date(cdsBySymbol[fut.name].expiry)) {
          cdsBySymbol[fut.name] = fut;
        }
      }
    }
    
    for (const [baseSymbol, contract] of Object.entries(cdsBySymbol)) {
      try {
        await Instrument.create({
          token: contract.instrument_token,
          symbol: baseSymbol,
          name: baseSymbol,
          exchange: 'CDS',
          segment: 'CURRENCY',
          displaySegment: 'Currency',
          instrumentType: 'FUTURES',
          category: 'CURRENCY',
          tradingSymbol: contract.tradingsymbol,
          lotSize: parseInt(contract.lot_size) || 1,
          tickSize: parseFloat(contract.tick_size) || 0.0025,
          expiry: new Date(contract.expiry),
          isEnabled: true,
          isFeatured: baseSymbol === 'USDINR',
          sortOrder: currencyPairs.indexOf(baseSymbol)
        });
        added++;
        counts.currency++;
      } catch (e) { errors++; }
    }
    
    // Subscribe to all tokens
    const allDbInstruments = await Instrument.find({ isEnabled: true }).select('token').lean();
    const tokens = allDbInstruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    if (tokens.length > 0) {
      await subscribeTokens(tokens);
    }
    
    res.json({
      message: `Database reset and synced fresh from Zerodha`,
      deleted: deleteResult.deletedCount,
      counts,
      added,
      errors,
      totalInDatabase: await Instrument.countDocuments(),
      subscribedTokens: tokens.length
    });
  } catch (error) {
    console.error('Reset and sync error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Sync ALL instruments from Zerodha with proper segment categorization
router.post('/sync-all-nse', protectAdmin, superAdminOnly, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha. Please connect first.' });
    }
    
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // Download instruments CSV from Zerodha
    console.log('Downloading ALL instruments from Zerodha...');
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
    
    console.log(`Total instruments from Zerodha: ${allInstruments.length}`);
    
    const Instrument = (await import('../models/Instrument.js')).default;
    
    let added = 0;
    let updated = 0;
    let errors = 0;
    const counts = { nse: 0, nsefo: 0, mcx: 0, bsefo: 0, currency: 0, indices: 0 };
    
    // ============ 1. NSE EQUITY (Stocks) ============
    const nseEquity = allInstruments.filter(i => 
      i.exchange === 'NSE' && 
      i.segment === 'NSE' &&
      i.instrument_type === 'EQ'
    );
    
    console.log(`Found ${nseEquity.length} NSE equity instruments`);
    
    for (const stock of nseEquity) {
      try {
        const existing = await Instrument.findOne({ token: stock.instrument_token });
        const instrumentData = {
          token: stock.instrument_token,
          symbol: stock.tradingsymbol,
          name: stock.name || stock.tradingsymbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          displaySegment: 'NSE',
          instrumentType: 'STOCK',
          category: 'STOCKS',
          tradingSymbol: stock.tradingsymbol,
          lotSize: parseInt(stock.lot_size) || 1,
          tickSize: parseFloat(stock.tick_size) || 0.05,
          isEnabled: true,
          isFeatured: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'].includes(stock.tradingsymbol),
          sortOrder: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'].includes(stock.tradingsymbol) ? 1 : 100
        };
        
        if (existing) {
          await Instrument.findByIdAndUpdate(existing._id, instrumentData);
          updated++;
        } else {
          await Instrument.create(instrumentData);
          added++;
        }
        counts.nse++;
      } catch (e) {
        errors++;
      }
    }
    
    // ============ 2. NSE INDICES ============
    const indices = allInstruments.filter(i => 
      i.exchange === 'NSE' && i.segment === 'INDICES'
    );
    
    console.log(`Found ${indices.length} NSE indices`);
    
    for (const idx of indices) {
      try {
        const existing = await Instrument.findOne({ token: idx.instrument_token });
        const isMajorIndex = ['NIFTY 50', 'NIFTY BANK', 'NIFTY FIN SERVICE', 'INDIA VIX'].includes(idx.tradingsymbol);
        const instrumentData = {
          token: idx.instrument_token,
          symbol: idx.tradingsymbol.replace(/ /g, ''),
          name: idx.tradingsymbol,
          exchange: 'NSE',
          segment: 'EQUITY',
          displaySegment: 'NSE',
          instrumentType: 'INDEX',
          category: 'INDICES',
          tradingSymbol: idx.tradingsymbol,
          lotSize: 1,
          isEnabled: true,
          isFeatured: isMajorIndex,
          sortOrder: isMajorIndex ? 0 : 50
        };
        
        if (existing) {
          await Instrument.findByIdAndUpdate(existing._id, instrumentData);
          updated++;
        } else {
          await Instrument.create(instrumentData);
          added++;
        }
        counts.indices++;
      } catch (e) {
        errors++;
      }
    }
    
    // ============ 3. NSE F&O (Futures & Options) ============
    const nfoFutures = allInstruments.filter(i => 
      i.exchange === 'NFO' && i.instrument_type === 'FUT'
    );
    
    // Get nearest 2 expiries for index futures
    const indexFutures = nfoFutures.filter(f => 
      ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(f.name)
    ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    
    // Group by name and get first 2 expiries
    const futuresByName = {};
    for (const fut of indexFutures) {
      if (!futuresByName[fut.name]) futuresByName[fut.name] = [];
      if (futuresByName[fut.name].length < 2) futuresByName[fut.name].push(fut);
    }
    
    for (const [name, futures] of Object.entries(futuresByName)) {
      for (const fut of futures) {
        try {
          const existing = await Instrument.findOne({ token: fut.instrument_token });
          const instrumentData = {
            token: fut.instrument_token,
            symbol: fut.tradingsymbol,
            name: `${fut.name} FUT`,
            exchange: 'NFO',
            segment: 'FNO',
            displaySegment: 'NSE F&O',
            instrumentType: 'FUTURES',
            category: fut.name === 'NIFTY' ? 'NIFTY' : fut.name === 'BANKNIFTY' ? 'BANKNIFTY' : 'FINNIFTY',
            tradingSymbol: fut.tradingsymbol,
            lotSize: parseInt(fut.lot_size) || 25,
            tickSize: parseFloat(fut.tick_size) || 0.05,
            expiry: new Date(fut.expiry),
            isEnabled: true,
            isFeatured: true,
            sortOrder: 0
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
          counts.nsefo++;
        } catch (e) {
          errors++;
        }
      }
    }
    
    // ============ 4. MCX COMMODITIES ============
    const mcxFutures = allInstruments.filter(i => 
      i.exchange === 'MCX' && i.instrument_type === 'FUT'
    );
    
    // Group by base symbol and get nearest expiry
    const mcxBySymbol = {};
    for (const fut of mcxFutures) {
      const baseSymbol = fut.name || fut.tradingsymbol.replace(/\d+[A-Z]+FUT$/, '');
      if (!mcxBySymbol[baseSymbol] || new Date(fut.expiry) < new Date(mcxBySymbol[baseSymbol].expiry)) {
        mcxBySymbol[baseSymbol] = fut;
      }
    }
    
    console.log(`Found ${Object.keys(mcxBySymbol).length} unique MCX commodities`);
    
    // Priority order for MCX
    const mcxPriority = ['GOLD', 'GOLDM', 'SILVER', 'SILVERM', 'CRUDEOIL', 'NATURALGAS', 'COPPER', 'ZINC', 'ALUMINIUM', 'LEAD', 'NICKEL'];
    
    for (const [baseSymbol, contract] of Object.entries(mcxBySymbol)) {
      try {
        const existing = await Instrument.findOne({ symbol: baseSymbol, exchange: 'MCX' });
        const priorityIndex = mcxPriority.indexOf(baseSymbol);
        const instrumentData = {
          token: contract.instrument_token,
          symbol: baseSymbol,
          name: contract.name || baseSymbol,
          exchange: 'MCX',
          segment: 'MCX',
          displaySegment: 'MCX',
          instrumentType: 'FUTURES',
          category: 'MCX',
          tradingSymbol: contract.tradingsymbol,
          lotSize: parseInt(contract.lot_size) || 1,
          tickSize: parseFloat(contract.tick_size) || 1,
          expiry: new Date(contract.expiry),
          isEnabled: true,
          isFeatured: priorityIndex >= 0 && priorityIndex < 5,
          sortOrder: priorityIndex >= 0 ? priorityIndex : 100
        };
        
        if (existing) {
          await Instrument.findByIdAndUpdate(existing._id, instrumentData);
          updated++;
        } else {
          await Instrument.create(instrumentData);
          added++;
        }
        counts.mcx++;
      } catch (e) {
        errors++;
      }
    }
    
    // ============ 5. BSE F&O ============
    const bfoFutures = allInstruments.filter(i => 
      i.exchange === 'BFO' && (i.instrument_type === 'FUT' || i.instrument_type === 'CE' || i.instrument_type === 'PE')
    );
    
    // Get SENSEX and BANKEX futures
    const bseFutures = bfoFutures.filter(f => 
      f.instrument_type === 'FUT' && ['SENSEX', 'BANKEX'].includes(f.name)
    ).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    
    const bseFuturesByName = {};
    for (const fut of bseFutures) {
      if (!bseFuturesByName[fut.name]) bseFuturesByName[fut.name] = [];
      if (bseFuturesByName[fut.name].length < 2) bseFuturesByName[fut.name].push(fut);
    }
    
    for (const [name, futures] of Object.entries(bseFuturesByName)) {
      for (const fut of futures) {
        try {
          const existing = await Instrument.findOne({ token: fut.instrument_token });
          const instrumentData = {
            token: fut.instrument_token,
            symbol: fut.tradingsymbol,
            name: `${fut.name} FUT`,
            exchange: 'BFO',
            segment: 'FNO',
            displaySegment: 'BSE F&O',
            instrumentType: 'FUTURES',
            category: 'BSE',
            tradingSymbol: fut.tradingsymbol,
            lotSize: parseInt(fut.lot_size) || 10,
            tickSize: parseFloat(fut.tick_size) || 0.05,
            expiry: new Date(fut.expiry),
            isEnabled: true,
            isFeatured: true,
            sortOrder: 0
          };
          
          if (existing) {
            await Instrument.findByIdAndUpdate(existing._id, instrumentData);
            updated++;
          } else {
            await Instrument.create(instrumentData);
            added++;
          }
          counts.bsefo++;
        } catch (e) {
          errors++;
        }
      }
    }
    
    // ============ 6. CURRENCY (CDS) ============
    const cdsFutures = allInstruments.filter(i => 
      i.exchange === 'CDS' && i.instrument_type === 'FUT'
    );
    
    // Get major currency pairs
    const currencyPairs = ['USDINR', 'EURINR', 'GBPINR', 'JPYINR'];
    const cdsBySymbol = {};
    for (const fut of cdsFutures) {
      const baseSymbol = fut.name;
      if (currencyPairs.includes(baseSymbol)) {
        if (!cdsBySymbol[baseSymbol] || new Date(fut.expiry) < new Date(cdsBySymbol[baseSymbol].expiry)) {
          cdsBySymbol[baseSymbol] = fut;
        }
      }
    }
    
    for (const [baseSymbol, contract] of Object.entries(cdsBySymbol)) {
      try {
        const existing = await Instrument.findOne({ symbol: baseSymbol, exchange: 'CDS' });
        const instrumentData = {
          token: contract.instrument_token,
          symbol: baseSymbol,
          name: baseSymbol,
          exchange: 'CDS',
          segment: 'CURRENCY',
          displaySegment: 'Currency',
          instrumentType: 'FUTURES',
          category: 'CURRENCY',
          tradingSymbol: contract.tradingsymbol,
          lotSize: parseInt(contract.lot_size) || 1,
          tickSize: parseFloat(contract.tick_size) || 0.0025,
          expiry: new Date(contract.expiry),
          isEnabled: true,
          isFeatured: baseSymbol === 'USDINR',
          sortOrder: currencyPairs.indexOf(baseSymbol)
        };
        
        if (existing) {
          await Instrument.findByIdAndUpdate(existing._id, instrumentData);
          updated++;
        } else {
          await Instrument.create(instrumentData);
          added++;
        }
        counts.currency++;
      } catch (e) {
        errors++;
      }
    }
    
    // Subscribe to all tokens
    const allDbInstruments = await Instrument.find({ isEnabled: true }).select('token').lean();
    const tokens = allDbInstruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    console.log(`Subscribing to ${tokens.length} instruments...`);
    
    if (tokens.length > 0) {
      await subscribeTokens(tokens);
    }
    
    res.json({
      message: `Synced ALL instruments from Zerodha`,
      counts: {
        'NSE (Stocks)': counts.nse,
        'NSE (Indices)': counts.indices,
        'NSE F&O': counts.nsefo,
        'MCX': counts.mcx,
        'BSE F&O': counts.bsefo,
        'Currency': counts.currency
      },
      added,
      updated,
      errors,
      totalInDatabase: await Instrument.countDocuments(),
      subscribedTokens: tokens.length
    });
  } catch (error) {
    console.error('Sync all NSE error:', error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
});

// Subscribe to all enabled instruments
router.post('/subscribe-all', protectAdmin, async (req, res) => {
  try {
    const tickerStatus = getTickerStatus();
    if (!tickerStatus.connected) {
      return res.status(400).json({ message: 'WebSocket ticker not connected. Please connect to Zerodha first.' });
    }
    
    const Instrument = (await import('../models/Instrument.js')).default;
    const instruments = await Instrument.find({ isEnabled: true }).select('token symbol exchange').lean();
    const tokens = instruments.map(i => parseInt(i.token)).filter(t => !isNaN(t));
    
    if (tokens.length === 0) {
      return res.json({ message: 'No instruments to subscribe', subscribed: 0, total: 0 });
    }
    
    console.log(`Subscribe-all: Found ${tokens.length} enabled instruments`);
    
    // subscribeTokens is now async and batches the subscriptions
    const result = await subscribeTokens(tokens);
    
    res.json({ 
      message: `Subscribed to ${result.subscribed} instruments`, 
      subscribed: result.subscribed,
      total: result.total,
      requested: tokens.length
    });
  } catch (error) {
    console.error('Subscribe-all error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fetch historical data for multiple instruments
router.post('/historical-bulk', protectAdmin, async (req, res) => {
  try {
    if (!zerodhaSession.accessToken) {
      return res.status(401).json({ message: 'Not logged in to Zerodha' });
    }
    
    const { tokens, interval = '15minute' } = req.body;
    const apiKey = process.env.ZERODHA_API_KEY;
    
    // If no tokens provided, get all enabled instruments
    let instrumentTokens = tokens;
    if (!instrumentTokens || instrumentTokens.length === 0) {
      const Instrument = (await import('../models/Instrument.js')).default;
      const instruments = await Instrument.find({ isEnabled: true }).select('token').lean();
      instrumentTokens = instruments.map(i => i.token).filter(t => t);
    }
    
    // Calculate date range based on interval
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const fromDate = new Date();
    
    if (interval === 'day') {
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else if (interval === 'minute') {
      fromDate.setDate(fromDate.getDate() - 5);
    } else if (interval === '5minute') {
      fromDate.setDate(fromDate.getDate() - 15);
    } else if (interval === '15minute') {
      fromDate.setDate(fromDate.getDate() - 30);
    } else {
      fromDate.setDate(fromDate.getDate() - 60);
    }
    const from = fromDate.toISOString().split('T')[0];
    
    console.log(`Fetching historical data for ${instrumentTokens.length} instruments, interval: ${interval}`);
    
    const results = {};
    const errors = [];
    
    // Fetch historical data for each token with rate limiting
    for (let i = 0; i < instrumentTokens.length; i++) {
      const token = instrumentTokens[i];
      
      try {
        const response = await axios.get(
          `https://api.kite.trade/instruments/historical/${token}/${interval}?from=${from}&to=${to}`,
          {
            headers: {
              'X-Kite-Version': '3',
              'Authorization': `token ${apiKey}:${zerodhaSession.accessToken}`
            }
          }
        );
        
        if (response.data.status === 'success' && response.data.data?.candles) {
          results[token] = response.data.data.candles.map(c => ({
            time: Math.floor(new Date(c[0]).getTime() / 1000),
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5]
          }));
        }
        
        // Rate limiting: Zerodha allows ~3 requests per second
        if (i < instrumentTokens.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 350));
        }
        
        // Log progress every 10 instruments
        if ((i + 1) % 10 === 0) {
          console.log(`Historical data progress: ${i + 1}/${instrumentTokens.length}`);
        }
      } catch (error) {
        errors.push({ token, error: error.response?.data?.message || error.message });
      }
    }
    
    console.log(`Historical data fetched: ${Object.keys(results).length} success, ${errors.length} errors`);
    
    res.json({
      message: `Fetched historical data for ${Object.keys(results).length} instruments`,
      success: Object.keys(results).length,
      errors: errors.length,
      data: results,
      errorDetails: errors.slice(0, 10) // Only return first 10 errors
    });
  } catch (error) {
    console.error('Historical bulk error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all subscribed tokens status
router.get('/subscription-status', protectAdmin, async (req, res) => {
  try {
    const status = getTickerStatus();
    const Instrument = (await import('../models/Instrument.js')).default;
    const totalEnabled = await Instrument.countDocuments({ isEnabled: true });
    
    res.json({
      connected: status.connected,
      subscribedTokens: status.subscribedTokens,
      totalEnabledInstruments: totalEnabled,
      allSubscribed: status.subscribedTokens >= totalEnabled
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
