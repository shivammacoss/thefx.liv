import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Search, LogOut, Wallet, RefreshCw, Plus, TrendingUp,
  ChevronDown, ChevronRight, Settings, Bell, User, X,
  BarChart2, History, ListOrdered, UserCircle, Menu,
  ArrowDownCircle, ArrowUpCircle, CreditCard, Copy, Check, Building2
} from 'lucide-react';
import MarketWatch from '../components/MarketWatch';

// Demo instruments with mock data for testing trading features
const demoInstrumentsData = {
  'Demo Stocks': {
    stocks: [
      { symbol: 'DEMO-STOCK1', name: 'Demo Stock One', exchange: 'DEMO', isDemo: true, mockPrice: 1250.50, mockChange: 2.5 },
      { symbol: 'DEMO-STOCK2', name: 'Demo Stock Two', exchange: 'DEMO', isDemo: true, mockPrice: 875.25, mockChange: -1.8 },
      { symbol: 'DEMO-STOCK3', name: 'Demo Stock Three', exchange: 'DEMO', isDemo: true, mockPrice: 2340.00, mockChange: 0.75 },
    ]
  },
  'Demo F&O': {
    futures: [
      { symbol: 'DEMO-FUT1', name: 'Demo Future Jan', exchange: 'DEMO', type: 'FUT', isDemo: true, mockPrice: 24500, mockChange: 1.2 },
      { symbol: 'DEMO-FUT2', name: 'Demo Future Feb', exchange: 'DEMO', type: 'FUT', isDemo: true, mockPrice: 24650, mockChange: -0.5 },
    ],
    calls: [
      { symbol: 'DEMO-24500CE', name: 'Demo 24500 CE', exchange: 'DEMO', type: 'CE', strike: 24500, isDemo: true, mockPrice: 250, mockChange: 15.5 },
      { symbol: 'DEMO-24600CE', name: 'Demo 24600 CE', exchange: 'DEMO', type: 'CE', strike: 24600, isDemo: true, mockPrice: 180, mockChange: 12.3 },
      { symbol: 'DEMO-24700CE', name: 'Demo 24700 CE', exchange: 'DEMO', type: 'CE', strike: 24700, isDemo: true, mockPrice: 120, mockChange: -8.2 },
    ],
    puts: [
      { symbol: 'DEMO-24500PE', name: 'Demo 24500 PE', exchange: 'DEMO', type: 'PE', strike: 24500, isDemo: true, mockPrice: 180, mockChange: -5.5 },
      { symbol: 'DEMO-24400PE', name: 'Demo 24400 PE', exchange: 'DEMO', type: 'PE', strike: 24400, isDemo: true, mockPrice: 220, mockChange: 8.7 },
      { symbol: 'DEMO-24300PE', name: 'Demo 24300 PE', exchange: 'DEMO', type: 'PE', strike: 24300, isDemo: true, mockPrice: 280, mockChange: 10.2 },
    ]
  },
  'Demo Crypto': {
    stocks: [
      { symbol: 'DEMO-BTC', name: 'Demo Bitcoin', exchange: 'DEMO', isDemo: true, isCrypto: true, mockPrice: 85000, mockChange: -2.1 },
      { symbol: 'DEMO-ETH', name: 'Demo Ethereum', exchange: 'DEMO', isDemo: true, isCrypto: true, mockPrice: 2950, mockChange: 1.5 },
    ]
  }
};

