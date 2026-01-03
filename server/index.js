import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tradingRoutes from './routes/tradingRoutes.js';
import adminManagementRoutes from './routes/adminManagementRoutes.js';
import userFundRoutes from './routes/userFundRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import instrumentRoutes from './routes/instrumentRoutes.js';
import binanceRoutes from './routes/binanceRoutes.js';
import zerodhaRoutes, { setSocketIO } from './routes/zerodhaRoutes.js';
import { initZerodhaWebSocket } from './services/zerodhaWebSocket.js';
import uploadRoutes from './routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with production CORS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://thefx.live', 'https://www.thefx.live']
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Zerodha WebSocket service with Socket.IO
initZerodhaWebSocket(io);
setSocketIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to MongoDB
connectDB();

// Middleware - CORS for production
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/manage', adminManagementRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/funds', userFundRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api/binance', binanceRoutes);
app.use('/api/zerodha', zerodhaRoutes);
app.use('/auth/zerodha', zerodhaRoutes); // Alias for Kite Connect redirect URL
app.use('/api/upload', uploadRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbState = mongoose.connection.readyState;

  res.json({ 
    status: 'ok', 
    message: 'NTrader API is running',
    database: {
      connected: dbState === 1,
      state: stateMap[dbState] || 'unknown',
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
