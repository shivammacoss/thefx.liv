import { KiteTicker } from 'kiteconnect';

let ticker = null;
let io = null;
let subscribedTokens = [];
let marketData = {};

// Initialize WebSocket with Socket.IO instance
export const initZerodhaWebSocket = (socketIO) => {
  io = socketIO;
  console.log('Zerodha WebSocket service initialized');
};

// Connect to Zerodha WebSocket
export const connectTicker = (apiKey, accessToken, tokens = []) => {
  if (ticker) {
    ticker.disconnect();
  }

  ticker = new KiteTicker({
    api_key: apiKey,
    access_token: accessToken
  });

  ticker.autoReconnect(true, 10, 5); // Auto reconnect with 10 retries, 5 second interval

  ticker.on('connect', () => {
    console.log('Zerodha WebSocket connected');
    if (tokens.length > 0) {
      subscribeTokens(tokens);
    }
  });

  ticker.on('ticks', (ticks) => {
    processTicks(ticks);
  });

  ticker.on('disconnect', () => {
    console.log('Zerodha WebSocket disconnected');
  });

  ticker.on('error', (error) => {
    console.error('Zerodha WebSocket error:', error);
  });

  ticker.on('reconnect', (reconnect_count, reconnect_interval) => {
    console.log(`Zerodha WebSocket reconnecting... Attempt: ${reconnect_count}`);
  });

  ticker.on('noreconnect', () => {
    console.log('Zerodha WebSocket max reconnection attempts reached');
  });

  ticker.on('order_update', (order) => {
    console.log('Order update:', order);
    if (io) {
      io.emit('order_update', order);
    }
  });

  ticker.connect();
  return ticker;
};

// Subscribe to instrument tokens
export const subscribeTokens = (tokens) => {
  if (!ticker || !ticker.connected()) {
    console.log('Ticker not connected, cannot subscribe');
    return;
  }

  // Convert to numbers if strings
  const numericTokens = tokens.map(t => parseInt(t));
  
  // Subscribe to full mode for detailed data
  ticker.subscribe(numericTokens);
  ticker.setMode(ticker.modeFull, numericTokens);
  
  subscribedTokens = [...new Set([...subscribedTokens, ...numericTokens])];
  console.log(`Subscribed to ${numericTokens.length} tokens. Total: ${subscribedTokens.length}`);
};

// Unsubscribe from tokens
export const unsubscribeTokens = (tokens) => {
  if (!ticker || !ticker.connected()) return;
  
  const numericTokens = tokens.map(t => parseInt(t));
  ticker.unsubscribe(numericTokens);
  subscribedTokens = subscribedTokens.filter(t => !numericTokens.includes(t));
};

// Process incoming ticks and broadcast to clients
const processTicks = (ticks) => {
  const updates = {};
  
  for (const tick of ticks) {
    const token = tick.instrument_token.toString();
    
    // Extract best bid/ask from depth
    const bestBid = tick.depth?.buy?.[0]?.price || tick.last_price;
    const bestAsk = tick.depth?.sell?.[0]?.price || tick.last_price;
    
    const tickData = {
      token: token,
      symbol: tick.tradable ? tick.tradingsymbol : undefined,
      ltp: tick.last_price,
      bid: bestBid,
      ask: bestAsk,
      bidQty: tick.depth?.buy?.[0]?.quantity || 0,
      askQty: tick.depth?.sell?.[0]?.quantity || 0,
      open: tick.ohlc?.open,
      high: tick.ohlc?.high,
      low: tick.ohlc?.low,
      close: tick.ohlc?.close,
      change: tick.change,
      changePercent: tick.change_percent || (tick.ohlc?.close ? ((tick.last_price - tick.ohlc.close) / tick.ohlc.close * 100).toFixed(2) : 0),
      volume: tick.volume_traded || tick.volume,
      buyQuantity: tick.total_buy_quantity,
      sellQuantity: tick.total_sell_quantity,
      lastTradeTime: tick.last_trade_time,
      oi: tick.oi,
      oiDayHigh: tick.oi_day_high,
      oiDayLow: tick.oi_day_low,
      depth: tick.depth,
      lastUpdated: new Date()
    };
    
    marketData[token] = tickData;
    updates[token] = tickData;
  }
  
  // Broadcast to all connected clients
  if (io && Object.keys(updates).length > 0) {
    io.emit('market_tick', updates);
  }
};

// Get current market data
export const getMarketData = () => {
  return marketData;
};

// Get ticker status
export const getTickerStatus = () => {
  return {
    connected: ticker ? ticker.connected() : false,
    subscribedTokens: subscribedTokens.length
  };
};

// Disconnect ticker
export const disconnectTicker = () => {
  if (ticker) {
    ticker.disconnect();
    ticker = null;
    subscribedTokens = [];
    marketData = {};
  }
};

export default {
  initZerodhaWebSocket,
  connectTicker,
  subscribeTokens,
  unsubscribeTokens,
  getMarketData,
  getTickerStatus,
  disconnectTicker
};