// Instruments data with Angel One tokens for real-time data
const instrumentsData = {
  ...demoInstrumentsData,
  'Indices': {
    stocks: [
      { symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', token: '99926000' },
      { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', exchange: 'NSE', token: '99926009' },
      { symbol: 'FINNIFTY', name: 'Fin Nifty Index', exchange: 'NSE', token: '99926037' },
    ]
  },
  'NSE Equity': {
    stocks: [
      { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', token: '2885' },
      { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', token: '3045' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', token: '1333' },
      { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', token: '11536' },
      { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE', token: '1594' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', token: '4963' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', token: '1922' },
      { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', token: '1660' },
      { symbol: 'AXISBANK', name: 'Axis Bank', exchange: 'NSE', token: '5900' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', token: '17818' },
      { symbol: 'MARUTI', name: 'Maruti Suzuki', exchange: 'NSE', token: '10999' },
      { symbol: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', token: '3787' },
      { symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', token: '20374' },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE', token: '1394' },
      { symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'NSE', token: '3426' },
      { symbol: 'SUNPHARMA', name: 'Sun Pharma', exchange: 'NSE', token: '17388' },
      { symbol: 'TITAN', name: 'Titan Company', exchange: 'NSE', token: '3506' },
      { symbol: 'ASIANPAINT', name: 'Asian Paints', exchange: 'NSE', token: '467' },
      { symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE', token: '11630' },
      { symbol: 'POWERGRID', name: 'Power Grid Corp', exchange: 'NSE', token: '11532' },
      { symbol: 'M&M', name: 'Mahindra & Mahindra', exchange: 'NSE', token: '2181' },
      { symbol: 'ONGC', name: 'ONGC', exchange: 'NSE', token: '2475' },
      { symbol: 'COALINDIA', name: 'Coal India', exchange: 'NSE', token: '1232' },
      { symbol: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', token: '7229' },
      { symbol: 'TECHM', name: 'Tech Mahindra', exchange: 'NSE', token: '3432' },
    ]
  },
  'NSE F&O': {
    futures: [
      { symbol: 'NIFTY25JANFUT', name: 'NIFTY JAN FUT', exchange: 'NFO', type: 'FUT', token: '35001' },
      { symbol: 'BANKNIFTY25JANFUT', name: 'BANKNIFTY JAN FUT', exchange: 'NFO', type: 'FUT', token: '35009' },
      { symbol: 'FINNIFTY25JANFUT', name: 'FINNIFTY JAN FUT', exchange: 'NFO', type: 'FUT', token: '35037' },
    ],
    calls: [
      { symbol: 'NIFTY26000CE', name: 'NIFTY 26000 CE', exchange: 'NFO', type: 'CE', strike: 26000, token: '43650' },
      { symbol: 'NIFTY26100CE', name: 'NIFTY 26100 CE', exchange: 'NFO', type: 'CE', strike: 26100, token: '43652' },
      { symbol: 'NIFTY26200CE', name: 'NIFTY 26200 CE', exchange: 'NFO', type: 'CE', strike: 26200, token: '43654' },
      { symbol: 'BANKNIFTY59500CE', name: 'BANKNIFTY 59500 CE', exchange: 'NFO', type: 'CE', strike: 59500, token: '43750' },
      { symbol: 'BANKNIFTY59700CE', name: 'BANKNIFTY 59700 CE', exchange: 'NFO', type: 'CE', strike: 59700, token: '43752' },
    ],
    puts: [
      { symbol: 'NIFTY26000PE', name: 'NIFTY 26000 PE', exchange: 'NFO', type: 'PE', strike: 26000, token: '43651' },
      { symbol: 'NIFTY25900PE', name: 'NIFTY 25900 PE', exchange: 'NFO', type: 'PE', strike: 25900, token: '43649' },
      { symbol: 'NIFTY25800PE', name: 'NIFTY 25800 PE', exchange: 'NFO', type: 'PE', strike: 25800, token: '43647' },
      { symbol: 'BANKNIFTY59500PE', name: 'BANKNIFTY 59500 PE', exchange: 'NFO', type: 'PE', strike: 59500, token: '43751' },
      { symbol: 'BANKNIFTY59300PE', name: 'BANKNIFTY 59300 PE', exchange: 'NFO', type: 'PE', strike: 59300, token: '43749' },
    ]
  },
  'MCX': {
    futures: [
      { symbol: 'GOLDM', name: 'Gold Mini', exchange: 'MCX', type: 'FUT', token: '220822' },
      { symbol: 'SILVERM', name: 'Silver Mini', exchange: 'MCX', type: 'FUT', token: '220823' },
      { symbol: 'CRUDEOIL', name: 'Crude Oil', exchange: 'MCX', type: 'FUT', token: '224570' },
      { symbol: 'NATURALGAS', name: 'Natural Gas', exchange: 'MCX', type: 'FUT', token: '226745' },
      { symbol: 'COPPER', name: 'Copper', exchange: 'MCX', type: 'FUT', token: '220824' },
    ]
  },
  'Crypto': {
    stocks: [
      { symbol: 'BTC', name: 'Bitcoin', exchange: 'BINANCE', pair: 'BTCUSDT', isCrypto: true },
      { symbol: 'ETH', name: 'Ethereum', exchange: 'BINANCE', pair: 'ETHUSDT', isCrypto: true },
      { symbol: 'BNB', name: 'Binance Coin', exchange: 'BINANCE', pair: 'BNBUSDT', isCrypto: true },
      { symbol: 'XRP', name: 'Ripple', exchange: 'BINANCE', pair: 'XRPUSDT', isCrypto: true },
      { symbol: 'ADA', name: 'Cardano', exchange: 'BINANCE', pair: 'ADAUSDT', isCrypto: true },
      { symbol: 'DOGE', name: 'Dogecoin', exchange: 'BINANCE', pair: 'DOGEUSDT', isCrypto: true },
      { symbol: 'SOL', name: 'Solana', exchange: 'BINANCE', pair: 'SOLUSDT', isCrypto: true },
      { symbol: 'DOT', name: 'Polkadot', exchange: 'BINANCE', pair: 'DOTUSDT', isCrypto: true },
      { symbol: 'MATIC', name: 'Polygon', exchange: 'BINANCE', pair: 'MATICUSDT', isCrypto: true },
      { symbol: 'LTC', name: 'Litecoin', exchange: 'BINANCE', pair: 'LTCUSDT', isCrypto: true },
      { symbol: 'AVAX', name: 'Avalanche', exchange: 'BINANCE', pair: 'AVAXUSDT', isCrypto: true },
      { symbol: 'LINK', name: 'Chainlink', exchange: 'BINANCE', pair: 'LINKUSDT', isCrypto: true },
      { symbol: 'ATOM', name: 'Cosmos', exchange: 'BINANCE', pair: 'ATOMUSDT', isCrypto: true },
      { symbol: 'UNI', name: 'Uniswap', exchange: 'BINANCE', pair: 'UNIUSDT', isCrypto: true },
      { symbol: 'XLM', name: 'Stellar', exchange: 'BINANCE', pair: 'XLMUSDT', isCrypto: true },
    ]
  }
};

const UserDashboard = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [activeTab, setActiveTab] = useState('positions');
  const [quickMode, setQuickMode] = useState(false);
  const [mobileView, setMobileView] = useState('quotes');
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [orderType, setOrderType] = useState('buy');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [tradeInstrument, setTradeInstrument] = useState(null); // For trading panel
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [indicesData, setIndicesData] = useState({});
  const [marketData, setMarketData] = useState({}); // Shared market data for chart and instruments
  const [positionsRefreshKey, setPositionsRefreshKey] = useState(0); // Key to trigger positions refresh
  
  const refreshPositions = () => setPositionsRefreshKey(k => k + 1);

  // Connect to Socket.IO for real-time market data (shared across components)
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl);
    
    socket.on('connect', () => {
      console.log('Socket.IO connected for real-time ticks');
    });
    
    socket.on('market_tick', (ticks) => {
      setMarketData(prev => ({ ...prev, ...ticks }));
      // Also update indices
      const nifty = Object.values(ticks).find(d => d.symbol === 'NIFTY 50' || d.symbol === 'NIFTY');
      const banknifty = Object.values(ticks).find(d => d.symbol === 'NIFTY BANK' || d.symbol === 'BANKNIFTY');
      const finnifty = Object.values(ticks).find(d => d.symbol === 'NIFTY FIN SERVICE' || d.symbol === 'FINNIFTY');
      if (nifty || banknifty || finnifty) {
        setIndicesData(prev => ({
          nifty: nifty || prev.nifty,
          banknifty: banknifty || prev.banknifty,
          finnifty: finnifty || prev.finnifty
        }));
      }
    });
    
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchMarketData();
    // Fetch market data every 3 seconds as fallback
    const interval = setInterval(fetchMarketData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarketData = async () => {
    try {
      const { data } = await axios.get('/api/zerodha/market-data');
      if (data && Object.keys(data).length > 0) {
        console.log(`Received ${Object.keys(data).length} market data entries`);
        // Merge with existing market data
        setMarketData(prev => ({ ...prev, ...data }));
        // Extract indices data by symbol
        const nifty = Object.values(data).find(d => d.symbol === 'NIFTY 50' || d.symbol === 'NIFTY');
        const banknifty = Object.values(data).find(d => d.symbol === 'NIFTY BANK' || d.symbol === 'BANKNIFTY');
        const finnifty = Object.values(data).find(d => d.symbol === 'NIFTY FIN SERVICE' || d.symbol === 'FINNIFTY');
        setIndicesData({
          nifty: nifty || null,
          banknifty: banknifty || null,
          finnifty: finnifty || null
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await axios.get('/api/user/wallet', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setWalletData(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const openBuySell = (type, instrument = null) => {
    if (instrument) setSelectedInstrument(instrument);
    setOrderType(type);
    setShowBuySellModal(true);
  };

  // Quick Trade handler - opens trading panel in sidebar
  const handleQuickTrade = (type, instrument) => {
    setTradeInstrument(instrument);
    setOrderType(type);
  };

  return (
    <div className="h-screen bg-dark-900 flex flex-col overflow-hidden">
      {/* Header - Desktop */}
      <header className="bg-dark-800 border-b border-dark-600 px-4 py-2 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">THEFX</span>
          </div>
          
          {/* Market Indices - Live Data */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-400">NIFTY</span>
              {indicesData.nifty ? (
                <span className={`ml-2 ${indicesData.nifty.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {indicesData.nifty.ltp?.toLocaleString()} 
                  <span className="text-xs ml-1">({indicesData.nifty.change >= 0 ? '+' : ''}{indicesData.nifty.changePercent}%)</span>
                </span>
              ) : <span className="ml-2 text-gray-500">--</span>}
            </div>
            <div>
              <span className="text-gray-400">BANKNIFTY</span>
              {indicesData.banknifty ? (
                <span className={`ml-2 ${indicesData.banknifty.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {indicesData.banknifty.ltp?.toLocaleString()}
                  <span className="text-xs ml-1">({indicesData.banknifty.change >= 0 ? '+' : ''}{indicesData.banknifty.changePercent}%)</span>
                </span>
              ) : <span className="ml-2 text-gray-500">--</span>}
            </div>
            <div>
              <span className="text-gray-400">FINNIFTY</span>
              {indicesData.finnifty ? (
                <span className={`ml-2 ${indicesData.finnifty.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {indicesData.finnifty.ltp?.toLocaleString()}
                  <span className="text-xs ml-1">({indicesData.finnifty.change >= 0 ? '+' : ''}{indicesData.finnifty.changePercent}%)</span>
                </span>
              ) : <span className="ml-2 text-gray-500">--</span>}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search Instruments"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Wallet Button */}
          <button 
            onClick={() => setShowWalletModal(true)}
            className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Wallet size={18} className="text-green-400" />
            <span className="text-green-400 font-medium">₹{walletData?.wallet?.balance?.toLocaleString() || '0'}</span>
            <Plus size={14} className="text-gray-400" />
          </button>
          <button onClick={() => setShowNotificationsModal(true)} className="text-gray-400 hover:text-white">
            <Bell size={20} />
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="text-gray-400 hover:text-white">
            <Settings size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <User size={18} className="text-gray-400" />
            <span>{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Header - Mobile */}
      <header className="bg-dark-800 border-b border-dark-600 px-4 py-3 flex md:hidden items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">THEFX</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white">
            <Search size={20} />
          </button>
          <button onClick={() => setShowNotificationsModal(true)} className="text-gray-400 hover:text-white">
            <Bell size={20} />
          </button>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div 
          className="md:hidden absolute top-14 right-2 bg-dark-700 rounded-lg shadow-xl z-50 py-2 min-w-[200px]"
          onClick={(e) => e.stopPropagation()} // Prevent menu from closing when clicking inside
        >
          <div className="px-4 py-2 border-b border-dark-600">
            <p className="text-sm text-gray-400">Logged in as</p>
            <p className="font-medium">{user?.username}</p>
          </div>
          <div className="px-4 py-2 border-b border-dark-600">
            <p className="text-sm text-gray-400">Balance</p>
            <p className="font-medium text-green-400">₹{walletData?.cashBalance?.toLocaleString() || walletData?.wallet?.balance?.toLocaleString() || '0'}</p>
          </div>
          <button 
            onClick={() => { setShowWalletModal(true); setShowMobileMenu(false); }}
            className="w-full px-4 py-2 text-left hover:bg-dark-600 flex items-center gap-2 text-green-400"
          >
            <Wallet size={18} /> Add Funds
          </button>
          <button 
            onClick={() => { setShowSettingsModal(true); setShowMobileMenu(false); }}
            className="w-full px-4 py-2 text-left hover:bg-dark-600 flex items-center gap-2"
          >
            <Settings size={18} /> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left hover:bg-dark-600 flex items-center gap-2 text-red-400"
          >
            <LogOut size={18} /> Logout
          </button>
          <button 
            onClick={() => setShowMobileMenu(false)}
            className="w-full px-4 py-2 text-left hover:bg-dark-600 flex items-center justify-center gap-2 text-gray-400 border-t border-dark-600 mt-2"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Content - Desktop */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left Sidebar - Instruments */}
        <InstrumentsPanel 
          selectedInstrument={selectedInstrument}
          onSelectInstrument={setSelectedInstrument}
          onBuySell={quickMode ? handleQuickTrade : openBuySell}
          quickMode={quickMode}
          user={user}
          marketData={marketData}
        />

        {/* Center - Chart */}
        <div className="flex-1 flex flex-col">
          <ChartPanel selectedInstrument={selectedInstrument} marketData={marketData} />
          
          {/* Bottom - Positions */}
          <PositionsPanel 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            quickMode={quickMode}
            setQuickMode={setQuickMode}
            walletData={walletData}
            user={user}
            marketData={marketData}
            refreshKey={positionsRefreshKey}
          />
        </div>

        {/* Right Sidebar - Portfolio or Trading Panel */}
        {quickMode && tradeInstrument ? (
          <TradingPanel 
            instrument={tradeInstrument}
            orderType={orderType}
            setOrderType={setOrderType}
            walletData={walletData}
            onClose={() => setTradeInstrument(null)}
            user={user}
            marketData={marketData}
            onRefreshWallet={fetchWallet}
            onRefreshPositions={refreshPositions}
          />
        ) : (
          <PortfolioPanel 
            walletData={walletData} 
            onOpenWallet={() => setShowWalletModal(true)}
            user={user}
            marketData={marketData}
          />
        )}
      </div>

      {/* Main Content - Mobile */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        {mobileView === 'quotes' && (
          <MobileInstrumentsPanel 
            selectedInstrument={selectedInstrument}
            onSelectInstrument={(inst) => {
              setSelectedInstrument(inst);
              setMobileView('chart');
            }}
            onBuySell={openBuySell}
            user={user}
            marketData={marketData}
          />
        )}
        {mobileView === 'chart' && (
          <MobileChartPanel 
            selectedInstrument={selectedInstrument} 
            onBuySell={openBuySell}
            onBack={() => setMobileView('quotes')}
            marketData={marketData}
          />
        )}
        {mobileView === 'positions' && (
          <MobilePositionsPanel activeTab="positions" user={user} marketData={marketData} />
        )}
        {mobileView === 'history' && (
          <MobilePositionsPanel activeTab="history" user={user} marketData={marketData} />
        )}
        {mobileView === 'profile' && (
          <MobileProfilePanel user={user} walletData={walletData} onLogout={handleLogout} />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden bg-dark-800 border-t border-dark-600 flex items-center justify-around py-2 safe-area-bottom">
        <button 
          onClick={() => setMobileView('quotes')}
          className={`flex flex-col items-center p-2 ${mobileView === 'quotes' ? 'text-green-400' : 'text-gray-400'}`}
        >
          <ListOrdered size={20} />
          <span className="text-xs mt-1">Quotes</span>
        </button>
        <button 
          onClick={() => setMobileView('chart')}
          className={`flex flex-col items-center p-2 ${mobileView === 'chart' ? 'text-green-400' : 'text-gray-400'}`}
        >
          <BarChart2 size={20} />
          <span className="text-xs mt-1">Chart</span>
        </button>
        <button 
          onClick={() => openBuySell('buy')}
          className="flex flex-col items-center p-2 bg-green-600 rounded-full -mt-4 px-4"
        >
          <TrendingUp size={24} />
          <span className="text-xs mt-1">Trade</span>
        </button>
        <button 
          onClick={() => setMobileView('positions')}
          className={`flex flex-col items-center p-2 ${mobileView === 'positions' ? 'text-green-400' : 'text-gray-400'}`}
        >
          <Wallet size={20} />
          <span className="text-xs mt-1">Positions</span>
        </button>
        <button 
          onClick={() => setMobileView('profile')}
          className={`flex flex-col items-center p-2 ${mobileView === 'profile' ? 'text-green-400' : 'text-gray-400'}`}
        >
          <UserCircle size={20} />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </nav>

      {/* Buy/Sell Modal */}
      {showBuySellModal && (
        <BuySellModal 
          instrument={selectedInstrument}
          orderType={orderType}
          setOrderType={setOrderType}
          onClose={() => setShowBuySellModal(false)}
          walletData={walletData}
          user={user}
          marketData={marketData}
          onRefreshWallet={fetchWallet}
          onRefreshPositions={refreshPositions}
        />
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <WalletModal 
          onClose={() => setShowWalletModal(false)}
          walletData={walletData}
          user={user}
          onRefresh={fetchWallet}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          user={user}
        />
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal 
          onClose={() => setShowNotificationsModal(false)}
          user={user}
        />
      )}
    </div>
  );
};

const InstrumentsPanel = ({ selectedInstrument, onSelectInstrument, onBuySell, quickMode, user, marketData = {} }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState('NSE'); // Segment tabs
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('ntrader_watchlist');
    return saved ? JSON.parse(saved) : ['NIFTY 50', 'NIFTY BANK', 'SBIN', 'RELIANCE'];
  });
  const [cryptoData, setCryptoData] = useState({});
  const [dbInstruments, setDbInstruments] = useState([]);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  
  // Segment tabs configuration
  const segmentTabs = [
    { id: 'NSE', label: 'NSE', color: 'bg-green-600' },
    { id: 'NSE_FO', label: 'NSE F&O', color: 'bg-dark-600' },
    { id: 'MCX', label: 'MCX', color: 'bg-dark-600' },
    { id: 'BSE_FO', label: 'BSE F&O', color: 'bg-dark-600' },
    { id: 'Currency', label: 'Currency', color: 'bg-dark-600' },
    { id: 'Crypto', label: 'Crypto', color: 'bg-dark-600' }
  ];
  
  // Market status derived from marketData
  const marketStatus = {
    connected: Object.keys(marketData).length > 0,
    lastUpdate: Object.keys(marketData).length > 0 ? new Date() : null
  };

  // Debounce search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150); // Fast 150ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fast search when typing
  useEffect(() => {
    if (debouncedSearch.length >= 1) {
      setIsSearching(true);
      const term = debouncedSearch.toLowerCase();
      const results = dbInstruments.filter(inst => 
        inst.symbol?.toLowerCase().includes(term) ||
        inst.name?.toLowerCase().includes(term) ||
        inst.category?.toLowerCase().includes(term)
      ).slice(0, 50); // Limit to 50 results for speed
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, dbInstruments]);

  // Fetch instruments from database
  useEffect(() => {
    fetchInstruments();
  }, [user?.token]);

  const fetchInstruments = async () => {
    try {
      setLoadingInstruments(true);
      // Try user-specific endpoint first, fallback to public
      const endpoint = user?.token ? '/api/instruments/user' : '/api/instruments/public';
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const { data } = await axios.get(endpoint, { headers });
      setDbInstruments(data || []);
    } catch (error) {
      console.error('Error fetching instruments:', error);
      // Fallback to public endpoint
      try {
        const { data } = await axios.get('/api/instruments/public');
        setDbInstruments(data || []);
      } catch (err) {
        console.error('Fallback also failed:', err);
      }
    } finally {
      setLoadingInstruments(false);
    }
  };

  // Fetch crypto data (separate from Zerodha)
  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoData = async () => {
    try {
      const { data } = await axios.get('/api/binance/prices');
      setCryptoData(data);
    } catch (error) {
      // Silent fail - crypto data may not be available
    }
  };

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('ntrader_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Get price for an instrument by token, pair, or demo mock data
  const getPrice = (token, pair, instrument) => {
    // Check if it's a demo instrument with mock data
    if (instrument?.isDemo) {
      // Add small random fluctuation to mock price for realism
      const fluctuation = (Math.random() - 0.5) * 0.02 * instrument.mockPrice;
      return {
        ltp: instrument.mockPrice + fluctuation,
        change: instrument.mockChange,
        changePercent: instrument.mockChange
      };
    }
    // Check crypto data first (by pair like BTCUSDT)
    if (pair && cryptoData[pair]) {
      return cryptoData[pair];
    }
    // Then check Angel One market data (by token)
    if (token && marketData[token]) {
      return marketData[token];
    }
    return { ltp: 0, change: 0, changePercent: 0 };
  };

  const addToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  const isInWatchlist = (symbol) => watchlist.includes(symbol);

  // Get all instruments from database
  const getAllInstruments = () => {
    if (dbInstruments.length > 0) {
      return dbInstruments.map(inst => ({
        ...inst,
        symbol: inst.symbol,
        name: inst.name,
        exchange: inst.exchange,
        token: inst.token,
        segment: inst.segment,
        instrumentType: inst.instrumentType,
        category: inst.category,
        lotSize: inst.lotSize || 1
      }));
    }
    return [];
  };

  // Filter instruments by active segment
  const getFilteredInstruments = () => {
    const allInstruments = getAllInstruments();
    const term = searchTerm.toLowerCase();
    
    // First filter by search term if present
    let filtered = allInstruments;
    if (term) {
      filtered = allInstruments.filter(inst => 
        inst.symbol?.toLowerCase().includes(term) ||
        inst.name?.toLowerCase().includes(term)
      );
    }
    
    // Then filter by segment
    switch (activeSegment) {
      case 'NSE':
        return filtered.filter(inst => 
          (inst.exchange === 'NSE' && (inst.instrumentType === 'INDEX' || inst.instrumentType === 'STOCK' || inst.segment === 'EQUITY')) ||
          inst.category === 'INDICES' || inst.category === 'STOCKS'
        );
      case 'NSE_FO':
        return filtered.filter(inst => 
          (inst.exchange === 'NFO' || inst.segment === 'FNO' || inst.segment === 'NFO') &&
          (inst.instrumentType === 'FUTURES' || inst.instrumentType === 'OPTIONS')
        );
      case 'MCX':
        return filtered.filter(inst => 
          inst.exchange === 'MCX' || inst.segment === 'MCX' || inst.category === 'MCX'
        );
      case 'BSE_FO':
        return filtered.filter(inst => 
          inst.exchange === 'BFO' || inst.segment === 'BFO' || inst.exchange === 'BSE'
        );
      case 'Currency':
        return filtered.filter(inst => 
          inst.exchange === 'CDS' || inst.segment === 'CURRENCY' || inst.category === 'CURRENCY'
        );
      case 'Crypto':
        // Return crypto instruments from database + live Binance data
        const cryptoInsts = filtered.filter(inst => 
          inst.isCrypto || inst.segment === 'CRYPTO' || inst.category === 'CRYPTO'
        );
        // Add Binance crypto if available
        if (Object.keys(cryptoData).length > 0) {
          const binanceCryptos = Object.values(cryptoData).map(c => ({
            symbol: c.symbol,
            name: c.pair,
            exchange: 'BINANCE',
            token: c.pair,
            pair: c.pair,
            segment: 'CRYPTO',
            category: 'CRYPTO',
            instrumentType: 'CRYPTO',
            isCrypto: true,
            ltp: c.ltp,
            change: c.change,
            changePercent: c.changePercent
          }));
          return [...cryptoInsts, ...binanceCryptos.filter(bc => 
            !term || bc.symbol.toLowerCase().includes(term) || bc.name.toLowerCase().includes(term)
          )];
        }
        return cryptoInsts;
      default:
        return filtered;
    }
  };

  const filteredInstruments = getFilteredInstruments();

  return (
    <aside className="w-72 bg-dark-800 border-r border-dark-600 flex flex-col">
      {/* Market Status Indicator */}
      <div className="px-3 py-2 border-b border-dark-600 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${marketStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={marketStatus.connected ? 'text-green-400' : 'text-red-400'}>
            {marketStatus.connected ? 'Live' : 'Offline'}
          </span>
        </div>
        {marketStatus.connected && marketStatus.lastUpdate && (
          <span className="text-gray-500">
            {new Date(marketStatus.lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Segment Tabs - Like screenshot */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-dark-600">
        {segmentTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              activeSegment === tab.id 
                ? 'bg-green-600 text-white' 
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-dark-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Instruments List */}
      <div className="flex-1 overflow-y-auto">
        {loadingInstruments ? (
          <div className="p-4 text-center text-gray-400">
            <RefreshCw className="animate-spin inline mr-2" size={16} />
            Loading instruments...
          </div>
        ) : filteredInstruments.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No instruments found</p>
            <p className="mt-2 text-xs">
              {activeSegment === 'Crypto' ? 'Loading crypto from Binance...' : 'Try a different segment or search'}
            </p>
          </div>
        ) : (
          filteredInstruments.map(inst => {
            const priceData = inst.isCrypto ? inst : getPrice(inst.token, inst.pair, inst);
            return (
              <InstrumentRow
                key={inst._id || inst.pair || `${inst.exchange}-${inst.symbol}`}
                instrument={{
                  ...inst, 
                  ltp: priceData.ltp || inst.ltp || 0, 
                  change: priceData.change || inst.change || 0, 
                  changePercent: priceData.changePercent || inst.changePercent || 0
                }}
                isSelected={selectedInstrument?.symbol === inst.symbol}
                onSelect={() => onSelectInstrument({...inst, ltp: priceData.ltp || inst.ltp || 0})}
                quickMode={quickMode}
                onBuySell={onBuySell}
                inWatchlist={isInWatchlist(inst.symbol)}
                onAddToWatchlist={() => addToWatchlist(inst.symbol)}
                onRemoveFromWatchlist={() => removeFromWatchlist(inst.symbol)}
                isCrypto={inst.isCrypto}
                isDemo={inst.isDemo}
              />
            );
          })
        )}
      </div>
    </aside>
  );
};

const InstrumentRow = ({ instrument, isSelected, onSelect, isCall, isPut, isFuture, isCrypto, isDemo, quickMode, onBuySell, inWatchlist, onRemoveFromWatchlist, onAddToWatchlist }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Determine symbol color based on type
  const getSymbolColor = () => {
    if (isDemo) return 'text-purple-400';
    if (isCrypto) return 'text-orange-400';
    if (isCall || instrument.optionType === 'CE') return 'text-green-400';
    if (isPut || instrument.optionType === 'PE') return 'text-red-400';
    if (isFuture || instrument.instrumentType === 'FUTURES') return 'text-yellow-400';
    return 'text-white';
  };

  // Format price - use $ for crypto, ₹ for others
  const formatPrice = (price) => {
    if (!price || price <= 0) return '-';
    if (isCrypto || instrument.isCrypto) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const changePercent = parseFloat(instrument.changePercent) || 0;
  const isPositive = changePercent >= 0;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-dark-700 ${
        isSelected 
          ? 'bg-dark-700' 
          : 'hover:bg-dark-750'
      }`}
    >
      {/* Left: Symbol and Name */}
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm uppercase ${getSymbolColor()}`}>
          {instrument.symbol}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {instrument.name || instrument.symbol}
        </div>
      </div>
      
      {/* Right: Price and Change */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-medium text-gray-300">
          {formatPrice(instrument.ltp) || '-'}
        </div>
        <div className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {changePercent !== 0 ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '+0.00%'}
        </div>
      </div>

      {/* Action Buttons - Show on hover */}
      {isHovered && (
        <div className="flex items-center gap-1 ml-2">
          {/* Buy/Sell Buttons - Indian Standard: S left, B right */}
          <button 
            onClick={(e) => { e.stopPropagation(); onBuySell('sell', instrument); }}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded font-medium"
          >
            S
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onBuySell('buy', instrument); }}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded font-medium"
          >
            B
          </button>
        </div>
      )}
    </div>
  );
};

const ChartPanel = ({ selectedInstrument, marketData }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [chartInterval, setChartInterval] = useState('FIFTEEN_MINUTE');
  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const lastCandleRef = useRef(null);

  // Update live price from marketData (Socket.IO) - same source as instruments panel
  useEffect(() => {
    if (selectedInstrument?.token && marketData[selectedInstrument.token]) {
      const data = marketData[selectedInstrument.token];
      setLivePrice({
        ltp: data.ltp,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        change: data.change,
        changePercent: data.changePercent
      });

      // Update the last candle in real-time
      if (candlestickSeriesRef.current && lastCandleRef.current && data.ltp) {
        const now = Math.floor(Date.now() / 1000);
        const intervalSeconds = getIntervalSeconds(chartInterval);
        const candleTime = Math.floor(now / intervalSeconds) * intervalSeconds;
        
        // Update or create new candle
        if (lastCandleRef.current.time === candleTime) {
          // Update existing candle
          const updatedCandle = {
            time: candleTime,
            open: lastCandleRef.current.open,
            high: Math.max(lastCandleRef.current.high, data.ltp),
            low: Math.min(lastCandleRef.current.low, data.ltp),
            close: data.ltp
          };
          lastCandleRef.current = updatedCandle;
          candlestickSeriesRef.current.update(updatedCandle);
        } else {
          // New candle
          const newCandle = {
            time: candleTime,
            open: data.ltp,
            high: data.ltp,
            low: data.ltp,
            close: data.ltp
          };
          lastCandleRef.current = newCandle;
          candlestickSeriesRef.current.update(newCandle);
        }
      }
    }
  }, [selectedInstrument?.token, marketData, chartInterval]);

  // Get interval in seconds
  const getIntervalSeconds = (interval) => {
    const map = {
      'ONE_MINUTE': 60,
      'FIVE_MINUTE': 300,
      'FIFTEEN_MINUTE': 900,
      'THIRTY_MINUTE': 1800,
      'ONE_HOUR': 3600,
      'ONE_DAY': 86400
    };
    return map[interval] || 900;
  };

  // Map chart interval to Binance interval format
  const getBinanceInterval = (interval) => {
    const map = {
      'ONE_MINUTE': '1m',
      'FIVE_MINUTE': '5m',
      'FIFTEEN_MINUTE': '15m',
      'THIRTY_MINUTE': '30m',
      'ONE_HOUR': '1h',
      'ONE_DAY': '1d'
    };
    return map[interval] || '15m';
  };

  // Generate demo candle data based on mock price
  const generateDemoCandles = (basePrice) => {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 500; i >= 0; i--) {
      const time = now - i * 900; // 15 min intervals
      const volatility = basePrice * 0.02;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      candles.push({ time, open, high, low, close, volume: Math.random() * 100000 });
    }
    return candles;
  };

  // Fetch candle data from Zerodha, Binance, or generate demo data
  const fetchCandleData = async (instrument, interval) => {
    if (!instrument) return null;
    
    try {
      setLoading(true);
      
      // Check if it's a demo instrument - generate mock candles
      if (instrument.isDemo) {
        return generateDemoCandles(instrument.mockPrice || 1000);
      }
      
      // Check if it's a crypto instrument
      if (instrument.isCrypto || instrument.exchange === 'BINANCE') {
        const binanceInterval = getBinanceInterval(interval);
        const { data } = await axios.get(`/api/binance/candles/${instrument.pair || instrument.symbol}`, {
          params: { interval: binanceInterval, limit: 500 }
        });
        return data;
      }
      
      // Use Zerodha historical data API
      if (!instrument.token) return generateSampleData();
      
      try {
        const { data } = await axios.get(`/api/zerodha/historical/${instrument.token}`, {
          params: { interval: interval }
        });
        if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.log('Zerodha historical not available, using sample data');
      }
      
      // Fallback to generated sample data based on current price
      const currentPrice = instrument.ltp || 100;
      return generateDemoCandles(currentPrice);
    } catch (error) {
      console.error('Failed to fetch candle data:', error);
      return generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Fetch live price for the selected instrument
  const fetchLivePrice = async () => {
    if (!selectedInstrument) return;
    
    try {
      // Check if it's a demo instrument - use mock data
      if (selectedInstrument.isDemo) {
        const fluctuation = (Math.random() - 0.5) * 0.02 * selectedInstrument.mockPrice;
        setLivePrice({
          ltp: selectedInstrument.mockPrice + fluctuation,
          open: selectedInstrument.mockPrice * 0.99,
          high: selectedInstrument.mockPrice * 1.02,
          low: selectedInstrument.mockPrice * 0.98,
          close: selectedInstrument.mockPrice,
          change: selectedInstrument.mockChange,
          changePercent: selectedInstrument.mockChange
        });
        return;
      }
      
      // Check if it's crypto
      if (selectedInstrument.isCrypto || selectedInstrument.exchange === 'BINANCE') {
        const { data } = await axios.get(`/api/binance/price/${selectedInstrument.pair || selectedInstrument.symbol}`);
        setLivePrice(data);
        return;
      }
      
      // Otherwise use Zerodha
      if (!selectedInstrument.token) return;
      const { data } = await axios.get('/api/zerodha/market-data');
      if (data[selectedInstrument.token]) {
        setLivePrice(data[selectedInstrument.token]);
      }
    } catch (error) {
      console.error('Failed to fetch live price:', error);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#111111' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f1f1f' },
        horzLines: { color: '#1f1f1f' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    candlestickSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    volumeSeriesRef.current = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Load data when instrument or interval changes
  useEffect(() => {
    const loadData = async () => {
      if (!selectedInstrument || !candlestickSeriesRef.current) return;
      
      const candles = await fetchCandleData(selectedInstrument, chartInterval);
      if (candles && candles.length > 0) {
        candlestickSeriesRef.current.setData(candles);
        
        // Generate volume data from candles
        const volumeData = candles.map(c => ({
          time: c.time,
          value: c.volume || Math.random() * 1000000,
          color: c.close >= c.open ? '#22c55e80' : '#ef444480'
        }));
        volumeSeriesRef.current.setData(volumeData);
        
        chartRef.current?.timeScale().fitContent();
      }
    };
    
    loadData();
    fetchLivePrice();
    
    // Refresh live price every 5 seconds
    const interval = setInterval(fetchLivePrice, 5000);
    return () => clearInterval(interval);
  }, [selectedInstrument, chartInterval]);

  const intervals = [
    { label: '1m', value: 'ONE_MINUTE' },
    { label: '5m', value: 'FIVE_MINUTE' },
    { label: '15m', value: 'FIFTEEN_MINUTE' },
    { label: '30m', value: 'THIRTY_MINUTE' },
    { label: '1h', value: 'ONE_HOUR' },
    { label: '1D', value: 'ONE_DAY' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-dark-800">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Chart</span>
            {loading && <RefreshCw size={14} className="animate-spin text-green-400" />}
          </div>
          {selectedInstrument && (
            <div className="flex items-center gap-3">
              <span className={`font-medium ${selectedInstrument.isDemo ? 'text-purple-400' : selectedInstrument.isCrypto ? 'text-orange-400' : 'text-green-400'}`}>
                {selectedInstrument.symbol}
                {selectedInstrument.isDemo && <span className="ml-1 text-xs bg-purple-600 px-1 rounded">DEMO</span>}
              </span>
              <span className="text-gray-400 text-sm">{selectedInstrument.exchange}</span>
              {livePrice && (
                <>
                  <span className={`font-mono font-bold ${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedInstrument.isCrypto ? '$' : '₹'}{livePrice.ltp?.toLocaleString(undefined, selectedInstrument.isCrypto ? {minimumFractionDigits: 2, maximumFractionDigits: 2} : {})}
                  </span>
                  <span className={`text-sm ${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {livePrice.change >= 0 ? '+' : ''}{livePrice.changePercent}%
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        
        {selectedInstrument && livePrice && (
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>O: {selectedInstrument.isCrypto ? '$' : '₹'}{livePrice.open?.toLocaleString()}</span>
            <span>H: {selectedInstrument.isCrypto ? '$' : '₹'}{livePrice.high?.toLocaleString()}</span>
            <span>L: {selectedInstrument.isCrypto ? '$' : '₹'}{livePrice.low?.toLocaleString()}</span>
            <span>C: {selectedInstrument.isCrypto ? '$' : '₹'}{livePrice.close?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative">
        {!selectedInstrument ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <BarChart2 size={48} className="mb-4 opacity-30" />
            <p>Select an instrument to view chart</p>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>

      {/* Timeframe Selector */}
      {selectedInstrument && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-dark-600 text-sm">
          {intervals.map(tf => (
            <button
              key={tf.value}
              onClick={() => setChartInterval(tf.value)}
              className={`px-3 py-1 rounded ${chartInterval === tf.value ? 'bg-green-600 text-white' : 'hover:bg-dark-600 text-gray-400 hover:text-white'}`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PositionsPanel = ({ activeTab, setActiveTab, quickMode, setQuickMode, walletData, user, marketData, refreshKey }) => {
  const [positions, setPositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPnL, setTotalPnL] = useState(0);

  useEffect(() => {
    if (user?.token) {
      fetchPositions();
      const interval = setInterval(fetchPositions, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [user?.token, refreshKey]);

  const fetchPositions = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      // Fetch all data for all tabs to keep counts updated
      const [positionsRes, pendingRes, historyRes] = await Promise.all([
        axios.get('/api/trading/positions?status=OPEN', { headers }),
        axios.get('/api/trading/pending-orders', { headers }),
        axios.get('/api/trading/history', { headers })
      ]);
      
      setPositions(positionsRes.data || []);
      setPendingOrders(pendingRes.data || []);
      setHistory(historyRes.data || []);
      
      const pnl = (positionsRes.data || []).reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
      setTotalPnL(pnl);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleClosePosition = async (tradeId, position) => {
    try {
      setLoading(true);
      // Get live bid/ask prices for the position
      const liveData = marketData[position?.token] || {};
      const bidPrice = liveData.bid || liveData.ltp || position?.currentPrice;
      const askPrice = liveData.ask || liveData.ltp || position?.currentPrice;
      
      await axios.post(`/api/trading/close/${tradeId}`, {
        bidPrice,
        askPrice
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchPositions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error closing position');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (tradeId) => {
    try {
      await axios.post(`/api/trading/cancel/${tradeId}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchPositions();
    } catch (error) {
      alert(error.response?.data?.message || 'Error cancelling order');
    }
  };

  const tabs = [
    { id: 'positions', label: 'Positions', count: positions.length },
    { id: 'pending', label: 'Pending', count: pendingOrders.length },
    { id: 'history', label: 'History', count: history.length },
  ];

  // Indian Net Trading: BUY position uses Bid (sell) price, SELL position uses Ask (buy) price for P&L
  const getCurrentPrice = (position) => {
    const token = position.token;
    const symbol = position.symbol;
    const side = position.side;
    
    let data = null;
    if (token && marketData?.[token]) {
      data = marketData[token];
    } else if (symbol && marketData?.[symbol]) {
      data = marketData[symbol];
    } else {
      // Search through marketData for matching symbol
      for (const [key, mData] of Object.entries(marketData || {})) {
        if (mData.symbol === symbol) {
          data = mData;
          break;
        }
      }
    }
    
    if (!data) return 0;
    
    // Indian Net Trading Logic:
    // BUY position: Show Bid price (price at which you can sell/exit)
    // SELL position: Show Ask price (price at which you can buy/exit)
    if (side === 'BUY') {
      return data.bid || data.ltp || data.last_price || 0;
    } else {
      return data.ask || data.ltp || data.last_price || 0;
    }
  };

  return (
    <div className="h-48 bg-dark-800 border-t border-dark-600 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center justify-between px-4 border-b border-dark-600">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Quick</span>
            <button
              onClick={() => setQuickMode(!quickMode)}
              className={`w-10 h-5 rounded-full transition ${
                quickMode ? 'bg-green-500' : 'bg-dark-600'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition transform ${
                quickMode ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">P/L: </span>
            <span className={`font-medium ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-8 gap-2 px-4 py-2 text-xs text-gray-400 border-b border-dark-700">
        <div>Symbol</div>
        <div>Side</div>
        <div className="text-right">Qty</div>
        <div className="text-right">Entry</div>
        <div className="text-right">LTP</div>
        <div className="text-right">Charges</div>
        <div className="text-right">P&L</div>
        <div className="text-center">Action</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'positions' && positions.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No open positions</div>
        )}
        {activeTab === 'positions' && positions.map(pos => {
          const ltp = getCurrentPrice(pos) || pos.currentPrice || pos.entryPrice;
          const pnl = pos.side === 'BUY' 
            ? (ltp - pos.entryPrice) * pos.quantity 
            : (pos.entryPrice - ltp) * pos.quantity;
          return (
            <div key={pos._id} className="grid grid-cols-8 gap-2 px-4 py-2 text-sm border-b border-dark-700 hover:bg-dark-700">
              <div className="truncate font-medium">{pos.symbol}</div>
              <div className={pos.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>{pos.side}</div>
              <div className="text-right">{pos.quantity}</div>
              <div className="text-right">₹{pos.entryPrice?.toFixed(2)}</div>
              <div className="text-right">₹{ltp?.toFixed(2)}</div>
              <div className="text-right text-yellow-400" title={`Spread: ${pos.spread || 0} pts, Comm: ₹${pos.commission || 0}`}>
                ₹{((pos.commission || 0)).toFixed(2)}
              </div>
              <div className={`text-right font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
              </div>
              <div className="text-center">
                <button 
                  onClick={() => handleClosePosition(pos._id, pos)}
                  disabled={loading}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })}

        {activeTab === 'pending' && pendingOrders.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No pending orders</div>
        )}
        {activeTab === 'pending' && pendingOrders.map(order => (
          <div key={order._id} className="grid grid-cols-8 gap-2 px-4 py-2 text-sm border-b border-dark-700 hover:bg-dark-700">
            <div className="truncate font-medium">{order.symbol}</div>
            <div className={order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>{order.side}</div>
            <div className="text-right">{order.quantity}</div>
            <div className="text-right">₹{order.limitPrice?.toFixed(2) || '-'}</div>
            <div className="text-right">-</div>
            <div className="text-right text-yellow-400">₹{(order.commission || 0).toFixed(2)}</div>
            <div className="text-right text-gray-400">{order.orderType}</div>
            <div className="text-center">
              <button 
                onClick={() => handleCancelOrder(order._id)}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'history' && history.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No trade history</div>
        )}
        {activeTab === 'history' && history.map(trade => (
          <div key={trade._id} className="grid grid-cols-8 gap-2 px-4 py-2 text-sm border-b border-dark-700 hover:bg-dark-700">
            <div className="truncate font-medium">{trade.symbol}</div>
            <div className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>{trade.side}</div>
            <div className="text-right">{trade.quantity}</div>
            <div className="text-right">₹{trade.entryPrice?.toFixed(2)}</div>
            <div className="text-right">₹{trade.exitPrice?.toFixed(2) || '-'}</div>
            <div className="text-right text-yellow-400">₹{(trade.commission || 0).toFixed(2)}</div>
            <div className={`text-right font-medium ${(trade.realizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(trade.realizedPnL || 0) >= 0 ? '+' : ''}₹{(trade.realizedPnL || 0).toFixed(2)}
            </div>
            <div className="text-center text-xs text-gray-400">{trade.closeReason || 'CLOSED'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PortfolioPanel = ({ walletData, onOpenWallet, user, marketData }) => {
  const [activeView, setActiveView] = useState('wallet');
  const [positions, setPositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    if (user?.token) {
      fetchData();
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    }
  }, [user?.token]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [posRes, ordersRes] = await Promise.all([
        axios.get('/api/trading/positions?status=OPEN', { headers }),
        axios.get('/api/trading/pending-orders', { headers })
      ]);
      setPositions(posRes.data || []);
      setPendingOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
    }
  };

  const handleClosePosition = async (tradeId, position) => {
    try {
      const liveData = marketData?.[position?.token] || {};
      const bidPrice = liveData.bid || liveData.ltp || position?.currentPrice;
      const askPrice = liveData.ask || liveData.ltp || position?.currentPrice;
      
      await axios.post(`/api/trading/close/${tradeId}`, { bidPrice, askPrice }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing position');
    }
  };

  return (
    <aside className="w-72 bg-dark-800 border-l border-dark-600 flex flex-col">
      {/* View Tabs */}
      <div className="flex border-b border-dark-600">
        {['Wallet', 'Positions', 'Orders'].map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view.toLowerCase())}
            className={`flex-1 px-2 py-2 text-sm ${
              activeView === view.toLowerCase()
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:bg-dark-700'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Wallet View */}
      {activeView === 'wallet' && (
        <div className="flex-1 overflow-y-auto">
          {/* Available Margin - Highlighted */}
          <div className="p-4 bg-gradient-to-r from-green-900/30 to-dark-800 border-b border-dark-600">
            <div className="text-xs text-gray-400 mb-1">Available Margin</div>
            <div className="text-2xl font-bold text-green-400">
              ₹{walletData?.availableMargin?.toLocaleString() || walletData?.marginAvailable?.toLocaleString() || '0'}
            </div>
            {walletData?.rmsStatus === 'BLOCKED' && (
              <div className="text-xs text-red-400 mt-1">⚠️ Trading Blocked: {walletData?.rmsBlockReason}</div>
            )}
          </div>

          {/* Wallet Breakdown */}
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Wallet Breakdown</div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Cash Balance</span>
              <span>₹{walletData?.cashBalance?.toLocaleString() || '0'}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Used Margin</span>
              <span className="text-yellow-400">₹{walletData?.usedMargin?.toLocaleString() || '0'}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Collateral</span>
              <span>₹{walletData?.collateralValue?.toLocaleString() || '0'}</span>
            </div>

            <div className="border-t border-dark-600 pt-3 mt-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">P&L</div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Unrealized P&L</span>
                <span className={walletData?.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {walletData?.unrealizedPnL >= 0 ? '+' : ''}₹{walletData?.unrealizedPnL?.toLocaleString() || '0'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Realized P&L</span>
                <span className={walletData?.realizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {walletData?.realizedPnL >= 0 ? '+' : ''}₹{walletData?.realizedPnL?.toLocaleString() || '0'}
                </span>
              </div>

              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-dark-700">
                <span className="text-gray-400">Today's P&L</span>
                <span className={(walletData?.todayRealizedPnL || 0) + (walletData?.todayUnrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {((walletData?.todayRealizedPnL || 0) + (walletData?.todayUnrealizedPnL || 0)) >= 0 ? '+' : ''}
                  ₹{((walletData?.todayRealizedPnL || 0) + (walletData?.todayUnrealizedPnL || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Add Funds Button */}
          <div className="p-4 border-t border-dark-600 mt-auto">
            <button 
              onClick={onOpenWallet}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded text-sm transition"
            >
              Add Funds
            </button>
          </div>
        </div>
      )}

      {/* Positions View */}
      {activeView === 'positions' && (
        <div className="flex-1 overflow-y-auto">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center h-full">
              <div className="w-16 h-16 mb-4 opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No open positions</p>
              <p className="text-gray-500 text-xs mt-1">Enable Quick Trade to start trading</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-600">
              {positions.map(pos => {
                const liveData = marketData?.[pos.token] || {};
                const currentPrice = pos.side === 'BUY' 
                  ? (liveData.bid || liveData.ltp || pos.currentPrice)
                  : (liveData.ask || liveData.ltp || pos.currentPrice);
                const pnl = pos.side === 'BUY' 
                  ? (currentPrice - pos.entryPrice) * pos.quantity
                  : (pos.entryPrice - currentPrice) * pos.quantity;
                return (
                  <div key={pos._id} className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{pos.symbol}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pos.side === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {pos.side}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Qty: {pos.quantity}</span>
                      <span>Entry: ₹{pos.entryPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleClosePosition(pos._id, pos)}
                        className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Orders View */}
      {activeView === 'orders' && (
        <div className="flex-1 overflow-y-auto">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 text-center h-full">
              <div className="w-16 h-16 mb-4 opacity-30">
                <ListOrdered size={48} className="text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">No pending orders</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-600">
              {pendingOrders.map(order => (
                <div key={order._id} className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{order.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${order.side === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {order.side}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Qty: {order.quantity}</span>
                    <span>Limit: ₹{order.limitPrice?.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-yellow-400">PENDING</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

// Trading Panel - Shows when Quick Trade is ON and instrument is selected
const TradingPanel = ({ instrument, orderType, setOrderType, walletData, onClose, user, marketData = {}, onRefreshWallet, onRefreshPositions }) => {
  const [lots, setLots] = useState('1');
  const [price, setPrice] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [productType, setProductType] = useState('MIS');
  const [orderMode, setOrderMode] = useState('MARKET');
  const [leverage, setLeverage] = useState(1);
  const [availableLeverages, setAvailableLeverages] = useState([1, 2, 5, 10]);
  const [marginPreview, setMarginPreview] = useState(null);
  const [marketStatus, setMarketStatus] = useState({ open: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Determine if crypto
  const isCrypto = instrument?.isCrypto || instrument?.segment === 'CRYPTO' || instrument?.exchange === 'BINANCE';
  
  // Get live price data from marketData
  const liveData = marketData[instrument?.token] || {};
  const livePrice = isCrypto ? (instrument?.ltp || 0) : (liveData.ltp || instrument?.ltp || 0);
  const liveBid = isCrypto ? livePrice : (liveData.bid || livePrice);
  const liveAsk = isCrypto ? livePrice : (liveData.ask || livePrice);
  
  // Price symbol for display
  const priceSymbol = isCrypto ? '$' : '₹';

  // Fetch available leverages and market status
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Crypto markets are always open
        if (isCrypto) {
          setMarketStatus({ open: true, reason: 'Crypto markets are 24/7' });
          const leverageRes = await axios.get('/api/trading/leverages', { headers: { Authorization: `Bearer ${user?.token}` } });
          setAvailableLeverages(leverageRes.data.leverages || [1, 2, 5, 10]);
        } else {
          const [leverageRes, marketRes] = await Promise.all([
            axios.get('/api/trading/leverages', { headers: { Authorization: `Bearer ${user?.token}` } }),
            axios.get('/api/trading/market-status', { params: { exchange: instrument?.exchange || 'NSE' } })
          ]);
          setAvailableLeverages(leverageRes.data.leverages || [1, 2, 5, 10]);
          setMarketStatus(marketRes.data);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    if (user?.token) fetchSettings();
  }, [user?.token, instrument?.exchange, isCrypto]);

  // Set price from live data when instrument changes
  useEffect(() => {
    if (livePrice) {
      setPrice(livePrice.toString());
      setLimitPrice(livePrice.toString());
    }
  }, [instrument?.token]);

  // Determine segment type from database fields
  const isEquity = instrument?.segment === 'EQUITY' && instrument?.instrumentType === 'STOCK';
  const isIndex = instrument?.instrumentType === 'INDEX';
  const isFutures = instrument?.instrumentType === 'FUTURES';
  const isOptions = instrument?.instrumentType === 'OPTIONS';
  const isCall = instrument?.optionType === 'CE';
  const isPut = instrument?.optionType === 'PE';
  const isFnO = isFutures || isOptions;

  // Get lot size from instrument or default based on category
  const getLotSize = () => {
    if (instrument?.lotSize && instrument.lotSize > 1) return instrument.lotSize;
    // Default lot sizes based on category
    const category = instrument?.category?.toUpperCase() || '';
    if (category.includes('NIFTY') && !category.includes('BANK') && !category.includes('FIN') && !category.includes('MID')) return 25;
    if (category.includes('BANKNIFTY')) return 15;
    if (category.includes('FINNIFTY')) return 25;
    if (category.includes('MIDCPNIFTY')) return 50;
    if (category.includes('SENSEX')) return 10;
    return 1;
  };

  const lotSize = getLotSize();
  const totalQuantity = isFnO ? parseInt(lots || 0) * lotSize : parseInt(lots || 0);

  // Fetch margin preview when inputs change
  useEffect(() => {
    const fetchMarginPreview = async () => {
      if (!instrument || !lots || !price) return;
      
      try {
        const { data } = await axios.post('/api/trading/margin-preview', {
          symbol: instrument.symbol,
          exchange: instrument.exchange,
          segment: instrument.segment,
          instrumentType: instrument.instrumentType,
          optionType: instrument.optionType || null,
          strikePrice: instrument.strike || null,
          category: instrument.category,
          productType,
          side: orderType.toUpperCase(),
          quantity: totalQuantity,
          lots: parseInt(lots),
          lotSize: lotSize,
          price: parseFloat(price),
          leverage: leverage
        }, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        setMarginPreview(data);
      } catch (err) {
        console.error('Margin preview error:', err);
      }
    };

    const debounce = setTimeout(fetchMarginPreview, 300);
    return () => clearTimeout(debounce);
  }, [instrument, lots, price, productType, orderType, user, totalQuantity, lotSize, leverage]);

  // Place order
  const handlePlaceOrder = async () => {
    // Check market status for MARKET orders
    if (orderMode === 'MARKET' && !marketStatus.open) {
      setError(marketStatus.reason || 'Market is closed');
      return;
    }

    // Validate funds
    if (marginPreview && !marginPreview.canPlace) {
      setError(`Insufficient funds. Need ₹${marginPreview.shortfall?.toLocaleString()} more`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const orderData = {
        symbol: instrument.symbol,
        token: instrument.token,
        pair: instrument.pair, // For crypto
        isCrypto: isCrypto,
        exchange: instrument.exchange || (isCrypto ? 'BINANCE' : 'NSE'),
        segment: isCrypto ? 'CRYPTO' : (instrument.segment || (instrument.exchange === 'MCX' ? 'MCX' : 'FNO')),
        instrumentType: isCrypto ? 'CRYPTO' : (instrument.instrumentType || 'FUTURES'),
        optionType: instrument.optionType || null,
        strike: instrument.strike || null,
        expiry: instrument.expiry || null,
        category: instrument.category,
        productType,
        orderType: orderMode,
        side: orderType.toUpperCase(),
        quantity: totalQuantity,
        lots: parseInt(lots),
        lotSize: lotSize,
        price: parseFloat(price),
        bidPrice: liveBid, // Send bid price for SELL orders
        askPrice: liveAsk, // Send ask price for BUY orders
        leverage: leverage,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        target: target ? parseFloat(target) : null
      };
      
      console.log('Placing order:', orderData);

      // Add limit price for LIMIT orders
      if (orderMode === 'LIMIT') {
        orderData.limitPrice = parseFloat(limitPrice);
      }
      // Add trigger price for SL orders
      if (orderMode === 'SL' || orderMode === 'SL-M') {
        orderData.triggerPrice = parseFloat(limitPrice);
      }

      const { data } = await axios.post('/api/trading/order', orderData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      const statusMsg = data.trade?.status === 'PENDING' 
        ? `Order placed! Waiting for price to reach ${priceSymbol}${limitPrice}` 
        : `Order executed! Margin: ₹${data.marginBlocked?.toLocaleString()}`;
      
      setSuccess(statusMsg);
      // Refresh wallet and positions after successful order
      if (onRefreshWallet) onRefreshWallet();
      if (onRefreshPositions) onRefreshPositions();
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Product types based on segment
  const getProductTypes = () => {
    if (isCrypto) return [
      { value: 'MIS', label: 'Spot', desc: 'Crypto spot trading' }
    ];
    if (isEquity) return [
      { value: 'CNC', label: 'CNC (Delivery)', desc: 'Hold for days/months' },
      { value: 'MIS', label: 'MIS (Intraday)', desc: 'Square off same day' }
    ];
    if (isFutures || isOptions) return [
      { value: 'MIS', label: 'MIS (Intraday)', desc: 'Square off same day' },
      { value: 'NRML', label: 'NRML (Carry Forward)', desc: 'Hold till expiry' }
    ];
    return [{ value: 'MIS', label: 'MIS', desc: 'Intraday' }];
  };

  // Get segment label
  const getSegmentLabel = () => {
    if (isEquity) return 'EQUITY';
    if (isFutures) return 'FUTURES';
    if (isOptions) return isCall ? 'CALL OPTION (CE)' : 'PUT OPTION (PE)';
    return 'UNKNOWN';
  };

  // Get trading hint
  const getTradingHint = () => {
    if (isCrypto) {
      return orderType === 'buy' ? '🚀 Buy crypto - Profit if price goes UP' : '📉 Sell crypto - Profit if price goes DOWN';
    }
    if (isEquity) {
      if (orderType === 'buy') return productType === 'CNC' ? 'Buy & hold shares in DEMAT' : 'Buy intraday, auto square-off at 3:15 PM';
      return productType === 'MIS' ? 'Short sell intraday only' : 'Sell from holdings';
    }
    if (isFutures) {
      return orderType === 'buy' ? 'Profit if price goes UP' : 'Profit if price goes DOWN';
    }
    if (isOptions) {
      if (isCall) return orderType === 'buy' ? 'Bullish: Profit if price goes UP' : 'Bearish/Neutral: Collect premium';
      if (isPut) return orderType === 'buy' ? 'Bearish: Profit if price goes DOWN' : 'Bullish/Neutral: Collect premium';
    }
    return '';
  };

  return (
    <aside className="w-80 bg-dark-800 border-l border-dark-600 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
        <div>
          <div className={`font-bold ${isCrypto ? 'text-orange-400' : isCall ? 'text-green-400' : isPut ? 'text-red-400' : isFutures ? 'text-yellow-400' : ''}`}>
            {instrument?.symbol}
          </div>
          <div className="text-xs text-gray-400">{instrument?.exchange} • {isCrypto ? 'CRYPTO' : getSegmentLabel()}</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Buy/Sell Toggle with Live Bid/Ask Prices - Indian Standard: SELL left, BUY right */}
      <div className="flex border-b border-dark-600">
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 py-2 font-semibold transition ${
            orderType === 'sell' ? 'bg-red-600 text-white' : 'bg-dark-700 text-gray-400'
          }`}
        >
          <div className="text-xs opacity-70">{isCrypto ? 'Price' : 'Bid'}</div>
          <div className="text-lg">{priceSymbol}{liveBid?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '--'}</div>
          <div className="text-xs">SELL</div>
        </button>
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 py-2 font-semibold transition ${
            orderType === 'buy' ? 'bg-green-600 text-white' : 'bg-dark-700 text-gray-400'
          }`}
        >
          <div className="text-xs opacity-70">{isCrypto ? 'Price' : 'Ask'}</div>
          <div className="text-lg">{priceSymbol}{liveAsk?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '--'}</div>
          <div className="text-xs">BUY</div>
        </button>
      </div>

      {/* Trading Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Trading Hint */}
        <div className={`text-xs p-2 rounded ${orderType === 'buy' ? 'bg-blue-900/30 text-blue-300' : 'bg-red-900/30 text-red-300'}`}>
          {getTradingHint()}
        </div>

        {/* Product Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Product Type</label>
          <div className="space-y-2">
            {getProductTypes().map(pt => (
              <button
                key={pt.value}
                onClick={() => setProductType(pt.value)}
                className={`w-full text-left px-3 py-2 rounded border transition ${
                  productType === pt.value 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="font-medium text-sm">{pt.label}</div>
                <div className="text-xs text-gray-500">{pt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Market Status Warning */}
        {!marketStatus.open && orderMode === 'MARKET' && (
          <div className="bg-yellow-900/30 border border-yellow-500 text-yellow-300 px-3 py-2 rounded text-sm">
            ⚠️ {marketStatus.reason || 'Market is closed'}. Use LIMIT order instead.
          </div>
        )}

        {/* Order Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            {['MARKET', 'LIMIT', 'SL', 'SL-M'].map(ot => (
              <button
                key={ot}
                onClick={() => setOrderMode(ot)}
                disabled={ot === 'MARKET' && !marketStatus.open}
                className={`px-3 py-2 rounded text-sm transition ${
                  orderMode === ot 
                    ? 'bg-green-600 text-white' 
                    : ot === 'MARKET' && !marketStatus.open
                    ? 'bg-dark-700 text-gray-600 cursor-not-allowed'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {ot}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage Selector */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Leverage (Buying Power)</label>
          <div className="flex flex-wrap gap-2">
            {availableLeverages.map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`px-3 py-1.5 rounded text-sm transition ${
                  leverage === lev 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
          {leverage > 1 && (
            <div className="text-xs text-purple-400 mt-1">
              {leverage}x leverage = {leverage}x buying power, {leverage}x risk
            </div>
          )}
        </div>

        {/* Lots / Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            {isFnO ? 'Lots' : 'Quantity'} {isFnO && <span className="text-yellow-400">(1 Lot = {lotSize} qty)</span>}
          </label>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLots(Math.max(1, parseInt(lots || 1) - 1).toString())}
              className="w-10 h-10 bg-dark-600 hover:bg-dark-500 rounded text-xl font-bold"
            >-</button>
            <input
              type="number"
              value={lots}
              onChange={(e) => setLots(e.target.value)}
              className="flex-1 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-center text-lg font-bold focus:outline-none focus:border-green-500"
              min="1"
            />
            <button 
              onClick={() => setLots((parseInt(lots || 1) + 1).toString())}
              className="w-10 h-10 bg-dark-600 hover:bg-dark-500 rounded text-xl font-bold"
            >+</button>
          </div>
          {isFnO && (
            <div className="flex justify-between text-xs mt-2">
              <span className="text-gray-500">Total Qty: <span className="text-white font-medium">{totalQuantity}</span></span>
              <span className="text-gray-500">Value: <span className="text-white">₹{(totalQuantity * parseFloat(price || 0)).toLocaleString()}</span></span>
            </div>
          )}
          {/* Quick lot buttons */}
          {isFnO && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 5, 10, 20].map(l => (
                <button
                  key={l}
                  onClick={() => setLots(l.toString())}
                  className={`flex-1 py-1 text-xs rounded ${lots === l.toString() ? 'bg-green-600' : 'bg-dark-600 hover:bg-dark-500'}`}
                >
                  {l}L
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Limit Price - Only for LIMIT and SL orders */}
        {(orderMode === 'LIMIT' || orderMode === 'SL') && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              {orderMode === 'LIMIT' ? 'Limit Price' : 'Trigger Price'}
            </label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={orderMode === 'LIMIT' ? 'Enter limit price' : 'Enter trigger price'}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              {orderMode === 'LIMIT' 
                ? `Order executes when price ${orderType === 'buy' ? 'falls to' : 'rises to'} ₹${limitPrice || '...'}`
                : `Order triggers when price ${orderType === 'buy' ? 'rises to' : 'falls to'} ₹${limitPrice || '...'}`
              }
            </div>
          </div>
        )}

        {/* Stop Loss & Target */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Stop Loss (Optional)</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="SL Price"
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Target (Optional)</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target Price"
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        {(stopLoss || target) && (
          <div className="text-xs text-gray-500">
            {stopLoss && <span className="text-red-400">SL: ₹{stopLoss}</span>}
            {stopLoss && target && ' | '}
            {target && <span className="text-green-400">Target: ₹{target}</span>}
            {' - Auto exit when price hits'}
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-500 text-green-300 px-3 py-2 rounded text-sm">
            {success}
          </div>
        )}

        {/* Margin Info */}
        <div className="bg-dark-700 rounded p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available Balance</span>
            <span className="text-green-400">₹{marginPreview?.availableBalance?.toLocaleString() || walletData?.availableMargin?.toLocaleString() || '0'}</span>
          </div>
          {leverage > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Effective Buying Power</span>
              <span className="text-purple-400">₹{((marginPreview?.availableBalance || 0) * leverage).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Required Margin</span>
            <span className={marginPreview?.canPlace === false ? 'text-red-400' : ''}>
              ₹{marginPreview?.marginRequired?.toLocaleString() || '--'}
            </span>
          </div>
          {marginPreview && !marginPreview.canPlace && (
            <div className="text-xs text-red-400 mt-2">
              ⚠️ {marginPreview.reason}
            </div>
          )}
          {isOptions && orderType === 'sell' && (
            <div className="text-xs text-yellow-400 mt-2">
              ⚠️ Option selling requires higher margin (SPAN + Exposure)
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-dark-600">
        <button
          onClick={handlePlaceOrder}
          disabled={loading || (marginPreview && !marginPreview.canPlace)}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            orderType === 'buy' 
              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800' 
              : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Placing Order...' : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${instrument?.symbol}`}
        </button>
        <div className="text-center text-xs text-gray-500 mt-2">
          {productType} • {orderMode}
        </div>
      </div>
    </aside>
  );
};

// Mobile Components - Uses same database instruments as desktop
const MobileInstrumentsPanel = ({ selectedInstrument, onSelectInstrument, onBuySell, user, marketData = {} }) => {
  const [expandedSegments, setExpandedSegments] = useState([]); // Start with all collapsed
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dbInstruments, setDbInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [activeSegment, setActiveSegment] = useState('NSE'); // Segment tabs like desktop
  const [cryptoData, setCryptoData] = useState({});
  const searchInputRef = useRef(null);
  
  // Segment tabs configuration (same as desktop)
  const segmentTabs = [
    { id: 'NSE', label: 'NSE' },
    { id: 'NSE_FO', label: 'F&O' },
    { id: 'MCX', label: 'MCX' },
    { id: 'Crypto', label: 'Crypto' }
  ];

  // Debounce search for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fast search
  useEffect(() => {
    if (debouncedSearch.length >= 1) {
      const term = debouncedSearch.toLowerCase();
      const results = dbInstruments.filter(inst => 
        inst.symbol?.toLowerCase().includes(term) ||
        inst.name?.toLowerCase().includes(term) ||
        inst.category?.toLowerCase().includes(term)
      ).slice(0, 50);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch, dbInstruments]);

  // Fetch instruments from database (same as desktop)
  useEffect(() => {
    fetchInstruments();
  }, [user?.token]);

  const fetchInstruments = async () => {
    try {
      setLoading(true);
      const endpoint = user?.token ? '/api/instruments/user' : '/api/instruments/public';
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const { data } = await axios.get(endpoint, { headers });
      setDbInstruments(data || []);
    } catch (error) {
      try {
        const { data } = await axios.get('/api/instruments/public');
        setDbInstruments(data || []);
      } catch (err) {
        console.error('Error fetching instruments:', err);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch crypto data from Binance
  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        const { data } = await axios.get('/api/binance/prices');
        setCryptoData(data || {});
      } catch (error) {
        // Silent fail
      }
    };
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSegment = (segment) => {
    setExpandedSegments(prev => 
      prev.includes(segment) ? prev.filter(s => s !== segment) : [...prev, segment]
    );
  };

  // Filter instruments by active segment (same logic as desktop)
  const getFilteredInstruments = () => {
    const term = searchTerm.toLowerCase();
    let filtered = dbInstruments;
    
    if (term) {
      filtered = dbInstruments.filter(inst => 
        inst.symbol?.toLowerCase().includes(term) ||
        inst.name?.toLowerCase().includes(term)
      );
    }
    
    switch (activeSegment) {
      case 'NSE':
        return filtered.filter(inst => 
          (inst.exchange === 'NSE' && (inst.instrumentType === 'INDEX' || inst.instrumentType === 'STOCK' || inst.segment === 'EQUITY')) ||
          inst.category === 'INDICES' || inst.category === 'STOCKS'
        );
      case 'NSE_FO':
        return filtered.filter(inst => 
          (inst.exchange === 'NFO' || inst.segment === 'FNO' || inst.segment === 'NFO') &&
          (inst.instrumentType === 'FUTURES' || inst.instrumentType === 'OPTIONS')
        );
      case 'MCX':
        return filtered.filter(inst => 
          inst.exchange === 'MCX' || inst.segment === 'MCX' || inst.category === 'MCX'
        );
      case 'Crypto':
        const cryptoInsts = filtered.filter(inst => 
          inst.isCrypto || inst.segment === 'CRYPTO' || inst.category === 'CRYPTO'
        );
        // Add Binance crypto if available
        if (Object.keys(cryptoData).length > 0) {
          const binanceCryptos = Object.values(cryptoData).map(c => ({
            _id: c.pair,
            symbol: c.symbol,
            name: c.pair,
            exchange: 'BINANCE',
            token: c.pair,
            pair: c.pair,
            segment: 'CRYPTO',
            category: 'CRYPTO',
            instrumentType: 'CRYPTO',
            isCrypto: true,
            ltp: c.ltp,
            change: c.change,
            changePercent: c.changePercent
          }));
          return [...cryptoInsts, ...binanceCryptos.filter(bc => 
            !term || bc.symbol.toLowerCase().includes(term) || bc.name.toLowerCase().includes(term)
          )];
        }
        return cryptoInsts;
      default:
        return filtered;
    }
  };
  
  const filteredInstruments = getFilteredInstruments();

  // Group instruments by category
  const instrumentsByCategory = filteredInstruments.reduce((acc, inst) => {
    const cat = inst.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(inst);
    return acc;
  }, {});

  const categories = Object.keys(instrumentsByCategory).sort();

  // Get price from market data
  const getPrice = (token) => {
    const data = marketData[token];
    return data ? { ltp: data.ltp, change: data.change, changePercent: data.changePercent } : { ltp: 0, change: 0, changePercent: 0 };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Segment Tabs - Like desktop */}
      <div className="flex gap-1 p-2 bg-dark-800 border-b border-dark-600 overflow-x-auto">
        {segmentTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition ${
              activeSegment === tab.id 
                ? 'bg-green-600 text-white' 
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Search */}
      <div className="p-3 bg-dark-800 border-b border-dark-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search NIFTY, BANKNIFTY..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results - Show when searching */}
      {searchTerm.length >= 1 && (
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No instruments found for "{searchTerm}"
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs text-gray-500 bg-dark-700 sticky top-0">
                {searchResults.length} results
              </div>
              {searchResults.map(inst => {
                const priceData = getPrice(inst.token);
                return (
                  <MobileInstrumentRow
                    key={inst._id}
                    instrument={{...inst, ...priceData}}
                    isCall={inst.optionType === 'CE'}
                    isPut={inst.optionType === 'PE'}
                    isFuture={inst.instrumentType === 'FUTURES'}
                    isCrypto={inst.isCrypto || inst.segment === 'CRYPTO' || inst.exchange === 'BINANCE'}
                    onSelect={() => { onSelectInstrument({...inst, ...priceData}); setSearchTerm(''); }}
                    onBuy={() => onBuySell('buy', {...inst, ...priceData})}
                    onSell={() => onBuySell('sell', {...inst, ...priceData})}
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Instruments List - Flat list like web view */}
      {!searchTerm && (
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            <RefreshCw className="animate-spin inline mr-2" size={16} />
            Loading...
          </div>
        ) : filteredInstruments.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No instruments found</p>
            <p className="mt-2 text-xs">
              {activeSegment === 'Crypto' ? 'Loading crypto from Binance...' : 'Try a different segment or search'}
            </p>
          </div>
        ) : (
          filteredInstruments.map(inst => {
            const priceData = inst.isCrypto ? inst : getPrice(inst.token);
            return (
              <MobileInstrumentRow
                key={inst._id || inst.pair || `${inst.exchange}-${inst.symbol}`}
                instrument={{
                  ...inst, 
                  ltp: priceData.ltp || inst.ltp || 0, 
                  change: priceData.change || inst.change || 0, 
                  changePercent: priceData.changePercent || inst.changePercent || 0
                }}
                isCall={inst.optionType === 'CE'}
                isPut={inst.optionType === 'PE'}
                isFuture={inst.instrumentType === 'FUTURES'}
                isCrypto={inst.isCrypto || inst.segment === 'CRYPTO' || inst.exchange === 'BINANCE'}
                onSelect={() => onSelectInstrument({...inst, ltp: priceData.ltp || inst.ltp || 0})}
                onBuy={() => onBuySell('buy', {...inst, ltp: priceData.ltp || inst.ltp || 0})}
                onSell={() => onBuySell('sell', {...inst, ltp: priceData.ltp || inst.ltp || 0})}
              />
            );
          })
        )}
      </div>
      )}
    </div>
  );
};

const MobileInstrumentRow = ({ instrument, isCall, isPut, isFuture, isCrypto, onSelect, onBuy, onSell }) => {
  const ltp = instrument.ltp || 0;
  const change = instrument.change || 0;
  const changePercent = instrument.changePercent || 0;
  
  // Check if crypto from instrument properties
  const isCryptoInstrument = isCrypto || instrument.isCrypto || instrument.segment === 'CRYPTO' || instrument.exchange === 'BINANCE';
  
  // Determine symbol color based on type (matching desktop InstrumentRow)
  const getSymbolColor = () => {
    if (isCryptoInstrument) return 'text-orange-400';
    if (isCall || instrument.optionType === 'CE') return 'text-green-400';
    if (isPut || instrument.optionType === 'PE') return 'text-red-400';
    if (isFuture || instrument.instrumentType === 'FUTURES') return 'text-yellow-400';
    return 'text-white';
  };
  
  // Format price - use $ for crypto, ₹ for others (matching desktop)
  const formatPrice = (price) => {
    if (!price || price <= 0) return '--';
    if (isCryptoInstrument) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `₹${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
      <div className="flex-1" onClick={onSelect}>
        <div className={`font-medium text-sm ${getSymbolColor()}`}>
          {instrument.symbol}
        </div>
        <div className="text-xs text-gray-500">
          {instrument.exchange} {instrument.strike ? `• ₹${instrument.strike}` : ''}
        </div>
      </div>
      <div className="text-right mr-3" onClick={onSelect}>
        <div className={`font-mono text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatPrice(ltp)}
        </div>
        <div className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {changePercent ? `${change >= 0 ? '+' : ''}${parseFloat(changePercent).toFixed(2)}%` : '--'}
        </div>
      </div>
      {/* Buy/Sell Buttons - Indian Standard: S left, B right (matching desktop) */}
      <div className="flex gap-1">
        <button 
          onClick={onSell}
          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 rounded font-medium"
        >
          S
        </button>
        <button 
          onClick={onBuy}
          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 rounded font-medium"
        >
          B
        </button>
      </div>
    </div>
  );
};

const MobileChartPanel = ({ selectedInstrument, onBuySell, onBack, marketData = {} }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lastCandleRef = useRef(null);

  // Get live price from marketData
  const livePrice = selectedInstrument?.token && marketData[selectedInstrument.token] 
    ? marketData[selectedInstrument.token] 
    : null;

  useEffect(() => {
    if (!chartContainerRef.current || !selectedInstrument) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: '#111111' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#1f1f1f' }, horzLines: { color: '#1f1f1f' } },
      rightPriceScale: { borderColor: '#2a2a2a' },
      timeScale: { borderColor: '#2a2a2a', timeVisible: true },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderDownColor: '#ef4444', borderUpColor: '#22c55e',
      wickDownColor: '#ef4444', wickUpColor: '#22c55e',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Generate sample data based on current price
    const basePrice = selectedInstrument.ltp || 100;
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 100; i >= 0; i--) {
      const time = now - i * 900;
      const volatility = basePrice * 0.01;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      candles.push({ time, open, high, low, close });
    }
    candlestickSeries.setData(candles);
    lastCandleRef.current = candles[candles.length - 1];

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedInstrument]);

  // Update chart with real-time price
  useEffect(() => {
    if (candlestickSeriesRef.current && lastCandleRef.current && livePrice?.ltp) {
      try {
        const now = Math.floor(Date.now() / 1000);
        const candleTime = Math.floor(now / 900) * 900; // 15 min candles
        const lastTime = typeof lastCandleRef.current.time === 'number' 
          ? lastCandleRef.current.time 
          : Math.floor(Date.now() / 1000);
        
        // Only update if new candle time is >= last candle time
        if (candleTime >= lastTime) {
          if (lastTime === candleTime) {
            const updatedCandle = {
              time: candleTime,
              open: lastCandleRef.current.open,
              high: Math.max(lastCandleRef.current.high, livePrice.ltp),
              low: Math.min(lastCandleRef.current.low, livePrice.ltp),
              close: livePrice.ltp
            };
            lastCandleRef.current = updatedCandle;
            candlestickSeriesRef.current.update(updatedCandle);
          } else {
            const newCandle = {
              time: candleTime,
              open: livePrice.ltp,
              high: livePrice.ltp,
              low: livePrice.ltp,
              close: livePrice.ltp
            };
            lastCandleRef.current = newCandle;
            candlestickSeriesRef.current.update(newCandle);
          }
        }
      } catch (err) {
        console.warn('Chart update error:', err.message);
      }
    }
  }, [livePrice]);

  return (
    <div className="flex-1 flex flex-col bg-dark-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
        <button onClick={onBack} className="text-gray-400">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        {selectedInstrument ? (
          <div className="text-center">
            <div className="font-medium text-green-400">{selectedInstrument.symbol}</div>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-gray-400">{selectedInstrument.exchange}</span>
              {livePrice && (
                <>
                  <span className={`font-mono font-bold ${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{livePrice.ltp?.toLocaleString()}
                  </span>
                  <span className={`${livePrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {livePrice.change >= 0 ? '+' : ''}{parseFloat(livePrice.changePercent || 0).toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">Select Instrument</span>
        )}
        <div className="w-5" />
      </div>

      {/* Chart */}
      <div className="flex-1 relative">
        {!selectedInstrument ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw size={40} className="mb-4 opacity-30" />
            <p className="text-sm">Select an instrument</p>
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>

      {/* Timeframes */}
      {selectedInstrument && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-dark-600">
          {['1m', '5m', '15m', '1h', '1d'].map(tf => (
            <button key={tf} className="px-3 py-1 text-sm text-gray-400 hover:bg-dark-600 rounded">
              {tf}
            </button>
          ))}
        </div>
      )}

      {/* Buy/Sell Buttons - Indian Standard: SELL left, BUY right */}
      {selectedInstrument && (
        <div className="flex gap-3 p-4 border-t border-dark-600">
          <button 
            onClick={() => onBuySell('sell', selectedInstrument)}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            SELL
          </button>
          <button 
            onClick={() => onBuySell('buy', selectedInstrument)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            BUY
          </button>
        </div>
      )}
    </div>
  );
};

const MobilePositionsPanel = ({ activeTab, user, marketData }) => {
  const [tab, setTab] = useState(activeTab);
  const [positions, setPositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.token) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.token, tab]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      if (tab === 'positions') {
        const { data } = await axios.get('/api/trading/positions?status=OPEN', { headers });
        setPositions(data || []);
      } else if (tab === 'pending') {
        const { data } = await axios.get('/api/trading/pending-orders', { headers });
        setPendingOrders(data || []);
      } else {
        const { data } = await axios.get('/api/trading/history', { headers });
        setHistory(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleClose = async (id, item) => {
    try {
      setLoading(true);
      // Get live bid/ask prices for the position
      const liveData = marketData[item?.token] || {};
      const bidPrice = liveData.bid || liveData.ltp || item?.currentPrice;
      const askPrice = liveData.ask || liveData.ltp || item?.currentPrice;
      
      await axios.post(`/api/trading/close/${id}`, {
        bidPrice,
        askPrice
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Indian Net Trading: BUY position uses Bid (sell) price, SELL position uses Ask (buy) price for P&L
  const getCurrentPrice = (position) => {
    const token = position.token;
    const symbol = position.symbol;
    const side = position.side;
    
    let data = null;
    if (token && marketData?.[token]) {
      data = marketData[token];
    } else if (symbol && marketData?.[symbol]) {
      data = marketData[symbol];
    } else {
      for (const [key, mData] of Object.entries(marketData || {})) {
        if (mData.symbol === symbol) {
          data = mData;
          break;
        }
      }
    }
    
    if (!data) return 0;
    
    // Indian Net Trading Logic:
    // BUY position: Show Bid price (price at which you can sell/exit)
    // SELL position: Show Ask price (price at which you can buy/exit)
    if (side === 'BUY') {
      return data.bid || data.ltp || data.last_price || 0;
    } else {
      return data.ask || data.ltp || data.last_price || 0;
    }
  };

  const currentData = tab === 'positions' ? positions : tab === 'pending' ? pendingOrders : history;

  return (
    <div className="flex-1 flex flex-col bg-dark-800">
      {/* Tabs */}
      <div className="flex border-b border-dark-600">
        {['positions', 'pending', 'history'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm capitalize ${
              tab === t ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-400'
            }`}
          >
            {t} ({t === 'positions' ? positions.length : t === 'pending' ? pendingOrders.length : history.length})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 h-full">
            <div className="text-center py-8">
              <Wallet size={48} className="mx-auto mb-4 opacity-30" />
              <p>No {tab === 'positions' ? 'open positions' : tab === 'pending' ? 'pending orders' : 'trade history'}</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {currentData.map(item => {
              const ltp = getCurrentPrice(item) || item.currentPrice || item.entryPrice;
              const pnl = item.side === 'BUY' ? (ltp - item.entryPrice) * item.quantity : (item.entryPrice - ltp) * item.quantity;
              return (
                <div key={item._id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{item.symbol}</div>
                      <div className={`text-xs ${item.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {item.side} • {item.quantity} qty
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${(tab === 'history' ? item.realizedPnL : pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(tab === 'history' ? item.realizedPnL : pnl) >= 0 ? '+' : ''}₹{(tab === 'history' ? item.realizedPnL : pnl)?.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Entry: ₹{item.entryPrice?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-yellow-400">
                      Spread: {item.spread || 0} pts | Comm: ₹{(item.commission || 0).toFixed(2)}
                    </div>
                    {tab === 'positions' && (
                      <button 
                        onClick={() => handleClose(item._id, item)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 rounded text-white"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const MobileNotificationsContent = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user?.token]);

  const fetchNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [tradesRes, fundsRes] = await Promise.all([
        axios.get('/api/trading/history?limit=20', { headers }),
        axios.get('/api/user-funds/my-requests', { headers }).catch(() => ({ data: [] }))
      ]);
      
      const tradeNotifs = (tradesRes.data || []).map(trade => ({
        id: trade._id,
        type: 'trade',
        title: `${trade.side} ${trade.symbol}`,
        message: `${trade.quantity} qty @ ₹${trade.entryPrice?.toLocaleString()}`,
        pnl: trade.realizedPnL || 0,
        status: trade.closeReason || 'CLOSED',
        time: new Date(trade.closedAt || trade.createdAt),
        icon: trade.realizedPnL >= 0 ? '📈' : '📉'
      }));
      
      const fundNotifs = (fundsRes.data || []).map(fund => ({
        id: fund._id,
        type: 'fund',
        title: fund.type === 'DEPOSIT' ? 'Deposit Request' : 'Withdrawal Request',
        message: `₹${fund.amount?.toLocaleString()}`,
        status: fund.status,
        time: new Date(fund.updatedAt || fund.createdAt),
        icon: fund.type === 'DEPOSIT' ? '💰' : '💸'
      }));
      
      setNotifications([...tradeNotifs, ...fundNotifs].sort((a, b) => b.time - a.time));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const diff = Date.now() - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Bell size={48} className="mb-4 opacity-30" />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="divide-y divide-dark-700">
          {notifications.map(notif => (
            <div key={notif.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">{notif.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <span className="text-xs text-gray-500">{formatTime(notif.time)}</span>
                  </div>
                  <p className="text-sm text-gray-400">{notif.message}</p>
                  {notif.type === 'trade' ? (
                    <span className={`text-sm ${notif.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      P&L: {notif.pnl >= 0 ? '+' : ''}₹{notif.pnl.toFixed(2)}
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      notif.status === 'APPROVED' ? 'text-green-400 bg-green-900/30' :
                      notif.status === 'REJECTED' ? 'text-red-400 bg-red-900/30' :
                      'text-yellow-400 bg-yellow-900/30'
                    }`}>
                      {notif.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MobileProfilePanel = ({ user, walletData, onLogout }) => {
  const [activeSection, setActiveSection] = useState('menu'); // 'menu', 'history', 'settings', 'notifications'
  const [transactions, setTransactions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'history') {
      fetchHistory();
      const interval = setInterval(fetchHistory, 2000);
      return () => clearInterval(interval);
    }
  }, [activeSection, user?.token]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };
      const [tradesRes, fundsRes] = await Promise.all([
        axios.get('/api/trading/history', { headers }),
        axios.get('/api/user-funds/my-requests', { headers }).catch(() => ({ data: [] }))
      ]);
      setTradeHistory(tradesRes.data || []);
      setTransactions(fundsRes.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (activeSection === 'history') {
    return (
      <div className="flex-1 flex flex-col bg-dark-800">
        <div className="flex items-center gap-3 p-4 border-b border-dark-600">
          <button onClick={() => setActiveSection('menu')} className="text-gray-400">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="font-bold">Transaction History</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && tradeHistory.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Fund Transactions */}
              {transactions.length > 0 && (
                <div className="p-4 border-b border-dark-600">
                  <h3 className="text-sm text-gray-400 mb-3">Fund Requests</h3>
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx._id} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{tx.type}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount?.toLocaleString()}
                        </p>
                        <p className={`text-xs ${tx.status === 'APPROVED' ? 'text-green-400' : tx.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Trade History */}
              <div className="p-4">
                <h3 className="text-sm text-gray-400 mb-3">Trade History</h3>
                {tradeHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No trade history</p>
                ) : (
                  tradeHistory.slice(0, 20).map(trade => (
                    <div key={trade._id} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{trade.symbol}</p>
                        <p className="text-xs text-gray-400">
                          {trade.side} • {trade.quantity} qty • {new Date(trade.closedAt || trade.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${(trade.realizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(trade.realizedPnL || 0) >= 0 ? '+' : ''}₹{(trade.realizedPnL || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">{trade.closeReason || 'CLOSED'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (activeSection === 'notifications') {
    return (
      <div className="flex-1 flex flex-col bg-dark-800">
        <div className="flex items-center gap-3 p-4 border-b border-dark-600">
          <button onClick={() => setActiveSection('menu')} className="text-gray-400">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="font-bold">Notifications</h2>
        </div>
        <MobileNotificationsContent user={user} />
      </div>
    );
  }

  if (activeSection === 'settings') {
    return (
      <div className="flex-1 flex flex-col bg-dark-800">
        <div className="flex items-center gap-3 p-4 border-b border-dark-600">
          <button onClick={() => setActiveSection('menu')} className="text-gray-400">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h2 className="font-bold">Settings</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">Account Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Username</span>
                <span>{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">User ID</span>
                <span className="font-mono text-xs">{user?.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Admin Code</span>
                <span className="font-mono text-xs">{user?.adminCode}</span>
              </div>
            </div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">Trading Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Trading Status</span>
                <span className={user?.tradingStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}>
                  {user?.tradingStatus || 'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Account Status</span>
                <span className={user?.isActive ? 'text-green-400' : 'text-red-400'}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="font-medium mb-3">App Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span>Web</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-800">
      {/* Profile Header */}
      <div className="p-6 text-center border-b border-dark-600">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircle size={48} />
        </div>
        <h2 className="text-xl font-bold">{user?.fullName || user?.username}</h2>
        <p className="text-gray-400 text-sm">@{user?.username}</p>
      </div>

      {/* Wallet Info */}
      <div className="p-4 border-b border-dark-600">
        <div className="bg-dark-700 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Wallet Balance</p>
          <p className="text-2xl font-bold text-green-400">
            ₹{walletData?.cashBalance?.toLocaleString() || walletData?.wallet?.balance?.toLocaleString() || '0.00'}
          </p>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-400">Available Margin</span>
            <span className="text-green-400">₹{walletData?.availableMargin?.toLocaleString() || '0.00'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Used Margin</span>
            <span className="text-yellow-400">₹{walletData?.usedMargin?.toLocaleString() || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-4">
        <button 
          onClick={() => setActiveSection('settings')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg text-left"
        >
          <Settings size={20} className="text-gray-400" />
          <span>Settings</span>
          <ChevronRight size={16} className="ml-auto text-gray-500" />
        </button>
        <button 
          onClick={() => setActiveSection('notifications')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg text-left"
        >
          <Bell size={20} className="text-gray-400" />
          <span>Notifications</span>
          <ChevronRight size={16} className="ml-auto text-gray-500" />
        </button>
        <button 
          onClick={() => setActiveSection('history')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 rounded-lg text-left"
        >
          <History size={20} className="text-gray-400" />
          <span>Transaction History</span>
          <ChevronRight size={16} className="ml-auto text-gray-500" />
        </button>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-dark-600">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

const NotificationsModal = ({ onClose, user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'trades', 'funds', 'announcements'

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [user?.token]);

  const fetchNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      // Fetch trades (closed), fund requests, and admin notifications
      const [tradesRes, fundsRes, announcementsRes] = await Promise.all([
        axios.get('/api/trading/history?limit=20', { headers }),
        axios.get('/api/user-funds/my-requests', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/notifications/user', { headers }).catch(() => ({ data: [] }))
      ]);
      
      // Convert to notifications format
      const tradeNotifications = (tradesRes.data || []).map(trade => ({
        id: trade._id,
        type: 'trade',
        title: `${trade.side} ${trade.symbol}`,
        message: `${trade.quantity} qty @ ₹${trade.entryPrice?.toLocaleString()} → ₹${trade.exitPrice?.toLocaleString()}`,
        pnl: trade.realizedPnL || 0,
        status: trade.closeReason || 'CLOSED',
        time: new Date(trade.closedAt || trade.createdAt),
        icon: trade.realizedPnL >= 0 ? '📈' : '📉'
      }));
      
      const fundNotifications = (fundsRes.data || []).map(fund => ({
        id: fund._id,
        type: 'fund',
        title: fund.type === 'DEPOSIT' ? 'Deposit Request' : 'Withdrawal Request',
        message: `₹${fund.amount?.toLocaleString()}`,
        status: fund.status,
        time: new Date(fund.updatedAt || fund.createdAt),
        icon: fund.type === 'DEPOSIT' ? '💰' : '💸',
        isDeposit: fund.type === 'DEPOSIT'
      }));

      const announcementNotifications = (announcementsRes.data || []).map(notif => ({
        id: notif._id,
        type: 'announcement',
        title: notif.title,
        subject: notif.subject,
        message: notif.description,
        image: notif.image,
        time: new Date(notif.createdAt),
        icon: '📢',
        isRead: notif.isRead
      }));
      
      // Combine and sort by time
      const allNotifications = [...tradeNotifications, ...fundNotifications, ...announcementNotifications]
        .sort((a, b) => b.time - a.time);
      
      setNotifications(allNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await axios.put(`/api/notifications/${notifId}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === notifId ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trades') return n.type === 'trade';
    if (activeFilter === 'funds') return n.type === 'fund';
    if (activeFilter === 'announcements') return n.type === 'announcement';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'text-green-400';
      case 'REJECTED': return 'text-red-400';
      case 'PENDING': return 'text-yellow-400';
      case 'MANUAL': case 'CLOSED': return 'text-gray-400';
      case 'SL_HIT': return 'text-red-400';
      case 'TARGET_HIT': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell size={20} /> Notifications
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-dark-600">
          {[
            { id: 'all', label: 'All' },
            { id: 'announcements', label: 'Announcements' },
            { id: 'trades', label: 'Trades' },
            { id: 'funds', label: 'Funds' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-1 py-2 text-sm font-medium ${activeFilter === filter.id ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={48} className="mb-4 opacity-30" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredNotifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-dark-700/50 ${notif.type === 'announcement' && !notif.isRead ? 'bg-orange-900/10 border-l-2 border-orange-500' : ''}`}
                  onClick={() => notif.type === 'announcement' && !notif.isRead && markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium text-sm ${notif.type === 'announcement' && !notif.isRead ? 'text-orange-400' : ''}`}>{notif.title}</p>
                        <span className="text-xs text-gray-500">{formatTime(notif.time)}</span>
                      </div>
                      {notif.type === 'announcement' && notif.subject && (
                        <p className="text-sm text-gray-300 mt-0.5 font-medium">{notif.subject}</p>
                      )}
                      <p className="text-sm text-gray-400 mt-0.5">{notif.message}</p>
                      {notif.type === 'announcement' && notif.image && (
                        <img src={notif.image} alt="Notification" className="mt-2 rounded-lg max-h-32 object-cover" />
                      )}
                      <div className="flex items-center justify-between mt-1">
                        {notif.type === 'trade' ? (
                          <span className={`text-sm font-medium ${notif.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            P&L: {notif.pnl >= 0 ? '+' : ''}₹{notif.pnl.toFixed(2)}
                          </span>
                        ) : notif.type === 'fund' ? (
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(notif.status)} bg-dark-600`}>
                            {notif.status}
                          </span>
                        ) : notif.type === 'announcement' ? (
                          <span className={`text-xs px-2 py-0.5 rounded ${notif.isRead ? 'text-gray-500 bg-dark-600' : 'text-orange-400 bg-orange-900/30'}`}>
                            {notif.isRead ? 'Read' : 'New'}
                          </span>
                        ) : null}
                        {notif.type === 'trade' && (
                          <span className={`text-xs ${getStatusColor(notif.status)}`}>
                            {notif.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ onClose, user }) => {
  const [activeSection, setActiveSection] = useState('account'); // 'account', 'password'
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/user/change-password', {
        oldPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600">
          <button
            onClick={() => setActiveSection('account')}
            className={`flex-1 py-3 text-sm font-medium ${activeSection === 'account' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveSection('password')}
            className={`flex-1 py-3 text-sm font-medium ${activeSection === 'password' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
          >
            Change Password
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeSection === 'account' && (
            <div className="space-y-4">
              <div className="bg-dark-700 rounded-lg p-4">
                <h3 className="font-medium mb-3">Account Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Username</span>
                    <span>{user?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Full Name</span>
                    <span>{user?.fullName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span>{user?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Phone</span>
                    <span>{user?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID</span>
                    <span className="font-mono text-xs">{user?.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Admin Code</span>
                    <span className="font-mono text-xs">{user?.adminCode}</span>
                  </div>
                </div>
              </div>
              <div className="bg-dark-700 rounded-lg p-4">
                <h3 className="font-medium mb-3">Trading Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={user?.tradingStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}>
                      {user?.tradingStatus || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account</span>
                    <span className={user?.isActive !== false ? 'text-green-400' : 'text-red-400'}>
                      {user?.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <div className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                  {message.text}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  placeholder="Enter new password (min 6 chars)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 rounded-lg font-medium transition"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WalletModal = ({ onClose, walletData, user, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);

  // Fetch bank details on mount
  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      // Fetch admin's bank accounts (specific to user's admin)
      const { data } = await axios.get('/api/user-funds/admin-bank-accounts', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      // Find primary or first active bank and UPI accounts
      const bankAccount = data.find(acc => acc.type === 'BANK' && acc.isPrimary) 
        || data.find(acc => acc.type === 'BANK');
      const upiAccount = data.find(acc => acc.type === 'UPI' && acc.isPrimary)
        || data.find(acc => acc.type === 'UPI');
      
      setBankDetails({
        bankName: bankAccount?.bankName || 'Not configured',
        accountName: bankAccount?.holderName || 'Not configured',
        accountNumber: bankAccount?.accountNumber || 'Not configured',
        ifscCode: bankAccount?.ifsc || 'Not configured',
        upiId: upiAccount?.upiId || 'Not configured',
        upiName: upiAccount?.holderName || 'Not configured'
      });
    } catch (error) {
      console.error('Error fetching bank details:', error);
      // Fallback to legacy endpoint
      try {
        const { data } = await axios.get('/api/user/bank-details', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setBankDetails(data);
      } catch (err) {
        setBankDetails({
          bankName: 'Not configured',
          accountName: 'Contact your admin',
          accountNumber: '',
          ifscCode: '',
          upiId: ''
        });
      }
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    if (!utrNumber) {
      setMessage({ type: 'error', text: 'Please enter UTR/Transaction ID' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/user/deposit-request', {
        amount: parseFloat(amount),
        utrNumber,
        paymentMethod: 'BANK'
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessage({ type: 'success', text: 'Deposit request submitted! It will be verified shortly.' });
      setAmount('');
      setUtrNumber('');
      onRefresh && onRefresh();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit deposit request' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    if (parseFloat(amount) > (walletData?.wallet?.balance || 0)) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/user/withdraw-request', {
        amount: parseFloat(amount),
        accountDetails: withdrawAccount
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessage({ type: 'success', text: 'Withdrawal request submitted! It will be processed shortly.' });
      setAmount('');
      setWithdrawAccount('');
      onRefresh && onRefresh();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit withdrawal request' });
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50">
      <div className="bg-dark-800 w-full md:w-[480px] md:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          <div className="flex items-center gap-3">
            <Wallet className="text-green-400" size={24} />
            <div>
              <h3 className="font-bold text-lg">Wallet</h3>
              <p className="text-sm text-gray-400">Balance: <span className="text-green-400 font-medium">₹{walletData?.wallet?.balance?.toLocaleString() || '0'}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600">
          <button
            onClick={() => { setActiveTab('deposit'); setMessage(null); }}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'deposit' 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle size={18} />
            Deposit
          </button>
          <button
            onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
            className={`flex-1 py-3 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'withdraw' 
                ? 'text-red-400 border-b-2 border-red-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle size={18} />
            Withdraw
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-4 mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="p-4 space-y-4">
            {/* Bank Details */}
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <Building2 size={16} />
                Transfer to Bank Account
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Bank Name</span>
                  <span className="font-medium">{bankDetails?.bankName || '--'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Account Name</span>
                  <span className="font-medium">{bankDetails?.accountName || '--'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{bankDetails?.accountNumber || '--'}</span>
                    <button 
                      onClick={() => copyToClipboard(bankDetails?.accountNumber, 'account')}
                      className="text-gray-400 hover:text-white"
                    >
                      {copied === 'account' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">IFSC Code</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{bankDetails?.ifscCode || '--'}</span>
                    <button 
                      onClick={() => copyToClipboard(bankDetails?.ifscCode, 'ifsc')}
                      className="text-gray-400 hover:text-white"
                    >
                      {copied === 'ifsc' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* UPI */}
            <div className="bg-dark-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <CreditCard size={16} />
                Or Pay via UPI
              </h4>
              <div className="flex justify-between items-center">
                <span className="font-mono text-lg">{bankDetails?.upiId || '--'}</span>
                <button 
                  onClick={() => copyToClipboard(bankDetails?.upiId, 'upi')}
                  className="px-3 py-1 bg-dark-600 hover:bg-dark-500 rounded text-sm flex items-center gap-1"
                >
                  {copied === 'upi' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copied === 'upi' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-green-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm"
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* UTR Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">UTR / Transaction ID</label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="Enter UTR or Transaction ID after payment"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowDownCircle size={18} />}
              Submit Deposit Request
            </button>
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="p-4 space-y-4">
            {/* Available Balance */}
            <div className="bg-dark-700 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Available for Withdrawal</p>
              <p className="text-3xl font-bold text-green-400 mt-1">₹{walletData?.wallet?.balance?.toLocaleString() || '0'}</p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Withdrawal Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-red-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm"
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
                <button
                  onClick={() => setAmount((walletData?.wallet?.balance || 0).toString())}
                  className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm text-green-400"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Account Details */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Bank Account / UPI ID</label>
              <textarea
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                placeholder="Enter your bank account details or UPI ID"
                rows={3}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowUpCircle size={18} />}
              Submit Withdrawal Request
            </button>

            <p className="text-xs text-gray-500 text-center">
              Withdrawals are processed within 24-48 hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const BuySellModal = ({ instrument, orderType, setOrderType, onClose, walletData, user, marketData = {}, onRefreshWallet, onRefreshPositions }) => {
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [productType, setProductType] = useState('MIS');
  const [orderPriceType, setOrderPriceType] = useState('MARKET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Determine if crypto
  const isCrypto = instrument?.isCrypto || instrument?.segment === 'CRYPTO' || instrument?.exchange === 'BINANCE';
  
  // Get live price data from marketData or instrument (for crypto)
  const liveData = marketData[instrument?.token] || {};
  const ltp = isCrypto ? (instrument?.ltp || 0) : (liveData.ltp || instrument?.ltp || 0);
  const liveBid = isCrypto ? ltp : (liveData.bid || ltp);
  const liveAsk = isCrypto ? ltp : (liveData.ask || ltp);

  const lotSize = instrument?.lotSize || 1;
  const totalQuantity = parseFloat(quantity || 1) * lotSize;
  const orderValue = ltp * totalQuantity;

  // Determine segment type
  const isFnO = instrument?.segment === 'FNO' || instrument?.instrumentType === 'OPTIONS' || instrument?.instrumentType === 'FUTURES';
  const isMCX = instrument?.segment === 'MCX' || instrument?.exchange === 'MCX';

  // Product types based on segment
  const productTypes = isCrypto
    ? [
        { value: 'MIS', label: 'Spot', desc: 'Crypto spot trading' }
      ]
    : isFnO || isMCX
    ? [
        { value: 'MIS', label: 'Intraday', desc: 'Square off same day' },
        { value: 'NRML', label: 'Carry Forward', desc: 'Hold overnight' }
      ]
    : [
        { value: 'MIS', label: 'Intraday', desc: 'Square off same day' },
        { value: 'CNC', label: 'Delivery', desc: 'Hold in demat' }
      ];

  // Place order handler - same logic as TradingPanel
  const handlePlaceOrder = async () => {
    if (!user?.token) {
      setError('Please login to place orders');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const orderData = {
        symbol: instrument.symbol,
        token: instrument.token,
        pair: instrument.pair, // For crypto
        isCrypto: isCrypto,
        exchange: instrument.exchange || (isCrypto ? 'BINANCE' : 'NSE'),
        segment: isCrypto ? 'CRYPTO' : (instrument.segment || (instrument.exchange === 'MCX' ? 'MCX' : 'FNO')),
        instrumentType: isCrypto ? 'CRYPTO' : (instrument.instrumentType || 'FUTURES'),
        optionType: instrument.optionType || null,
        strike: instrument.strike || null,
        expiry: instrument.expiry || null,
        category: instrument.category,
        productType,
        orderType: orderPriceType,
        side: orderType.toUpperCase(),
        quantity: totalQuantity,
        lots: parseFloat(quantity),
        lotSize: lotSize,
        price: ltp,
        bidPrice: liveBid,
        askPrice: liveAsk,
        leverage: 1
      };

      if (orderPriceType === 'LIMIT') {
        orderData.limitPrice = parseFloat(limitPrice);
      }

      console.log('Placing order:', orderData);

      const { data } = await axios.post('/api/trading/order', orderData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Show trade executed popup with details
      const trade = data.trade;
      const priceSymbol = isCrypto ? '$' : '₹';
      const statusMsg = trade?.status === 'PENDING' 
        ? `📋 LIMIT ORDER PLACED - ${instrument.symbol} @ ${priceSymbol}${limitPrice}` 
        : `✅ TRADE EXECUTED - ${trade?.side} ${instrument.symbol} @ ${priceSymbol}${trade?.entryPrice?.toLocaleString()} | Qty: ${trade?.quantity}`;
      
      setSuccess(statusMsg);
      // Refresh wallet and positions after successful order
      if (onRefreshWallet) onRefreshWallet();
      if (onRefreshPositions) onRefreshPositions();
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Order error:', err);
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50">
      <div className="bg-dark-800 w-full md:w-[420px] md:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          <div>
            <h3 className="font-bold text-lg">{instrument?.symbol || 'Select Instrument'}</h3>
            <p className="text-xs text-gray-400">
              {instrument?.exchange} • {instrument?.segment || 'EQUITY'} 
              {instrument?.instrumentType === 'OPTIONS' && ` • ${instrument?.optionType}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        {/* Buy/Sell Toggle with Live Bid/Ask Prices - Indian Standard: SELL left, BUY right */}
        <div className="flex p-3 gap-2">
          <button
            onClick={() => setOrderType('sell')}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              orderType === 'sell' 
                ? 'bg-red-600 text-white' 
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            <div className="text-xs opacity-70">{isCrypto ? 'Price' : 'Bid Price'}</div>
            <div className="text-xl">{isCrypto ? '$' : '₹'}{liveBid?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '--'}</div>
            <div className="text-sm">SELL</div>
          </button>
          <button
            onClick={() => setOrderType('buy')}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              orderType === 'buy' 
                ? 'bg-green-600 text-white' 
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
            }`}
          >
            <div className="text-xs opacity-70">{isCrypto ? 'Price' : 'Ask Price'}</div>
            <div className="text-xl">{isCrypto ? '$' : '₹'}{liveAsk?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '--'}</div>
            <div className="text-sm">BUY</div>
          </button>
        </div>

        {/* Product Type Selection */}
        <div className="px-4 pb-3">
          <label className="block text-sm text-gray-400 mb-2">Product Type</label>
          <div className="grid grid-cols-2 gap-2">
            {productTypes.map(pt => (
              <button
                key={pt.value}
                onClick={() => setProductType(pt.value)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  productType === pt.value 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                }`}
              >
                <div className="font-semibold text-sm">{pt.label}</div>
                <div className="text-xs text-gray-500">{pt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Order Type Selection */}
        <div className="px-4 pb-3">
          <label className="block text-sm text-gray-400 mb-2">Order Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderPriceType('MARKET')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                orderPriceType === 'MARKET' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderPriceType('LIMIT')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                orderPriceType === 'LIMIT' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 pt-0 space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Quantity {lotSize > 1 && `(Lot Size: ${lotSize})`}
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setQuantity(Math.max(1, parseInt(quantity) - 1).toString())}
                className="px-4 py-3 bg-dark-700 rounded-lg hover:bg-dark-600 font-bold"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-center text-lg font-bold focus:outline-none focus:border-green-500"
                min="1"
              />
              <button 
                onClick={() => setQuantity((parseInt(quantity) + 1).toString())}
                className="px-4 py-3 bg-dark-700 rounded-lg hover:bg-dark-600 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Price - Only show for Limit orders */}
          {orderPriceType === 'LIMIT' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Limit Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder="Enter price"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
                step="0.05"
              />
            </div>
          )}

          {/* LTP Display */}
          <div className="bg-dark-700 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Last Traded Price</span>
              <span className="text-xl font-bold">
                ₹{ltp?.toLocaleString() || '--'}
              </span>
            </div>
          </div>

          {/* Margin Info */}
          <div className="bg-dark-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Available Margin</span>
              <span className="text-green-400 font-medium">₹{walletData?.marginAvailable?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Required Margin</span>
              <span className="font-medium">₹{(orderValue * (isMCX ? 0.05 : 0.15) / (productType === 'MIS' ? 2 : 1)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-dark-600 pt-2">
              <span className="text-gray-400">Order Value</span>
              <span className="font-medium">₹{orderValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-400 px-3 py-2 rounded text-sm">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition ${
              orderType === 'buy' 
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800' 
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
            }`}
          >
            {loading ? 'Placing Order...' : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${instrument?.symbol}`}
            <span className="ml-2 text-sm opacity-80">
              ({productType === 'MIS' ? 'Intraday' : productType === 'NRML' ? 'Carry Forward' : 'Delivery'})
            </span>
          </button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            {productType === 'MIS' 
              ? 'Intraday position will be auto squared-off before market close'
              : productType === 'NRML'
              ? 'Position will be carried forward to next trading day'
              : 'Shares will be delivered to your demat account (T+1)'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper functions to generate sample chart data
function generateSampleData() {
  const data = [];
  const now = new Date();
  let basePrice = 984;
  
  for (let i = 100; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const open = basePrice + (Math.random() - 0.5) * 2;
    const close = open + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random() * 1;
    const low = Math.min(open, close) - Math.random() * 1;
    
    data.push({
      time: Math.floor(time.getTime() / 1000),
      open,
      high,
      low,
      close,
    });
    
    basePrice = close;
  }
  
  return data;
}

function generateVolumeData() {
  const data = [];
  const now = new Date();
  
  for (let i = 100; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const value = Math.floor(Math.random() * 10000) + 1000;
    
    data.push({
      time: Math.floor(time.getTime() / 1000),
      value,
      color: Math.random() > 0.5 ? '#22c55e80' : '#ef444480',
    });
  }
  
  return data;
}

export default UserDashboard;
