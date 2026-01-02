import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Eye, EyeOff, BarChart2, Wallet, Zap, LineChart, CandlestickChart } from 'lucide-react';

const UserLogin = () => {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true' || !!refCode);
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    fullName: '', 
    phone: '',
    adminCode: '',
    referralCode: refCode
  });
  
  // Allow direct registration - users without ref code will be assigned to Super Admin
  const canRegister = true;
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, registerUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerUser(formData);
      } else {
        await loginUser(formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (!isRegister && !canRegister) {
      setError('Registration requires a referral link from your admin.');
      return;
    }
    setIsRegister(!isRegister);
    setError('');
    setFormData({ username: '', email: '', password: '', fullName: '', phone: '', adminCode: '', referralCode: refCode });
  };

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-dark-900" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">NTrader</span>
            </div>
            <p className="text-gray-400">Welcome back, trader!</p>
          </div>

          <div className="bg-dark-800/90 backdrop-blur-xl p-8 rounded-2xl border border-green-500/20 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {isRegister ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-gray-400 mt-2">
                {isRegister ? 'Start your trading journey' : 'Access your trading dashboard'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-dark-700 border border-green-500/30 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-dark-700 border border-green-500/30 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
                      placeholder="johndoe"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-dark-700 border border-green-500/30 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </>
              )}

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-dark-700 border border-green-500/30 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
                  placeholder="trader@example.com"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-dark-700 border border-green-500/30 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-green-500 transition"
                    placeholder={isRegister ? 'Create password' : 'Enter password'}
                    required
                    minLength={isRegister ? 6 : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 shadow-lg shadow-green-500/25"
              >
                {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Start Trading'}
              </button>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full mt-4 text-sm text-green-400 hover:text-green-300 transition"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden bg-gradient-to-br from-dark-800 to-dark-900">
        <div className="absolute top-10 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
        
        {/* Animated Chart Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 600">
            <path
              d="M0,300 Q100,250 200,280 T400,260 T600,300 T800,250"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
            <path
              d="M0,350 Q150,300 300,330 T500,310 T700,350 T800,300"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
          </svg>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <CandlestickChart className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Trade Smarter</h1>
          <p className="text-xl text-gray-400 mb-12">NSE • BSE • MCX • F&O</p>
          
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <div className="bg-dark-700/50 backdrop-blur-sm rounded-xl p-6 text-left border border-green-500/10">
              <LineChart className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Live Charts</h3>
              <p className="text-sm text-gray-400">Real-time TradingView charts</p>
            </div>
            <div className="bg-dark-700/50 backdrop-blur-sm rounded-xl p-6 text-left border border-green-500/10">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Fast Execution</h3>
              <p className="text-sm text-gray-400">Lightning fast orders</p>
            </div>
            <div className="bg-dark-700/50 backdrop-blur-sm rounded-xl p-6 text-left border border-green-500/10">
              <BarChart2 className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">All Segments</h3>
              <p className="text-sm text-gray-400">Equity, F&O, Commodities</p>
            </div>
            <div className="bg-dark-700/50 backdrop-blur-sm rounded-xl p-6 text-left border border-green-500/10">
              <Wallet className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">Secure Wallet</h3>
              <p className="text-sm text-gray-400">Safe fund management</p>
            </div>
          </div>

          {/* Market Tickers */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="text-gray-500">NIFTY 50</div>
              <div className="text-green-400 font-mono">--</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">BANKNIFTY</div>
              <div className="text-green-400 font-mono">--</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">SENSEX</div>
              <div className="text-red-400 font-mono">--</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
