import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Users, LogOut, Plus, Search, Edit, Trash2, TrendingUp,
  Key, Wallet, Eye, EyeOff, X, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Menu, Shield, CreditCard, FileText, BarChart3, Building2, Settings, UserPlus
} from 'lucide-react';

const AdminDashboard = () => {
  const { admin, logoutAdmin, updateAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [walletBalance, setWalletBalance] = useState(admin?.wallet?.balance || 0);

  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  // Refresh admin data on mount to get latest wallet balance
  useEffect(() => {
    if (!isSuperAdmin && admin?.token) {
      refreshAdminData();
    }
  }, []);

  const refreshAdminData = async () => {
    try {
      const { data } = await axios.get('/api/admin/me', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      if (data.wallet) {
        setWalletBalance(data.wallet.balance || 0);
        updateAdmin({ wallet: data.wallet, stats: data.stats });
      }
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  // Navigation items based on role
  // SUPER ADMIN: Admin Management, Wallet, Create Admin, Instruments, Charges, Market Open/Close
  // ADMIN: User Management, Trade Management, Charges, Deposit/Withdrawal, Fund Management, Bank Management, Transactions
  const navItems = isSuperAdmin ? [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/admins', icon: Shield, label: 'Admin Management' },
    { path: '/admin/all-users', icon: Users, label: 'All Users' },
    { path: '/admin/create-user', icon: UserPlus, label: 'Create User' },
    { path: '/admin/instruments', icon: TrendingUp, label: 'Instruments' },
    { path: '/admin/lot-settings', icon: Settings, label: 'Lot Management' },
    { path: '/admin/admin-fund-requests', icon: Wallet, label: 'Admin Fund Requests' },
    { path: '/admin/charges', icon: CreditCard, label: 'Charge Management' },
    { path: '/admin/market-control', icon: TrendingUp, label: 'Market Control' },
    { path: '/admin/bank-management', icon: Building2, label: 'Bank Settings' },
    { path: '/admin/profile', icon: Settings, label: 'Profile' },
  ] : [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/wallet', icon: Wallet, label: 'My Wallet' },
    { path: '/admin/users', icon: Users, label: 'User Management' },
    { path: '/admin/trades', icon: FileText, label: 'Trade Management' },
    { path: '/admin/charges', icon: CreditCard, label: 'Charge Management' },
    { path: '/admin/fund-requests', icon: CreditCard, label: 'Fund Requests' },
    { path: '/admin/bank-accounts', icon: Building2, label: 'Bank Accounts' },
    { path: '/admin/ledger', icon: FileText, label: 'Transactions' },
    { path: '/admin/profile', icon: Settings, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-dark-800 border-b border-dark-600 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold">THEFX</span>
          <span className={`text-xs ml-1 ${isSuperAdmin ? 'text-yellow-400' : 'text-purple-400'}`}>
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </Link>
        <button 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="text-gray-400 hover:text-white"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-dark-800 border-b border-dark-600 p-4">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setShowMobileMenu(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
                location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path))
                  ? (isSuperAdmin ? 'bg-yellow-600' : 'bg-purple-600') + ' text-white'
                  : 'text-gray-400'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
          <div className="border-t border-dark-600 pt-3 mt-3">
            <div className="text-sm text-gray-400 mb-1 px-4">
              {admin?.name || admin?.username}
            </div>
            {admin?.adminCode && (
              <div className="text-xs text-purple-400 mb-2 px-4">
                Code: {admin.adminCode}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-dark-800 border-r border-dark-600 flex-col">
        <div className="p-4 border-b border-dark-600">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">THEFX</span>
          </Link>
          <p className={`text-xs mt-1 ${isSuperAdmin ? 'text-yellow-400' : 'text-purple-400'}`}>
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
          </p>
        </div>

        {/* Admin Info */}
        {!isSuperAdmin && admin?.adminCode && (
          <div className="px-4 py-3 border-b border-dark-600 bg-dark-700/50">
            <div className="text-xs text-gray-400">Your Admin Code</div>
            <div className="text-lg font-mono font-bold text-purple-400">{admin.adminCode}</div>
            <div className="text-xs text-gray-500 mt-1">
              Wallet: ₹{walletBalance.toLocaleString()}
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                location.pathname === item.path || (item.path !== '/admin/dashboard' && location.pathname.startsWith(item.path))
                  ? (isSuperAdmin ? 'bg-yellow-600' : 'bg-purple-600') + ' text-white'
                  : 'text-gray-400 hover:bg-dark-700'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-600">
          <div className="text-sm text-gray-400 mb-1">
            {admin?.name || admin?.username}
          </div>
          <div className="text-xs text-gray-500 mb-2">{admin?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="dashboard" element={isSuperAdmin ? <SuperAdminDashboard /> : <AdminDashboardHome />} />
          {/* Super Admin Only Routes */}
          {isSuperAdmin && <Route path="admins/*" element={<AdminManagement />} />}
          {isSuperAdmin && <Route path="all-users" element={<AllUsersManagement />} />}
          {isSuperAdmin && <Route path="create-user" element={<SuperAdminCreateUser />} />}
          {isSuperAdmin && <Route path="instruments" element={<InstrumentManagement />} />}
          {isSuperAdmin && <Route path="lot-settings" element={<LotManagement />} />}
          {isSuperAdmin && <Route path="fund-requests" element={<SuperAdminFundRequests />} />}
          {isSuperAdmin && <Route path="admin-fund-requests" element={<AdminFundRequestsManagement />} />}
          {isSuperAdmin && <Route path="market-control" element={<MarketControl />} />}
          {isSuperAdmin && <Route path="bank-management" element={<BankManagement />} />}
          {/* Admin Only Routes */}
          {!isSuperAdmin && <Route path="wallet" element={<AdminWallet />} />}
          {!isSuperAdmin && <Route path="users/*" element={<UserManagement />} />}
          {!isSuperAdmin && <Route path="trades" element={<AdminTrades />} />}
          {!isSuperAdmin && <Route path="fund-requests" element={<FundRequests />} />}
          {!isSuperAdmin && <Route path="bank-accounts" element={<BankAccounts />} />}
          {!isSuperAdmin && <Route path="ledger" element={<LedgerView />} />}
          {/* Common Routes - Both Super Admin and Admin */}
          <Route path="charges" element={<ChargeManagement />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="*" element={isSuperAdmin ? <SuperAdminDashboard /> : <AdminDashboardHome />} />
        </Routes>
      </main>
    </div>
  );
};

// Super Admin Dashboard
const SuperAdminDashboard = () => {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/dashboard-stats', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Admins" value={stats?.totalAdmins || 0} subtitle={`${stats?.activeAdmins || 0} active`} color="yellow" />
        <StatCard title="Total Users" value={stats?.totalUsers || 0} subtitle={`${stats?.activeUsers || 0} active`} color="purple" />
        <StatCard title="Admin Wallets" value={`₹${(stats?.totalAdminBalance || 0).toLocaleString()}`} subtitle="Total balance" color="green" />
        <StatCard title="User Wallets" value={`₹${(stats?.totalUserBalance || 0).toLocaleString()}`} subtitle="Total balance" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/admins" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <Shield className="text-yellow-400" size={24} />
              <div>
                <div className="font-medium">Manage Admins</div>
                <div className="text-sm text-gray-400">Create, edit, fund admins</div>
              </div>
            </Link>
            <Link to="/admin/instruments" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <TrendingUp className="text-green-400" size={24} />
              <div>
                <div className="font-medium">Instruments</div>
                <div className="text-sm text-gray-400">Manage trading instruments</div>
              </div>
            </Link>
            <Link to="/admin/market-control" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <BarChart3 className="text-blue-400" size={24} />
              <div>
                <div className="font-medium">Market Control</div>
                <div className="text-sm text-gray-400">Open/Close market trading</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">System Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Platform</span>
              <span>NTrader v1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Your Role</span>
              <span className="text-yellow-400">SUPER_ADMIN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Home
const AdminDashboardHome = () => {
  const { admin, updateAdmin } = useAuth();
  const [stats, setStats] = useState({ users: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(admin?.wallet?.balance || 0);

  useEffect(() => {
    fetchStats();
    refreshAdminData();
  }, []);

  // Refresh admin data from server to get latest wallet balance
  const refreshAdminData = async () => {
    try {
      const { data } = await axios.get('/api/admin/me', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      if (data.wallet) {
        setWalletBalance(data.wallet.balance || 0);
        updateAdmin({ wallet: data.wallet, stats: data.stats });
      }
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, requestsRes] = await Promise.all([
        axios.get('/api/admin/manage/users', { headers: { Authorization: `Bearer ${admin.token}` } }),
        axios.get('/api/admin/manage/fund-requests?status=PENDING', { headers: { Authorization: `Bearer ${admin.token}` } })
      ]);
      setStats({
        users: usersRes.data.length,
        pendingRequests: requestsRes.data.length
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Your Wallet" value={`₹${walletBalance.toLocaleString()}`} subtitle="Available balance" color="green" />
        <StatCard title="Total Users" value={stats.users} subtitle="Under your code" color="purple" />
        <StatCard title="Pending Requests" value={stats.pendingRequests} subtitle="Fund requests" color="yellow" />
        <StatCard title="Admin Code" value={admin?.adminCode || 'N/A'} subtitle="Share with users" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/users" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <Users className="text-purple-400" size={24} />
              <div>
                <div className="font-medium">Manage Users</div>
                <div className="text-sm text-gray-400">Create, edit, fund users</div>
              </div>
            </Link>
            <Link to="/admin/trades" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <FileText className="text-green-400" size={24} />
              <div>
                <div className="font-medium">Trade Management</div>
                <div className="text-sm text-gray-400">View and manage user trades</div>
              </div>
            </Link>
            <Link to="/admin/fund-requests" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <CreditCard className="text-yellow-400" size={24} />
              <div>
                <div className="font-medium">Fund Requests</div>
                <div className="text-sm text-gray-400">{stats.pendingRequests} pending</div>
              </div>
            </Link>
            <Link to="/admin/bank-accounts" className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition">
              <Building2 className="text-blue-400" size={24} />
              <div>
                <div className="font-medium">Bank Accounts</div>
                <div className="text-sm text-gray-400">Manage payment methods</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Your Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span>{admin?.name || admin?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span>{admin?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Admin Code</span>
              <span className="text-purple-400 font-mono">{admin?.adminCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="text-green-400">{admin?.status || 'ACTIVE'}</span>
            </div>
          </div>
          
          {/* User Registration Link */}
          {admin?.referralCode && (
            <div className="mt-4 pt-4 border-t border-dark-600">
              <div className="text-sm text-gray-400 mb-2">User Registration Link</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/login?ref=${admin.referralCode}`}
                  className="flex-1 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-xs font-mono text-green-400"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/login?ref=${admin.referralCode}`);
                    alert('Link copied!');
                  }}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Share this link with users to register under your account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, color }) => {
  const colors = {
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    red: 'text-red-400'
  };

  return (
    <div className="bg-dark-800 rounded-lg p-4">
      <div className="text-sm text-gray-400">{title}</div>
      <div className={`text-2xl font-bold ${colors[color] || 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
};

// Admin Management (Super Admin only)
const AdminManagement = () => {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChargesModal, setShowChargesModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/admins', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAdmins(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (adminId, newStatus) => {
    try {
      await axios.put(`/api/admin/manage/admins/${adminId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchAdmins();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating status');
    }
  };

  const filteredAdmins = admins.filter(adm => 
    adm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adm.adminCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Admin Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg"
        >
          <Plus size={20} />
          Create Admin
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search admins by name, email, or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Admins</div>
          <div className="text-2xl font-bold text-yellow-400">{admins.length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-400">{admins.filter(a => a.status === 'ACTIVE').length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Users</div>
          <div className="text-2xl font-bold text-purple-400">{admins.reduce((sum, a) => sum + (a.stats?.totalUsers || 0), 0)}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Admin Wallet</div>
          <div className="text-2xl font-bold text-green-400">₹{admins.reduce((sum, a) => sum + (a.wallet?.balance || 0), 0).toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : filteredAdmins.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No admins found</div>
      ) : (
        <div className="space-y-4">
          {filteredAdmins.map(adm => (
            <div key={adm._id} className="bg-dark-800 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Admin Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">{adm.name || adm.username}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${adm.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {adm.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{adm.email} • {adm.phone || 'No phone'}</div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-sm font-mono bg-purple-500/20 text-purple-400 px-2 py-1 rounded">{adm.adminCode}</span>
                    <span className="text-xs text-gray-500">Created: {new Date(adm.createdAt).toLocaleDateString()}</span>
                    {adm.referralCode && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/login?ref=${adm.referralCode}`);
                          alert('Registration link copied!');
                        }}
                        className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded hover:bg-green-600/30"
                      >
                        Copy User Link
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Wallet</div>
                    <div className="text-lg font-bold text-green-400">₹{(adm.wallet?.balance || 0).toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Users</div>
                    <div className="text-lg font-bold">{adm.stats?.totalUsers || adm.userCount || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Brokerage</div>
                    <div className="text-lg font-bold">₹{adm.charges?.brokerage || 20}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedAdmin(adm); setShowDetailModal(true); }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1"
                  >
                    <Eye size={16} /> View
                  </button>
                  <button
                    onClick={() => { setSelectedAdmin(adm); setShowFundModal(true); }}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
                  >
                    <Wallet size={16} /> Fund
                  </button>
                  <button
                    onClick={() => { setSelectedAdmin(adm); setShowChargesModal(true); }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1"
                  >
                    <Settings size={16} /> Charges
                  </button>
                  <button
                    onClick={() => { setSelectedAdmin(adm); setShowPasswordModal(true); }}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm flex items-center gap-1"
                  >
                    <Key size={16} /> Password
                  </button>
                  {adm.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleStatusChange(adm._id, 'SUSPENDED')}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(adm._id, 'ACTIVE')}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateAdminModal
          token={admin.token}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchAdmins(); }}
        />
      )}

      {showFundModal && selectedAdmin && (
        <AdminFundModal
          admin={selectedAdmin}
          token={admin.token}
          onClose={() => { setShowFundModal(false); setSelectedAdmin(null); }}
          onSuccess={() => { fetchAdmins(); }}
        />
      )}

      {showDetailModal && selectedAdmin && (
        <AdminDetailModal
          admin={selectedAdmin}
          token={admin.token}
          onClose={() => { setShowDetailModal(false); setSelectedAdmin(null); }}
        />
      )}

      {showPasswordModal && selectedAdmin && (
        <AdminPasswordResetModal
          admin={selectedAdmin}
          token={admin.token}
          onClose={() => { setShowPasswordModal(false); setSelectedAdmin(null); }}
        />
      )}

      {showChargesModal && selectedAdmin && (
        <AdminChargesModal
          admin={selectedAdmin}
          token={admin.token}
          onClose={() => { setShowChargesModal(false); setSelectedAdmin(null); }}
          onSuccess={() => { fetchAdmins(); }}
        />
      )}
    </div>
  );
};

// Create Admin Modal
const CreateAdminModal = ({ token, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ username: '', name: '', email: '', phone: '', password: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/manage/admins', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Create New Admin</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        {error && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username *" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
          <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
          <input type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
          <input type="text" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
          <input type="password" placeholder="Password *" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
          <input
            type="text"
            inputMode="numeric"
            placeholder="4-6 digit PIN *"
            value={formData.pin}
            onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
            className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
            required
            pattern="[0-9]{4,6}"
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-dark-600 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-yellow-600 py-2 rounded">{loading ? 'Creating...' : 'Create Admin'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Fund Modal
const AdminFundModal = ({ admin: targetAdmin, token, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFund = async (action) => {
    if (!amount || Number(amount) <= 0) return setError('Enter valid amount');
    setLoading(true);
    setError('');
    try {
      await axios.post(`/api/admin/manage/admins/${targetAdmin._id}/${action}-funds`, { 
        amount: Number(amount),
        description 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Admin Wallet</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="bg-dark-700 rounded p-4 mb-4">
          <div className="text-sm text-gray-400">{targetAdmin.name || targetAdmin.username}</div>
          <div className="text-xs text-purple-400 font-mono">{targetAdmin.adminCode}</div>
          <div className="text-2xl font-bold text-green-400 mt-2">₹{targetAdmin.wallet?.balance?.toLocaleString() || '0'}</div>
        </div>
        {error && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4">{error}</div>}
        <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 mb-3" />
        <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 mb-4" />
        <div className="flex gap-3">
          <button onClick={() => handleFund('add')} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2">
            <ArrowUpCircle size={18} /> Deposit
          </button>
          <button onClick={() => handleFund('deduct')} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded flex items-center justify-center gap-2">
            <ArrowDownCircle size={18} /> Withdraw
          </button>
        </div>
      </div>
    </div>
  );
};

// Admin Detail Modal - Shows users and ledger
const AdminDetailModal = ({ admin: targetAdmin, token, onClose }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, ledgerRes] = await Promise.all([
        axios.get(`/api/admin/manage/admins/${targetAdmin._id}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/admin/manage/admins/${targetAdmin._id}/ledger`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(usersRes.data.users || []);
      setLedger(ledgerRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-dark-600">
          <div>
            <h2 className="text-xl font-bold">{targetAdmin.name || targetAdmin.username}</h2>
            <div className="text-sm text-gray-400">{targetAdmin.email}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">{targetAdmin.adminCode}</span>
              <span className={`px-2 py-1 rounded text-xs ${targetAdmin.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {targetAdmin.status}
              </span>
            </div>
          </div>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-dark-600">
          <div className="text-center">
            <div className="text-xs text-gray-400">Wallet Balance</div>
            <div className="text-lg font-bold text-green-400">₹{(targetAdmin.wallet?.balance || 0).toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Total Users</div>
            <div className="text-lg font-bold">{users.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Brokerage</div>
            <div className="text-lg font-bold">₹{targetAdmin.charges?.brokerage || 20}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Leverage</div>
            <div className="text-lg font-bold">{targetAdmin.charges?.intradayLeverage || 5}x</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600">
          <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 ${activeTab === 'users' ? 'bg-purple-600' : 'bg-dark-700'}`}>
            Users ({users.length})
          </button>
          <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-3 ${activeTab === 'ledger' ? 'bg-purple-600' : 'bg-dark-700'}`}>
            Ledger ({ledger.length})
          </button>
          <button onClick={() => setActiveTab('charges')} className={`flex-1 py-3 ${activeTab === 'charges' ? 'bg-purple-600' : 'bg-dark-700'}`}>
            Charges
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
          ) : activeTab === 'users' ? (
            users.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No users under this admin</div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user._id} className="flex items-center justify-between bg-dark-700 rounded p-3">
                    <div>
                      <div className="font-medium">{user.fullName || user.username}</div>
                      <div className="text-xs text-gray-400">{user.email} • {user.userId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">₹{(user.wallet?.cashBalance || 0).toLocaleString()}</div>
                      <div className={`text-xs ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'ledger' ? (
            ledger.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No transactions</div>
            ) : (
              <div className="space-y-2">
                {ledger.map(entry => (
                  <div key={entry._id} className="flex items-center justify-between bg-dark-700 rounded p-3">
                    <div>
                      <div className="text-sm">{entry.reason}</div>
                      <div className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className={entry.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}>
                        {entry.type === 'CREDIT' ? '+' : '-'}₹{entry.amount?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">Bal: ₹{entry.balanceAfter?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Brokerage</div>
                <div className="text-lg font-bold">₹{targetAdmin.charges?.brokerage || 20}</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Intraday Leverage</div>
                <div className="text-lg font-bold">{targetAdmin.charges?.intradayLeverage || 5}x</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Delivery Leverage</div>
                <div className="text-lg font-bold">{targetAdmin.charges?.deliveryLeverage || 1}x</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Option Buy Leverage</div>
                <div className="text-lg font-bold">{targetAdmin.charges?.optionBuyLeverage || 1}x</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Withdrawal Fee</div>
                <div className="text-lg font-bold">₹{targetAdmin.charges?.withdrawalFee || 0}</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Profit Share</div>
                <div className="text-lg font-bold">{targetAdmin.charges?.profitShare || 0}%</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Min Withdrawal</div>
                <div className="text-lg font-bold">₹{targetAdmin.charges?.minWithdrawal || 100}</div>
              </div>
              <div className="bg-dark-700 rounded p-3">
                <div className="text-xs text-gray-400">Max Withdrawal</div>
                <div className="text-lg font-bold">₹{targetAdmin.charges?.maxWithdrawal || 100000}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-dark-600">
          <button onClick={onClose} className="w-full bg-dark-600 hover:bg-dark-500 py-2 rounded">Close</button>
        </div>
      </div>
    </div>
  );
};

// Admin Password Reset Modal
const AdminPasswordResetModal = ({ admin: targetAdmin, token, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`/api/admin/manage/admins/${targetAdmin._id}/reset-password`, { newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Password reset successfully' });
      setTimeout(onClose, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error resetting password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Reset Admin Password</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="bg-dark-700 rounded p-4 mb-4">
          <div className="text-sm text-gray-400">Resetting password for:</div>
          <div className="font-bold">{targetAdmin.name || targetAdmin.username}</div>
          <div className="text-xs text-purple-400 font-mono">{targetAdmin.adminCode}</div>
        </div>
        {message.text && (
          <div className={`p-3 rounded mb-4 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleReset}>
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password (min 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 pr-10"
              required
              minLength={6}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-dark-600 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Charges Modal
const AdminChargesModal = ({ admin: targetAdmin, token, onClose, onSuccess }) => {
  const [charges, setCharges] = useState({
    brokerage: targetAdmin.charges?.brokerage || 20,
    intradayLeverage: targetAdmin.charges?.intradayLeverage || 5,
    deliveryLeverage: targetAdmin.charges?.deliveryLeverage || 1,
    optionBuyLeverage: targetAdmin.charges?.optionBuyLeverage || 1,
    optionSellLeverage: targetAdmin.charges?.optionSellLeverage || 1,
    futuresLeverage: targetAdmin.charges?.futuresLeverage || 1,
    withdrawalFee: targetAdmin.charges?.withdrawalFee || 0,
    profitShare: targetAdmin.charges?.profitShare || 0,
    minWithdrawal: targetAdmin.charges?.minWithdrawal || 100,
    maxWithdrawal: targetAdmin.charges?.maxWithdrawal || 100000
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`/api/admin/manage/admins/${targetAdmin._id}/charges`, { charges }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Charges updated successfully' });
      onSuccess();
      setTimeout(onClose, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating charges' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Admin Charges</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="bg-dark-700 rounded p-3 mb-4">
          <div className="font-bold">{targetAdmin.name || targetAdmin.username}</div>
          <div className="text-xs text-purple-400 font-mono">{targetAdmin.adminCode}</div>
        </div>
        {message.text && (
          <div className={`p-3 rounded mb-4 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Brokerage (₹)</label>
              <input type="number" value={charges.brokerage} onChange={e => setCharges({...charges, brokerage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Intraday Leverage</label>
              <input type="number" value={charges.intradayLeverage} onChange={e => setCharges({...charges, intradayLeverage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Delivery Leverage</label>
              <input type="number" value={charges.deliveryLeverage} onChange={e => setCharges({...charges, deliveryLeverage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Option Buy Leverage</label>
              <input type="number" value={charges.optionBuyLeverage} onChange={e => setCharges({...charges, optionBuyLeverage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Option Sell Leverage</label>
              <input type="number" value={charges.optionSellLeverage} onChange={e => setCharges({...charges, optionSellLeverage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Futures Leverage</label>
              <input type="number" value={charges.futuresLeverage} onChange={e => setCharges({...charges, futuresLeverage: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Withdrawal Fee (₹)</label>
              <input type="number" value={charges.withdrawalFee} onChange={e => setCharges({...charges, withdrawalFee: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Profit Share (%)</label>
              <input type="number" value={charges.profitShare} onChange={e => setCharges({...charges, profitShare: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Withdrawal (₹)</label>
              <input type="number" value={charges.minWithdrawal} onChange={e => setCharges({...charges, minWithdrawal: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Withdrawal (₹)</label>
              <input type="number" value={charges.maxWithdrawal} onChange={e => setCharges({...charges, maxWithdrawal: Number(e.target.value)})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-dark-600 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded">
              {loading ? 'Saving...' : 'Save Charges'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Super Admin Create User - Create users and assign to any admin
const SuperAdminCreateUser = () => {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', fullName: '', phone: '', initialBalance: 0,
    // Settings
    marginType: 'exposure',
    ledgerBalanceClosePercent: 90,
    profitTradeHoldSeconds: 0,
    lossTradeHoldSeconds: 0,
    // Toggles
    isActivated: true,
    isReadOnly: false,
    isDemo: false,
    intradaySquare: false,
    blockLimitAboveBelowHighLow: false,
    blockLimitBetweenHighLow: false,
    // Allowed Segments
    allowedSegments: ['NSE', 'MCX', 'EQ'],
    // Segment Permissions
    segmentPermissions: {
      showMCX: true, showMCXOptBuy: true, showMCXOptSell: true, showMCXOpt: true,
      showNSE: true, showIDXNSE: true, showIDXOptBuy: true, showIDXOptSell: true, showIDXOpt: true,
      showSTKOptBuy: true, showSTKOptSell: true, showSTKOpt: true, showSTKNSE: true, showSTKEQ: true,
      showBSEOptBuy: true, showBSEOptSell: true, showBSEOpt: true, showIDXBSE: true,
      showCRYPTO: false, showFOREX: false, showCOMEX: false, showGLOBALINDEX: false
    }
  });

  const segmentOptions = ['NSE', 'MCX', 'BFO', 'EQ', 'CRYPTO', 'COMEX', 'FOREX', 'GLOBALINDEX'];

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/admins', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      const allAdmins = [
        { _id: 'SUPER', username: 'Super Admin (Direct)', adminCode: 'SUPER' },
        ...data
      ];
      setAdmins(allAdmins);
      setSelectedAdmin('SUPER');
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleSegmentToggle = (segment) => {
    setFormData(prev => ({
      ...prev,
      allowedSegments: prev.allowedSegments.includes(segment)
        ? prev.allowedSegments.filter(s => s !== segment)
        : [...prev.allowedSegments, segment]
    }));
  };

  const handlePermissionToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      segmentPermissions: {
        ...prev.segmentPermissions,
        [key]: !prev.segmentPermissions[key]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const targetAdmin = admins.find(a => a._id === selectedAdmin);
      const adminCode = targetAdmin?.adminCode || 'SUPER';

      const { data } = await axios.post('/api/admin/manage/create-user', {
        ...formData,
        adminCode: adminCode
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });

      setMessage({ type: 'success', text: `User created successfully! User ID: ${data.user?.userId || data.userId}` });
      // Reset form
      setFormData({
        username: '', email: '', password: '', fullName: '', phone: '', initialBalance: 0,
        marginType: 'exposure', ledgerBalanceClosePercent: 90, profitTradeHoldSeconds: 0, lossTradeHoldSeconds: 0,
        isActivated: true, isReadOnly: false, isDemo: false, intradaySquare: false,
        blockLimitAboveBelowHighLow: false, blockLimitBetweenHighLow: false,
        allowedSegments: ['NSE', 'MCX', 'EQ'],
        segmentPermissions: {
          showMCX: true, showMCXOptBuy: true, showMCXOptSell: true, showMCXOpt: true,
          showNSE: true, showIDXNSE: true, showIDXOptBuy: true, showIDXOptSell: true, showIDXOpt: true,
          showSTKOptBuy: true, showSTKOptSell: true, showSTKOpt: true, showSTKNSE: true, showSTKEQ: true,
          showBSEOptBuy: true, showBSEOptSell: true, showBSEOpt: true, showIDXBSE: true,
          showCRYPTO: false, showFOREX: false, showCOMEX: false, showGLOBALINDEX: false
        }
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-dark-600'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create User</h1>
        <p className="text-gray-400 text-sm mt-1">Create a new user with comprehensive settings</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Info */}
        <div className="bg-dark-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-yellow-500 mb-4">Basic Information</h2>
          
          {/* Assign to Admin */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Assign to Admin</label>
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
            >
              {admins.map(a => (
                <option key={a._id} value={a._id}>{a.username} ({a.adminCode})</option>
              ))}
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Username *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              required
              minLength={6}
            />
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Initial Balance (₹)</label>
            <input
              type="number"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              min="0"
            />
          </div>

          {/* Margin Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Margin Type</label>
            <select
              value={formData.marginType}
              onChange={(e) => setFormData({ ...formData, marginType: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
            >
              <option value="exposure">Exposure</option>
              <option value="margin">Margin</option>
            </select>
          </div>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          {/* Trading Settings */}
          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-500 mb-4">Trading Settings</h2>
            
            {/* Ledger Balance Close % */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Ledger Balance Close (%)</label>
              <input
                type="number"
                value={formData.ledgerBalanceClosePercent}
                onChange={(e) => setFormData({ ...formData, ledgerBalanceClosePercent: parseInt(e.target.value) || 90 })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                min="0"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">Close positions when loss reaches this % of ledger balance</p>
            </div>

            {/* Profit Trade Hold Seconds */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Profit Trade Hold (seconds)</label>
              <input
                type="number"
                value={formData.profitTradeHoldSeconds}
                onChange={(e) => setFormData({ ...formData, profitTradeHoldSeconds: parseInt(e.target.value) || 0 })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                min="0"
              />
            </div>

            {/* Loss Trade Hold Seconds */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Loss Trade Hold (seconds)</label>
              <input
                type="number"
                value={formData.lossTradeHoldSeconds}
                onChange={(e) => setFormData({ ...formData, lossTradeHoldSeconds: parseInt(e.target.value) || 0 })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                min="0"
              />
            </div>
          </div>

          {/* Toggle Settings */}
          <div className="bg-dark-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-500 mb-4">Account Controls</h2>
            <ToggleSwitch 
              label="Activation" 
              checked={formData.isActivated} 
              onChange={() => setFormData({ ...formData, isActivated: !formData.isActivated })} 
            />
            <ToggleSwitch 
              label="Read Only" 
              checked={formData.isReadOnly} 
              onChange={() => setFormData({ ...formData, isReadOnly: !formData.isReadOnly })} 
            />
            <ToggleSwitch 
              label="Demo Account" 
              checked={formData.isDemo} 
              onChange={() => setFormData({ ...formData, isDemo: !formData.isDemo })} 
            />
            <ToggleSwitch 
              label="Intraday Square (3:29 PM)" 
              checked={formData.intradaySquare} 
              onChange={() => setFormData({ ...formData, intradaySquare: !formData.intradaySquare })} 
            />
            <ToggleSwitch 
              label="Block Limit Above/Below High Low" 
              checked={formData.blockLimitAboveBelowHighLow} 
              onChange={() => setFormData({ ...formData, blockLimitAboveBelowHighLow: !formData.blockLimitAboveBelowHighLow })} 
            />
            <ToggleSwitch 
              label="Block Limit Between High Low" 
              checked={formData.blockLimitBetweenHighLow} 
              onChange={() => setFormData({ ...formData, blockLimitBetweenHighLow: !formData.blockLimitBetweenHighLow })} 
            />
          </div>
        </div>

        {/* Segment Allow - Full Width */}
        <div className="lg:col-span-2 bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-500 mb-4">Segment Allow</h2>
          <p className="text-sm text-gray-400 mb-4">Select the segments you want to allow for this user</p>
          <div className="flex flex-wrap gap-2">
            {segmentOptions.map(segment => (
              <button
                key={segment}
                type="button"
                onClick={() => handleSegmentToggle(segment)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  formData.allowedSegments.includes(segment)
                    ? 'bg-green-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {segment}
              </button>
            ))}
          </div>
        </div>

        {/* Segment Permissions - Full Width */}
        <div className="lg:col-span-2 bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-500 mb-4">Segment Permissions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* MCX */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-blue-400 mb-2">MCX</h3>
              <ToggleSwitch label="Show MCX" checked={formData.segmentPermissions.showMCX} onChange={() => handlePermissionToggle('showMCX')} />
              <ToggleSwitch label="MCX Opt Buy" checked={formData.segmentPermissions.showMCXOptBuy} onChange={() => handlePermissionToggle('showMCXOptBuy')} />
              <ToggleSwitch label="MCX Opt Sell" checked={formData.segmentPermissions.showMCXOptSell} onChange={() => handlePermissionToggle('showMCXOptSell')} />
              <ToggleSwitch label="MCX Opt" checked={formData.segmentPermissions.showMCXOpt} onChange={() => handlePermissionToggle('showMCXOpt')} />
            </div>
            
            {/* NSE Index */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-blue-400 mb-2">NSE Index</h3>
              <ToggleSwitch label="Show NSE" checked={formData.segmentPermissions.showNSE} onChange={() => handlePermissionToggle('showNSE')} />
              <ToggleSwitch label="IDX NSE" checked={formData.segmentPermissions.showIDXNSE} onChange={() => handlePermissionToggle('showIDXNSE')} />
              <ToggleSwitch label="IDX Opt Buy" checked={formData.segmentPermissions.showIDXOptBuy} onChange={() => handlePermissionToggle('showIDXOptBuy')} />
              <ToggleSwitch label="IDX Opt Sell" checked={formData.segmentPermissions.showIDXOptSell} onChange={() => handlePermissionToggle('showIDXOptSell')} />
              <ToggleSwitch label="IDX Opt" checked={formData.segmentPermissions.showIDXOpt} onChange={() => handlePermissionToggle('showIDXOpt')} />
            </div>
            
            {/* Stock Options */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Stock Options</h3>
              <ToggleSwitch label="STK Opt Buy" checked={formData.segmentPermissions.showSTKOptBuy} onChange={() => handlePermissionToggle('showSTKOptBuy')} />
              <ToggleSwitch label="STK Opt Sell" checked={formData.segmentPermissions.showSTKOptSell} onChange={() => handlePermissionToggle('showSTKOptSell')} />
              <ToggleSwitch label="STK Opt" checked={formData.segmentPermissions.showSTKOpt} onChange={() => handlePermissionToggle('showSTKOpt')} />
              <ToggleSwitch label="STK NSE" checked={formData.segmentPermissions.showSTKNSE} onChange={() => handlePermissionToggle('showSTKNSE')} />
              <ToggleSwitch label="STK EQ" checked={formData.segmentPermissions.showSTKEQ} onChange={() => handlePermissionToggle('showSTKEQ')} />
            </div>
            
            {/* BSE */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-blue-400 mb-2">BSE</h3>
              <ToggleSwitch label="BSE Opt Buy" checked={formData.segmentPermissions.showBSEOptBuy} onChange={() => handlePermissionToggle('showBSEOptBuy')} />
              <ToggleSwitch label="BSE Opt Sell" checked={formData.segmentPermissions.showBSEOptSell} onChange={() => handlePermissionToggle('showBSEOptSell')} />
              <ToggleSwitch label="BSE Opt" checked={formData.segmentPermissions.showBSEOpt} onChange={() => handlePermissionToggle('showBSEOpt')} />
              <ToggleSwitch label="IDX BSE" checked={formData.segmentPermissions.showIDXBSE} onChange={() => handlePermissionToggle('showIDXBSE')} />
            </div>
            
            {/* Others */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Others</h3>
              <ToggleSwitch label="CRYPTO" checked={formData.segmentPermissions.showCRYPTO} onChange={() => handlePermissionToggle('showCRYPTO')} />
              <ToggleSwitch label="FOREX" checked={formData.segmentPermissions.showFOREX} onChange={() => handlePermissionToggle('showFOREX')} />
              <ToggleSwitch label="COMEX" checked={formData.segmentPermissions.showCOMEX} onChange={() => handlePermissionToggle('showCOMEX')} />
              <ToggleSwitch label="GLOBAL INDEX" checked={formData.segmentPermissions.showGLOBALINDEX} onChange={() => handlePermissionToggle('showGLOBALINDEX')} />
            </div>
          </div>
        </div>

        {/* Submit Button - Full Width */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating User...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Super Admin Fund Requests - Shows all fund requests from all users
const SuperAdminFundRequests = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalDeposits: 0, totalWithdrawals: 0 });

  useEffect(() => {
    fetchRequests();
  }, [filter, typeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/admin/manage/all-fund-requests', {
        params: { status: filter, type: typeFilter !== 'ALL' ? typeFilter : undefined },
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setRequests(data.requests || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.post(`/api/admin/manage/fund-requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fund Requests</h1>
          <p className="text-gray-400 text-sm mt-1">Manage deposit and withdrawal requests from all users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Pending</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Approved</div>
          <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Rejected</div>
          <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Deposits</div>
          <div className="text-xl font-bold text-green-400">₹{stats.totalDeposits?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Withdrawals</div>
          <div className="text-xl font-bold text-red-400">₹{stats.totalWithdrawals?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded text-sm ${filter === status ? 'bg-purple-600' : 'bg-dark-700 hover:bg-dark-600'}`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['ALL', 'DEPOSIT', 'WITHDRAWAL'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded text-sm ${typeFilter === type ? 'bg-blue-600' : 'bg-dark-700 hover:bg-dark-600'}`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No {filter.toLowerCase()} requests found</div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">User</th>
                <th className="text-left px-4 py-3 text-gray-400">Admin</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-right px-4 py-3 text-gray-400">Amount</th>
                <th className="text-left px-4 py-3 text-gray-400">Reference</th>
                <th className="text-left px-4 py-3 text-gray-400">Date</th>
                <th className="text-center px-4 py-3 text-gray-400">Status</th>
                <th className="text-center px-4 py-3 text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req._id} className="border-t border-dark-600 hover:bg-dark-700/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{req.user?.fullName || req.user?.username}</div>
                    <div className="text-xs text-gray-500">{req.user?.userId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{req.admin?.username || 'Super Admin'}</div>
                    <div className="text-xs text-gray-500">{req.admin?.adminCode || '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${req.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    ₹{req.amount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {req.referenceId || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(req.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      req.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      req.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {req.status === 'PENDING' && (
                      <div className="flex gap-1 justify-center">
                        <button 
                          onClick={() => handleAction(req._id, 'approve')} 
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(req._id, 'reject')} 
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Fund Requests Component (for Admin)
const FundRequests = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get(`/api/admin/manage/fund-requests?status=${filter}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setRequests(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.post(`/api/admin/manage/fund-requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Fund Requests</h1>
      
      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded ${filter === status ? 'bg-purple-600' : 'bg-dark-700'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No {filter.toLowerCase()} requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id} className="bg-dark-800 rounded-lg p-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${req.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {req.type}
                    </span>
                    <span className="font-bold">₹{req.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    User: {req.user?.fullName || req.user?.username} ({req.userId})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(req.createdAt).toLocaleString()}
                  </div>
                  {req.referenceId && <div className="text-xs text-gray-500">Ref: {req.referenceId}</div>}
                </div>
                {req.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(req._id, 'approve')} className="px-4 py-2 bg-green-600 rounded text-sm">Approve</button>
                    <button onClick={() => handleAction(req._id, 'reject')} className="px-4 py-2 bg-red-600 rounded text-sm">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Bank Accounts Component
const BankAccounts = () => {
  const { admin } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/bank-accounts', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try {
      await axios.delete(`/api/admin/manage/bank-accounts/${id}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchAccounts();
    } catch (error) {
      alert('Error deleting');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Bank Accounts</h1>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-purple-600 px-4 py-2 rounded">
          <Plus size={20} /> Add Account
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No bank accounts added</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map(acc => (
            <div key={acc._id} className="bg-dark-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs ${acc.type === 'BANK' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {acc.type}
                  </span>
                  <div className="font-bold mt-2">{acc.holderName}</div>
                  {acc.type === 'BANK' ? (
                    <>
                      <div className="text-sm text-gray-400">{acc.bankName}</div>
                      <div className="text-sm font-mono">{acc.accountNumber}</div>
                      <div className="text-xs text-gray-500">IFSC: {acc.ifsc}</div>
                    </>
                  ) : (
                    <div className="text-sm font-mono text-purple-400">{acc.upiId}</div>
                  )}
                </div>
                <button onClick={() => handleDelete(acc._id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddBankModal token={admin.token} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchAccounts(); }} />
      )}
    </div>
  );
};

// Add Bank Modal
const AddBankModal = ({ token, onClose, onSuccess }) => {
  const [type, setType] = useState('BANK');
  const [formData, setFormData] = useState({ holderName: '', bankName: '', accountNumber: '', ifsc: '', upiId: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/admin/manage/bank-accounts', { type, ...formData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add Payment Method</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setType('BANK')} className={`flex-1 py-2 rounded ${type === 'BANK' ? 'bg-blue-600' : 'bg-dark-700'}`}>Bank</button>
          <button onClick={() => setType('UPI')} className={`flex-1 py-2 rounded ${type === 'UPI' ? 'bg-purple-600' : 'bg-dark-700'}`}>UPI</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Account Holder Name *" value={formData.holderName} onChange={e => setFormData({...formData, holderName: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
          {type === 'BANK' ? (
            <>
              <input type="text" placeholder="Bank Name *" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
              <input type="text" placeholder="Account Number *" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
              <input type="text" placeholder="IFSC Code *" value={formData.ifsc} onChange={e => setFormData({...formData, ifsc: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
            </>
          ) : (
            <input type="text" placeholder="UPI ID *" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2" required />
          )}
          <button type="submit" disabled={loading} className="w-full bg-green-600 py-2 rounded">{loading ? 'Adding...' : 'Add Account'}</button>
        </form>
      </div>
    </div>
  );
};

// Admin Wallet - For Admin to view wallet, request funds, download ledger
const AdminWallet = () => {
  const { admin, updateAdmin } = useAuth();
  const [walletData, setWalletData] = useState(null);
  const [fundRequests, setFundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchWalletData();
    fetchFundRequests();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/my-wallet', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setWalletData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFundRequests = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/my-fund-requests', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setFundRequests(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRequestFund = async (e) => {
    e.preventDefault();
    if (!requestAmount || Number(requestAmount) <= 0) {
      setMessage({ type: 'error', text: 'Enter valid amount' });
      return;
    }
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.post('/api/admin/manage/fund-request', {
        amount: Number(requestAmount),
        reason: requestReason
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setMessage({ type: 'success', text: 'Fund request submitted successfully' });
      setRequestAmount('');
      setRequestReason('');
      setShowRequestModal(false);
      fetchFundRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error submitting request' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadLedger = async () => {
    try {
      const response = await axios.get('/api/admin/manage/my-ledger/download', {
        headers: { Authorization: `Bearer ${admin.token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admin-ledger-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading ledger');
    }
  };

  const downloadUserTransactions = async () => {
    try {
      const response = await axios.get('/api/admin/manage/user-transactions/download', {
        headers: { Authorization: `Bearer ${admin.token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading transactions');
    }
  };

  if (loading) {
    return <div className="p-6 text-center"><RefreshCw className="animate-spin inline" size={24} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
        >
          <Plus size={20} />
          Request Funds
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 mb-6">
        <div className="text-white/80 text-sm mb-1">Available Balance</div>
        <div className="text-4xl font-bold text-white mb-4">₹{(walletData?.wallet?.balance || 0).toLocaleString()}</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-white/60">Total Deposited</div>
            <div className="text-white font-semibold">₹{(walletData?.wallet?.totalDeposited || 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-white/60">Total Withdrawn</div>
            <div className="text-white font-semibold">₹{(walletData?.wallet?.totalWithdrawn || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* User Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Users</div>
          <div className="text-2xl font-bold text-purple-400">{walletData?.summary?.totalUsers || 0}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">User Deposits</div>
          <div className="text-2xl font-bold text-green-400">₹{(walletData?.summary?.totalUserDeposits || 0).toLocaleString()}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">User Withdrawals</div>
          <div className="text-2xl font-bold text-red-400">₹{(walletData?.summary?.totalUserWithdrawals || 0).toLocaleString()}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Distributed to Users</div>
          <div className="text-2xl font-bold text-blue-400">₹{(walletData?.summary?.distributedToUsers || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total User Profits</div>
          <div className="text-2xl font-bold text-green-400">₹{(walletData?.summary?.totalUserProfits || 0).toLocaleString()}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total User Losses</div>
          <div className="text-2xl font-bold text-red-400">₹{(walletData?.summary?.totalUserLosses || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={downloadLedger} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
          <FileText size={18} /> Download My Ledger
        </button>
        <button onClick={downloadUserTransactions} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
          <FileText size={18} /> Download User Transactions
        </button>
      </div>

      {/* Fund Requests History */}
      <div className="bg-dark-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">My Fund Requests</h2>
        {fundRequests.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No fund requests yet</div>
        ) : (
          <div className="space-y-2">
            {fundRequests.map(req => (
              <div key={req._id} className="flex items-center justify-between bg-dark-700 rounded p-3">
                <div>
                  <div className="font-medium">₹{req.amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{req.reason || 'No reason'}</div>
                  <div className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleString()}</div>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${
                  req.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                  req.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Ledger */}
      <div className="bg-dark-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        {!walletData?.ledger?.length ? (
          <div className="text-center py-4 text-gray-400">No transactions yet</div>
        ) : (
          <div className="space-y-2">
            {walletData.ledger.slice(0, 10).map(entry => (
              <div key={entry._id} className="flex items-center justify-between bg-dark-700 rounded p-3">
                <div>
                  <div className="text-sm">{entry.reason}</div>
                  <div className="text-xs text-gray-400">{entry.description}</div>
                  <div className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className={entry.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}>
                    {entry.type === 'CREDIT' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Bal: ₹{entry.balanceAfter.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Fund Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Request Funds</h2>
              <button onClick={() => setShowRequestModal(false)}><X size={24} /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Request funds from Super Admin. Your current balance is ₹{(walletData?.wallet?.balance || 0).toLocaleString()}
            </p>
            <form onSubmit={handleRequestFund} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={e => setRequestAmount(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  placeholder="Enter amount"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                <textarea
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  placeholder="Why do you need these funds?"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 bg-dark-600 py-2 rounded">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin Fund Requests Management - For Super Admin to approve/reject admin fund requests
const AdminFundRequestsManagement = () => {
  const { admin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/manage/admin-fund-requests?status=${filter}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setRequests(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, status, remarks = '') => {
    setProcessing(requestId);
    try {
      await axios.put(`/api/admin/manage/admin-fund-requests/${requestId}`, {
        status,
        remarks
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing request');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Fund Requests</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg ${filter === status ? 
              status === 'PENDING' ? 'bg-yellow-600' :
              status === 'APPROVED' ? 'bg-green-600' : 'bg-red-600'
              : 'bg-dark-700'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No {filter.toLowerCase()} requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id} className="bg-dark-800 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">{req.admin?.name || req.admin?.username}</span>
                    <span className="font-mono bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-sm">{req.adminCode}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">{req.admin?.email}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Current Balance: ₹{(req.admin?.wallet?.balance || 0).toLocaleString()}
                  </div>
                  {req.reason && <div className="text-sm mt-2 text-gray-300">Reason: {req.reason}</div>}
                  <div className="text-xs text-gray-500 mt-1">{new Date(req.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400">Requested Amount</div>
                  <div className="text-2xl font-bold text-green-400">₹{req.amount.toLocaleString()}</div>
                </div>
                {filter === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req._id, 'APPROVED')}
                      disabled={processing === req._id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-1"
                    >
                      <ArrowUpCircle size={18} /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(req._id, 'REJECTED')}
                      disabled={processing === req._id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center gap-1"
                    >
                      <ArrowDownCircle size={18} /> Reject
                    </button>
                  </div>
                )}
                {filter !== 'PENDING' && (
                  <span className={`px-4 py-2 rounded ${
                    req.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {req.status}
                  </span>
                )}
              </div>
              {req.adminRemarks && (
                <div className="mt-3 pt-3 border-t border-dark-600 text-sm text-gray-400">
                  Remarks: {req.adminRemarks}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Ledger View
const LedgerView = () => {
  const { admin } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/my-ledger', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setLedger(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Wallet Ledger</h1>
      
      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : ledger.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No transactions yet</div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Date</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-gray-400">Reason</th>
                <th className="text-right px-4 py-3 text-gray-400">Amount</th>
                <th className="text-right px-4 py-3 text-gray-400">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(entry => (
                <tr key={entry._id} className="border-t border-dark-600">
                  <td className="px-4 py-3 text-sm">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${entry.type === 'CREDIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{entry.reason}</td>
                  <td className={`px-4 py-3 text-right ${entry.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.type === 'CREDIT' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">₹{entry.balanceAfter.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Bank Management (Super Admin only)
const BankManagement = () => {
  const { admin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [editingUpi, setEditingUpi] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get('/api/admin/bank-settings', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      console.error('Error fetching bank settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/admin/bank-settings/bank-account', formData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
      setShowAddBank(false);
      setFormData({});
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding bank account');
    }
  };

  const handleUpdateBank = async (id) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/bank-account/${id}`, formData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
      setEditingBank(null);
      setFormData({});
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating bank account');
    }
  };

  const handleDeleteBank = async (id) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    try {
      const { data } = await axios.delete(`/api/admin/bank-settings/bank-account/${id}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting bank account');
    }
  };

  const handleAddUpi = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/admin/bank-settings/upi-account', formData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
      setShowAddUpi(false);
      setFormData({});
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding UPI account');
    }
  };

  const handleUpdateUpi = async (id) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/upi-account/${id}`, formData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
      setEditingUpi(null);
      setFormData({});
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating UPI account');
    }
  };

  const handleDeleteUpi = async (id) => {
    if (!confirm('Are you sure you want to delete this UPI account?')) return;
    try {
      const { data } = await axios.delete(`/api/admin/bank-settings/upi-account/${id}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting UPI account');
    }
  };

  const toggleBankStatus = async (id, isActive) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/bank-account/${id}`, { isActive: !isActive }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating bank status');
    }
  };

  const toggleUpiStatus = async (id, isActive) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/upi-account/${id}`, { isActive: !isActive }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating UPI status');
    }
  };

  const setPrimaryBank = async (id) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/bank-account/${id}`, { isPrimary: true }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error setting primary bank');
    }
  };

  const setPrimaryUpi = async (id) => {
    try {
      const { data } = await axios.put(`/api/admin/bank-settings/upi-account/${id}`, { isPrimary: true }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setSettings(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error setting primary UPI');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Bank Management</h1>

      {/* Bank Accounts Section */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 size={24} />
            Bank Accounts
          </h2>
          <button
            onClick={() => { setShowAddBank(true); setFormData({}); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> Add Bank
          </button>
        </div>

        {settings?.bankAccounts?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No bank accounts configured</p>
        ) : (
          <div className="space-y-4">
            {settings?.bankAccounts?.map(bank => (
              <div key={bank._id} className={`bg-dark-700 rounded-lg p-4 border-l-4 ${bank.isPrimary ? 'border-green-500' : 'border-dark-600'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{bank.bankName}</h3>
                      {bank.isPrimary && <span className="text-xs bg-green-600 px-2 py-0.5 rounded">PRIMARY</span>}
                      {!bank.isActive && <span className="text-xs bg-red-600 px-2 py-0.5 rounded">INACTIVE</span>}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{bank.accountName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Account Number:</span>
                        <span className="ml-2 font-mono">{bank.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">IFSC:</span>
                        <span className="ml-2 font-mono">{bank.ifscCode}</span>
                      </div>
                      {bank.branch && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Branch:</span>
                          <span className="ml-2">{bank.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!bank.isPrimary && (
                      <button
                        onClick={() => setPrimaryBank(bank._id)}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => toggleBankStatus(bank._id, bank.isActive)}
                      className={`px-3 py-1 text-xs rounded ${bank.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                      {bank.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => { setEditingBank(bank._id); setFormData(bank); }}
                      className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBank(bank._id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPI Accounts Section */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard size={24} />
            UPI Accounts
          </h2>
          <button
            onClick={() => { setShowAddUpi(true); setFormData({}); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> Add UPI
          </button>
        </div>

        {settings?.upiAccounts?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No UPI accounts configured</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settings?.upiAccounts?.map(upi => (
              <div key={upi._id} className={`bg-dark-700 rounded-lg p-4 border-l-4 ${upi.isPrimary ? 'border-green-500' : 'border-dark-600'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{upi.name}</h3>
                    {upi.isPrimary && <span className="text-xs bg-green-600 px-2 py-0.5 rounded">PRIMARY</span>}
                  </div>
                  {!upi.isActive && <span className="text-xs bg-red-600 px-2 py-0.5 rounded">INACTIVE</span>}
                </div>
                <p className="font-mono text-lg text-green-400">{upi.upiId}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">{upi.provider}</p>
                <div className="flex items-center gap-2 mt-3">
                  {!upi.isPrimary && (
                    <button
                      onClick={() => setPrimaryUpi(upi._id)}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Primary
                    </button>
                  )}
                  <button
                    onClick={() => toggleUpiStatus(upi._id, upi.isActive)}
                    className={`px-2 py-1 text-xs rounded ${upi.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {upi.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteUpi(upi._id)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {showAddBank && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Bank Account</h3>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Name *</label>
                <input
                  type="text"
                  value={formData.accountName || ''}
                  onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Account Number *</label>
                <input
                  type="text"
                  value={formData.accountNumber || ''}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={formData.ifscCode || ''}
                  onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Branch</label>
                <input
                  type="text"
                  value={formData.branch || ''}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary || false}
                  onChange={(e) => setFormData({...formData, isPrimary: e.target.checked})}
                />
                <label htmlFor="isPrimary" className="text-sm">Set as primary account</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded font-medium">
                  Add Bank
                </button>
                <button type="button" onClick={() => setShowAddBank(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add UPI Modal */}
      {showAddUpi && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add UPI Account</h3>
            <form onSubmit={handleAddUpi} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">UPI ID *</label>
                <input
                  type="text"
                  value={formData.upiId || ''}
                  onChange={(e) => setFormData({...formData, upiId: e.target.value})}
                  placeholder="example@upi"
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Provider</label>
                <select
                  value={formData.provider || 'other'}
                  onChange={(e) => setFormData({...formData, provider: e.target.value})}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                >
                  <option value="gpay">Google Pay</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="paytm">Paytm</option>
                  <option value="bhim">BHIM</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimaryUpi"
                  checked={formData.isPrimary || false}
                  onChange={(e) => setFormData({...formData, isPrimary: e.target.checked})}
                />
                <label htmlFor="isPrimaryUpi" className="text-sm">Set as primary UPI</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded font-medium">
                  Add UPI
                </button>
                <button type="button" onClick={() => setShowAddUpi(false)} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Instrument Management (Super Admin only)
const InstrumentManagement = () => {
  const { admin } = useAuth();
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ segment: '', category: '', enabled: '', optionType: '' });
  const [seeding, setSeeding] = useState(false);
  const [marketData, setMarketData] = useState({});
  const [zerodhaStatus, setZerodhaStatus] = useState({ connected: false });

  useEffect(() => {
    fetchInstruments();
    fetchZerodhaStatus();
    fetchMarketData();
    
    // Refresh market data every 2 seconds
    const interval = setInterval(fetchMarketData, 2000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchZerodhaStatus = async () => {
    try {
      const { data } = await axios.get('/api/zerodha/status');
      setZerodhaStatus(data);
    } catch (error) {
      console.error('Error fetching Zerodha status:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const { data } = await axios.get('/api/zerodha/market-data');
      if (data && Object.keys(data).length > 0) {
        setMarketData(data);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchInstruments = async () => {
    try {
      let url = '/api/instruments/admin?';
      if (filter.segment) url += `segment=${filter.segment}&`;
      if (filter.category) url += `category=${filter.category}&`;
      if (filter.enabled) url += `enabled=${filter.enabled}&`;
      if (search) url += `search=${search}&`;
      
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setInstruments(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`/api/instruments/admin/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchInstruments();
    } catch (error) {
      alert(error.response?.data?.message || 'Error toggling instrument');
    }
  };

  const handleBulkToggle = async (isEnabled) => {
    const ids = instruments.filter(i => i.isEnabled !== isEnabled).map(i => i._id);
    if (ids.length === 0) return;
    
    try {
      await axios.put('/api/instruments/admin/bulk-toggle', { ids, isEnabled }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchInstruments();
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const { data } = await axios.post('/api/instruments/admin/seed-defaults', {}, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      alert(data.message);
      fetchInstruments();
    } catch (error) {
      alert(error.response?.data?.message || 'Error seeding instruments');
    } finally {
      setSeeding(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInstruments();
  };

  const categories = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'STOCKS', 'INDICES', 'MCX', 'COMMODITY', 'CURRENCY', 'OTHER'];

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Instrument Management</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${zerodhaStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">
              Zerodha: {zerodhaStatus.connected ? `Connected (${zerodhaStatus.userId})` : 'Not Connected'}
            </span>
            {Object.keys(marketData).length > 0 && (
              <span className="text-sm text-green-400 ml-2">• {Object.keys(marketData).length} live prices</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeedDefaults} disabled={seeding} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">
            {seeding ? 'Seeding...' : 'Seed Default Instruments'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <form onSubmit={handleSearch} className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded pl-10 pr-4 py-2"
              />
            </div>
          </form>
          <select
            value={filter.segment}
            onChange={e => setFilter({ ...filter, segment: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded px-3 py-2"
          >
            <option value="">All Segments</option>
            <option value="EQUITY">Equity</option>
            <option value="FNO">F&O</option>
            <option value="MCX">MCX</option>
            <option value="COMMODITY">Commodity</option>
            <option value="CURRENCY">Currency</option>
          </select>
          <select
            value={filter.category}
            onChange={e => setFilter({ ...filter, category: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filter.enabled}
            onChange={e => setFilter({ ...filter, enabled: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
          <select
            value={filter.optionType}
            onChange={e => setFilter({ ...filter, optionType: e.target.value })}
            className="bg-dark-700 border border-dark-600 rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="CE">Calls (CE)</option>
            <option value="PE">Puts (PE)</option>
            <option value="FUT">Futures</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-2xl font-bold">{instruments.length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Enabled</div>
          <div className="text-2xl font-bold text-green-400">{instruments.filter(i => i.isEnabled).length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Disabled</div>
          <div className="text-2xl font-bold text-red-400">{instruments.filter(i => !i.isEnabled).length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Featured</div>
          <div className="text-2xl font-bold text-yellow-400">{instruments.filter(i => i.isFeatured).length}</div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => handleBulkToggle(true)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
          Enable All Visible
        </button>
        <button onClick={() => handleBulkToggle(false)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
          Disable All Visible
        </button>
        <button onClick={fetchInstruments} className="px-3 py-1 bg-dark-600 hover:bg-dark-500 rounded text-sm flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Instruments Table */}
      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : instruments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No instruments found. Click "Seed Default Instruments" to add popular stocks and indices.
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Symbol</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-gray-400">Category</th>
                <th className="text-right px-4 py-3 text-gray-400">Strike</th>
                <th className="text-right px-4 py-3 text-gray-400">LTP</th>
                <th className="text-right px-4 py-3 text-gray-400">Change</th>
                <th className="text-center px-4 py-3 text-gray-400">Live</th>
                <th className="text-center px-4 py-3 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map(inst => {
                const liveData = marketData[inst.token] || {};
                const ltp = liveData.ltp || inst.ltp || 0;
                const change = liveData.change || inst.change || 0;
                const changePercent = liveData.changePercent || inst.changePercent || 0;
                const hasLiveData = !!liveData.ltp;
                
                return (
                  <tr key={inst._id} className="border-t border-dark-600 hover:bg-dark-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{inst.symbol}</div>
                      <div className="text-xs text-gray-500">{inst.exchange} • {inst.expiry || 'Spot'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {inst.optionType ? (
                        <span className={`px-2 py-0.5 rounded text-xs ${inst.optionType === 'CE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {inst.optionType}
                        </span>
                      ) : inst.instrumentType === 'FUTURES' ? (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">FUT</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">{inst.instrumentType}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">{inst.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      {inst.strike ? `₹${inst.strike.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {ltp > 0 ? `₹${ltp.toLocaleString()}` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {changePercent ? `${change >= 0 ? '+' : ''}${parseFloat(changePercent).toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasLiveData ? (
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
                      ) : (
                        <span className="w-2 h-2 bg-gray-600 rounded-full inline-block"></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(inst._id)}
                        className={`relative w-12 h-6 rounded-full transition ${inst.isEnabled ? 'bg-green-600' : 'bg-dark-600'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${inst.isEnabled ? 'left-7' : 'left-1'}`}></span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Market Control (Super Admin only)
const MarketControl = () => {
  const { admin } = useAuth();
  const [marketState, setMarketState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [zerodhaStatus, setZerodhaStatus] = useState(null);

  useEffect(() => {
    fetchMarketState();
    fetchBrokerStatus();
    
    // Check URL params for Zerodha callback
    const params = new URLSearchParams(window.location.search);
    const zerodhaResult = params.get('zerodha');
    if (zerodhaResult === 'success') {
      alert('Zerodha connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      fetchBrokerStatus();
    } else if (zerodhaResult === 'error') {
      alert('Zerodha connection failed: ' + (params.get('message') || 'Unknown error'));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (zerodhaResult === 'cancelled') {
      alert('Zerodha login was cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchBrokerStatus = async () => {
    try {
      const { data } = await axios.get('/api/zerodha/status');
      setZerodhaStatus(data);
    } catch (error) {
      console.error('Error fetching broker status:', error);
    }
  };

  const fetchMarketState = async () => {
    try {
      const { data } = await axios.get('/api/trade/market-state');
      setMarketState(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMarket = async () => {
    setUpdating(true);
    try {
      const { data } = await axios.put('/api/trade/market-state', {
        isMarketOpen: !marketState.isMarketOpen
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setMarketState(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating market state');
    } finally {
      setUpdating(false);
    }
  };

  const connectZerodha = async () => {
    try {
      const { data } = await axios.get('/api/zerodha/login-url', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      // Redirect to Zerodha login
      window.location.href = data.loginUrl;
    } catch (error) {
      alert(error.response?.data?.message || 'Error getting Zerodha login URL');
    }
  };

  const disconnectZerodha = async () => {
    try {
      await axios.post('/api/zerodha/logout', {}, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchBrokerStatus();
      alert('Zerodha disconnected');
    } catch (error) {
      alert(error.response?.data?.message || 'Error disconnecting Zerodha');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Market Control</h1>

      {/* Broker Connections */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Zerodha Kite Connect</h2>
        <p className="text-gray-400 text-sm mb-4">Connect to Zerodha Kite API for live market data feed</p>
        
        <div className="grid md:grid-cols-1 gap-4">
          {/* Zerodha Kite */}
          <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">Zerodha Kite</h3>
                  <p className="text-xs text-gray-400">Kite Connect API</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${zerodhaStatus?.connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {zerodhaStatus?.connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            {zerodhaStatus?.connected ? (
              <>
                <div className="text-xs text-gray-400 mb-3">
                  User ID: {zerodhaStatus.userId}
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await axios.post('/api/zerodha/seed-mcx', {}, {
                          headers: { Authorization: `Bearer ${admin.token}` }
                        });
                        alert(data.message);
                      } catch (error) {
                        alert(error.response?.data?.message || 'Error seeding MCX');
                      }
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm"
                  >
                    Seed MCX
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await axios.post('/api/zerodha/subscribe-all', {}, {
                          headers: { Authorization: `Bearer ${admin.token}` }
                        });
                        alert(data.message);
                      } catch (error) {
                        alert(error.response?.data?.message || 'Error subscribing');
                      }
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm"
                  >
                    Subscribe All
                  </button>
                </div>
                <button
                  onClick={disconnectZerodha}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectZerodha}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
              >
                Connect to Kite
              </button>
            )}
          </div>
        </div>

        {/* Redirect URL Info */}
        <div className="mt-4 p-3 bg-dark-700 rounded-lg border border-dark-600">
          <h4 className="text-sm font-medium mb-2">Kite Connect Redirect URL</h4>
          <p className="text-xs text-gray-400 mb-2">Add this URL in your Kite Connect app settings:</p>
          <code className="block bg-dark-900 p-2 rounded text-xs text-green-400 break-all">
            {window.location.origin.replace(':3000', ':5001')}/api/zerodha/callback
          </code>
        </div>
      </div>

      {/* Main Market Switch */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Global Market Status</h2>
            <p className="text-gray-400 text-sm mt-1">
              {marketState?.isMarketOpen 
                ? 'Market is OPEN - Trading is allowed' 
                : 'Market is CLOSED - Trading is disabled'}
            </p>
          </div>
          <button
            onClick={toggleMarket}
            disabled={updating}
            className={`px-8 py-4 rounded-lg text-lg font-bold transition ${
              marketState?.isMarketOpen 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {updating ? 'Updating...' : marketState?.isMarketOpen ? 'CLOSE MARKET' : 'OPEN MARKET'}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-6 flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${marketState?.isMarketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-lg font-bold ${marketState?.isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
            {marketState?.isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-400">When Market is OPEN</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✅ Users can place new orders</li>
            <li>✅ Users can modify orders</li>
            <li>✅ New positions can be opened</li>
            <li>✅ Square-off allowed</li>
            <li>✅ RMS actions active</li>
          </ul>
        </div>

        <div className="bg-dark-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-400">When Market is CLOSED</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>❌ No new orders allowed</li>
            <li>❌ No modifications allowed</li>
            <li>❌ No new positions</li>
            <li>✅ Square-off still allowed</li>
            <li>✅ RMS actions still work</li>
            <li>✅ Admin settlement allowed</li>
          </ul>
        </div>
      </div>

      {/* Last Updated */}
      {marketState?.lastUpdatedAt && (
        <div className="mt-6 text-sm text-gray-500">
          Last updated: {new Date(marketState.lastUpdatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

// All Trades (Super Admin only)
const AllTrades = () => {
  const { admin } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      const url = filter 
        ? `/api/trade/admin/trades?status=${filter}`
        : '/api/trade/admin/trades';
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setTrades(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceClose = async (tradeId, currentPrice) => {
    const exitPrice = prompt('Enter exit price:', currentPrice);
    if (!exitPrice) return;
    
    try {
      await axios.post(`/api/trade/admin/trade/${tradeId}/close`, {
        exitPrice: Number(exitPrice)
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchTrades();
    } catch (error) {
      alert(error.response?.data?.message || 'Error closing trade');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">All Trades</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('')} className={`px-4 py-2 rounded ${!filter ? 'bg-yellow-600' : 'bg-dark-700'}`}>All</button>
        <button onClick={() => setFilter('OPEN')} className={`px-4 py-2 rounded ${filter === 'OPEN' ? 'bg-green-600' : 'bg-dark-700'}`}>Open</button>
        <button onClick={() => setFilter('CLOSED')} className={`px-4 py-2 rounded ${filter === 'CLOSED' ? 'bg-red-600' : 'bg-dark-700'}`}>Closed</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Trades</div>
          <div className="text-2xl font-bold">{trades.length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Open</div>
          <div className="text-2xl font-bold text-green-400">{trades.filter(t => t.status === 'OPEN').length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total P&L</div>
          <div className={`text-2xl font-bold ${trades.reduce((s, t) => s + (t.netPnL || t.unrealizedPnL || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ₹{trades.reduce((s, t) => s + (t.netPnL || t.unrealizedPnL || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Brokerage</div>
          <div className="text-2xl font-bold text-purple-400">
            ₹{trades.reduce((s, t) => s + (t.charges?.brokerage || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No trades found</div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Trade ID</th>
                <th className="text-left px-4 py-3 text-gray-400">User</th>
                <th className="text-left px-4 py-3 text-gray-400">Symbol</th>
                <th className="text-left px-4 py-3 text-gray-400">Side</th>
                <th className="text-right px-4 py-3 text-gray-400">Qty</th>
                <th className="text-right px-4 py-3 text-gray-400">Entry</th>
                <th className="text-right px-4 py-3 text-gray-400">Exit/LTP</th>
                <th className="text-right px-4 py-3 text-gray-400">P&L</th>
                <th className="text-center px-4 py-3 text-gray-400">Status</th>
                <th className="text-center px-4 py-3 text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {trades.map(trade => (
                <tr key={trade._id} className="border-t border-dark-600">
                  <td className="px-4 py-3 font-mono text-xs">{trade.tradeId}</td>
                  <td className="px-4 py-3">
                    <div>{trade.user?.fullName || trade.user?.username}</div>
                    <div className="text-xs text-gray-500">{trade.adminCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-xs text-gray-500">{trade.segment} • {trade.productType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{trade.quantity}</td>
                  <td className="px-4 py-3 text-right">₹{trade.entryPrice?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">₹{(trade.exitPrice || trade.currentPrice || trade.entryPrice)?.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? '+' : ''}₹{(trade.netPnL || trade.unrealizedPnL || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${trade.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trade.status === 'OPEN' && (
                      <button
                        onClick={() => handleForceClose(trade._id, trade.currentPrice || trade.entryPrice)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Admin Trades (Admin only - shows trades for their users)
const AdminTrades = () => {
  const { admin } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      const url = filter 
        ? `/api/trade/admin/trades?status=${filter}`
        : '/api/trade/admin/trades';
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setTrades(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceClose = async (tradeId, currentPrice) => {
    const exitPrice = prompt('Enter exit price:', currentPrice);
    if (!exitPrice) return;
    
    try {
      await axios.post(`/api/trade/admin/trade/${tradeId}/close`, {
        exitPrice: Number(exitPrice)
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchTrades();
    } catch (error) {
      alert(error.response?.data?.message || 'Error closing trade');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Trade Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          <span>Create Trade</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-4 py-2 rounded ${!filter ? 'bg-purple-600' : 'bg-dark-700'}`}>All</button>
        <button onClick={() => setFilter('OPEN')} className={`px-4 py-2 rounded ${filter === 'OPEN' ? 'bg-green-600' : 'bg-dark-700'}`}>Open</button>
        <button onClick={() => setFilter('CLOSED')} className={`px-4 py-2 rounded ${filter === 'CLOSED' ? 'bg-red-600' : 'bg-dark-700'}`}>Closed</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Trades</div>
          <div className="text-2xl font-bold">{trades.length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Open</div>
          <div className="text-2xl font-bold text-green-400">{trades.filter(t => t.status === 'OPEN').length}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total P&L</div>
          <div className={`text-2xl font-bold ${trades.reduce((s, t) => s + (t.netPnL || t.unrealizedPnL || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ₹{trades.reduce((s, t) => s + (t.netPnL || t.unrealizedPnL || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Brokerage</div>
          <div className="text-2xl font-bold text-purple-400">
            ₹{trades.reduce((s, t) => s + (t.charges?.brokerage || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No trades found</div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {trades.map(trade => (
              <div key={trade._id} className="bg-dark-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">{trade.symbol}</div>
                    <div className="text-xs text-gray-400">{trade.segment} • {trade.productType}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${trade.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {trade.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  User: {trade.user?.fullName || trade.user?.username}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.side}
                    </span>
                    <span className="ml-2 text-sm">Qty: {trade.quantity}</span>
                  </div>
                  <div className={`font-bold ${(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? '+' : ''}₹{(trade.netPnL || trade.unrealizedPnL || 0).toFixed(2)}
                  </div>
                </div>
                {trade.status === 'OPEN' && (
                  <button
                    onClick={() => handleForceClose(trade._id, trade.currentPrice || trade.entryPrice)}
                    className="w-full mt-3 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    Force Close
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-dark-800 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-700">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400">Trade ID</th>
                  <th className="text-left px-4 py-3 text-gray-400">User</th>
                  <th className="text-left px-4 py-3 text-gray-400">Symbol</th>
                  <th className="text-left px-4 py-3 text-gray-400">Side</th>
                  <th className="text-right px-4 py-3 text-gray-400">Qty</th>
                  <th className="text-right px-4 py-3 text-gray-400">Entry</th>
                  <th className="text-right px-4 py-3 text-gray-400">Exit/LTP</th>
                  <th className="text-right px-4 py-3 text-gray-400">P&L</th>
                  <th className="text-center px-4 py-3 text-gray-400">Status</th>
                  <th className="text-center px-4 py-3 text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade._id} className="border-t border-dark-600">
                    <td className="px-4 py-3 font-mono text-xs">{trade.tradeId}</td>
                    <td className="px-4 py-3">
                      <div>{trade.user?.fullName || trade.user?.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{trade.symbol}</div>
                      <div className="text-xs text-gray-500">{trade.segment} • {trade.productType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{trade.quantity}</td>
                    <td className="px-4 py-3 text-right">₹{trade.entryPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">₹{(trade.exitPrice || trade.currentPrice || trade.entryPrice)?.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(trade.netPnL || trade.unrealizedPnL || 0) >= 0 ? '+' : ''}₹{(trade.netPnL || trade.unrealizedPnL || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${trade.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {trade.status === 'OPEN' && (
                        <button
                          onClick={() => handleForceClose(trade._id, trade.currentPrice || trade.entryPrice)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Trade Modal */}
      {showCreateModal && (
        <CreateTradeModal
          token={admin.token}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchTrades(); }}
        />
      )}
    </div>
  );
};

// Create Trade Modal - Admin can place trades for users
const CreateTradeModal = ({ token, onClose, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchInstrument, setSearchInstrument] = useState('');
  const [formData, setFormData] = useState({
    userId: '',
    userName: '',
    symbol: '',
    instrumentToken: '',
    segment: 'NSE',
    side: 'BUY',
    productType: 'INTRADAY',
    quantity: 1,
    entryPrice: '',
    tradeDate: new Date().toISOString().split('T')[0],
    tradeTime: new Date().toTimeString().slice(0, 5)
  });

  useEffect(() => {
    fetchUsers();
    fetchInstruments();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchInstruments = async () => {
    try {
      const { data } = await axios.get('/api/instruments?status=ACTIVE&limit=500', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstruments(data.instruments || data || []);
    } catch (err) {
      console.error('Error fetching instruments:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.userId?.toLowerCase().includes(searchUser.toLowerCase())
  ).slice(0, 10);

  const filteredInstruments = instruments.filter(i =>
    i.tradingsymbol?.toLowerCase().includes(searchInstrument.toLowerCase()) ||
    i.name?.toLowerCase().includes(searchInstrument.toLowerCase())
  ).slice(0, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userId) return setError('Please select a user');
    if (!formData.symbol) return setError('Please select an instrument');
    if (!formData.entryPrice || Number(formData.entryPrice) <= 0) return setError('Please enter valid entry price');
    if (!formData.quantity || Number(formData.quantity) <= 0) return setError('Please enter valid quantity');

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/trade/admin/create-trade', {
        userId: formData.userId,
        symbol: formData.symbol,
        instrumentToken: formData.instrumentToken,
        segment: formData.segment,
        side: formData.side,
        productType: formData.productType,
        quantity: Number(formData.quantity),
        entryPrice: Number(formData.entryPrice),
        tradeDate: formData.tradeDate,
        tradeTime: formData.tradeTime
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-800 p-4 border-b border-dark-600 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Trade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded">{error}</div>}

          {/* User Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select User *</label>
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 mb-2"
            />
            {searchUser && filteredUsers.length > 0 && !formData.userId && (
              <div className="bg-dark-700 border border-dark-600 rounded max-h-40 overflow-y-auto">
                {filteredUsers.map(u => (
                  <div
                    key={u._id}
                    onClick={() => {
                      setFormData({ ...formData, userId: u._id, userName: u.fullName || u.username });
                      setSearchUser(u.fullName || u.username);
                    }}
                    className="px-3 py-2 hover:bg-dark-600 cursor-pointer"
                  >
                    <div className="font-medium">{u.fullName || u.username}</div>
                    <div className="text-xs text-gray-400">@{u.username} • {u.userId}</div>
                  </div>
                ))}
              </div>
            )}
            {formData.userId && (
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                <span className="text-green-400">{formData.userName}</span>
                <button type="button" onClick={() => { setFormData({ ...formData, userId: '', userName: '' }); setSearchUser(''); }} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Instrument Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select Instrument *</label>
            <input
              type="text"
              placeholder="Search instruments..."
              value={searchInstrument}
              onChange={(e) => setSearchInstrument(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 mb-2"
            />
            {searchInstrument && filteredInstruments.length > 0 && !formData.symbol && (
              <div className="bg-dark-700 border border-dark-600 rounded max-h-40 overflow-y-auto">
                {filteredInstruments.map(i => (
                  <div
                    key={i._id || i.instrument_token}
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        symbol: i.tradingsymbol, 
                        instrumentToken: i.instrument_token,
                        segment: i.segment || i.exchange || 'NSE'
                      });
                      setSearchInstrument(i.tradingsymbol);
                    }}
                    className="px-3 py-2 hover:bg-dark-600 cursor-pointer"
                  >
                    <div className="font-medium">{i.tradingsymbol}</div>
                    <div className="text-xs text-gray-400">{i.name} • {i.segment || i.exchange}</div>
                  </div>
                ))}
              </div>
            )}
            {formData.symbol && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2">
                <span className="text-blue-400">{formData.symbol} ({formData.segment})</span>
                <button type="button" onClick={() => { setFormData({ ...formData, symbol: '', instrumentToken: '' }); setSearchInstrument(''); }} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Side & Product Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Side *</label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Product Type *</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              >
                <option value="INTRADAY">INTRADAY</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="CARRYFORWARD">CARRYFORWARD</option>
              </select>
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Trade Date</label>
              <input
                type="date"
                value={formData.tradeDate}
                onChange={(e) => setFormData({ ...formData, tradeDate: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Trade Time</label>
              <input
                type="time"
                value={formData.tradeTime}
                onChange={(e) => setFormData({ ...formData, tradeTime: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-dark-600 hover:bg-dark-500 py-2 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// All Transactions (Super Admin only)
const AllTransactions = () => {
  const { admin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const url = filter 
        ? `/api/admin/manage/all-transactions?ownerType=${filter}&limit=200`
        : '/api/admin/manage/all-transactions?limit=200';
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setTransactions(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">All Transactions</h1>
      
      <div className="flex gap-2 mb-6">
        <button onClick={() => setFilter('')} className={`px-4 py-2 rounded ${!filter ? 'bg-yellow-600' : 'bg-dark-700'}`}>All</button>
        <button onClick={() => setFilter('ADMIN')} className={`px-4 py-2 rounded ${filter === 'ADMIN' ? 'bg-yellow-600' : 'bg-dark-700'}`}>Admin</button>
        <button onClick={() => setFilter('USER')} className={`px-4 py-2 rounded ${filter === 'USER' ? 'bg-yellow-600' : 'bg-dark-700'}`}>User</button>
      </div>

      {loading ? (
        <div className="text-center py-8"><RefreshCw className="animate-spin inline" /></div>
      ) : (
        <div className="bg-dark-800 rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Date</th>
                <th className="text-left px-4 py-3 text-gray-400">Owner</th>
                <th className="text-left px-4 py-3 text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-gray-400">Reason</th>
                <th className="text-right px-4 py-3 text-gray-400">Amount</th>
                <th className="text-right px-4 py-3 text-gray-400">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx._id} className="border-t border-dark-600">
                  <td className="px-4 py-3">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${tx.ownerType === 'ADMIN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {tx.ownerType}
                    </span>
                    <span className="ml-2 text-gray-400">{tx.adminCode || ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${tx.type === 'CREDIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{tx.reason}</td>
                  <td className={`px-4 py-3 text-right ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">₹{tx.balanceAfter?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Lot Management (Super Admin only)
const LotManagement = () => {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [lotSettings, setLotSettings] = useState({
    niftyMaxLotIntraday: 100,
    niftyMaxLotCarryForward: 50,
    niftyLotSize: 25,
    bankniftyMaxLotIntraday: 100,
    bankniftyMaxLotCarryForward: 50,
    bankniftyLotSize: 15,
    finniftyMaxLotIntraday: 100,
    finniftyMaxLotCarryForward: 50,
    finniftyLotSize: 25,
    midcpniftyMaxLotIntraday: 100,
    midcpniftyMaxLotCarryForward: 50,
    midcpniftyLotSize: 50,
    equityMaxQtyIntraday: 10000,
    equityMaxQtyDelivery: 5000,
    maxOpenPositions: 20,
    maxDailyTrades: 100
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      fetchAdminLotSettings(selectedAdmin);
    }
  }, [selectedAdmin]);

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/admins', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAdmins(data);
      if (data.length > 0) {
        setSelectedAdmin(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLotSettings = async (adminId) => {
    try {
      const { data } = await axios.get(`/api/admin/manage/admins/${adminId}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      if (data.lotSettings) {
        setLotSettings(data.lotSettings);
      }
    } catch (error) {
      console.error('Error fetching lot settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`/api/admin/manage/admins/${selectedAdmin}/lot-settings`, 
        { 
          lotSettings,
          enabledLeverages: lotSettings.enabledLeverages,
          allowTradingOutsideMarketHours: lotSettings.allowTradingOutsideMarketHours,
          marginCallPercentage: lotSettings.marginCallPercentage
        },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      setMessage({ type: 'success', text: 'All settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setLotSettings(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const segments = [
    { 
      name: 'NIFTY', 
      color: 'blue',
      fields: [
        { key: 'niftyLotSize', label: 'Lot Size', desc: 'Qty per lot' },
        { key: 'niftyMaxLotIntraday', label: 'Max Lot (Intraday)', desc: 'MIS orders' },
        { key: 'niftyMaxLotCarryForward', label: 'Max Lot (Carry Forward)', desc: 'NRML orders' }
      ]
    },
    { 
      name: 'BANKNIFTY', 
      color: 'purple',
      fields: [
        { key: 'bankniftyLotSize', label: 'Lot Size', desc: 'Qty per lot' },
        { key: 'bankniftyMaxLotIntraday', label: 'Max Lot (Intraday)', desc: 'MIS orders' },
        { key: 'bankniftyMaxLotCarryForward', label: 'Max Lot (Carry Forward)', desc: 'NRML orders' }
      ]
    },
    { 
      name: 'FINNIFTY', 
      color: 'green',
      fields: [
        { key: 'finniftyLotSize', label: 'Lot Size', desc: 'Qty per lot' },
        { key: 'finniftyMaxLotIntraday', label: 'Max Lot (Intraday)', desc: 'MIS orders' },
        { key: 'finniftyMaxLotCarryForward', label: 'Max Lot (Carry Forward)', desc: 'NRML orders' }
      ]
    },
    { 
      name: 'MIDCPNIFTY', 
      color: 'yellow',
      fields: [
        { key: 'midcpniftyLotSize', label: 'Lot Size', desc: 'Qty per lot' },
        { key: 'midcpniftyMaxLotIntraday', label: 'Max Lot (Intraday)', desc: 'MIS orders' },
        { key: 'midcpniftyMaxLotCarryForward', label: 'Max Lot (Carry Forward)', desc: 'NRML orders' }
      ]
    }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lot Management</h1>
          <p className="text-gray-400 text-sm mt-1">Configure max lot limits for each admin's users</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Admin Selector */}
      <div className="bg-dark-800 rounded-lg p-4 mb-6">
        <label className="block text-sm text-gray-400 mb-2">Select Admin</label>
        <select
          value={selectedAdmin || ''}
          onChange={(e) => setSelectedAdmin(e.target.value)}
          className="w-full md:w-64 bg-dark-700 border border-dark-600 rounded px-3 py-2"
        >
          {admins.map(a => (
            <option key={a._id} value={a._id}>{a.username} ({a.adminCode})</option>
          ))}
        </select>
      </div>

      {/* F&O Segments */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {segments.map(segment => (
          <div key={segment.name} className="bg-dark-800 rounded-lg p-4">
            <h3 className={`text-lg font-semibold mb-4 text-${segment.color}-400`}>{segment.name}</h3>
            <div className="space-y-4">
              {segment.fields.map(field => (
                <div key={field.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{field.label}</div>
                    <div className="text-xs text-gray-500">{field.desc}</div>
                  </div>
                  <input
                    type="number"
                    value={lotSettings[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-24 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Equity & Global Settings */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-orange-400">Equity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Max Qty (Intraday)</div>
                <div className="text-xs text-gray-500">MIS orders</div>
              </div>
              <input
                type="number"
                value={lotSettings.equityMaxQtyIntraday}
                onChange={(e) => handleChange('equityMaxQtyIntraday', e.target.value)}
                className="w-24 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Max Qty (Delivery)</div>
                <div className="text-xs text-gray-500">CNC orders</div>
              </div>
              <input
                type="number"
                value={lotSettings.equityMaxQtyDelivery}
                onChange={(e) => handleChange('equityMaxQtyDelivery', e.target.value)}
                className="w-24 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
              />
            </div>
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-400">Global Limits</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Max Open Positions</div>
                <div className="text-xs text-gray-500">Per user</div>
              </div>
              <input
                type="number"
                value={lotSettings.maxOpenPositions}
                onChange={(e) => handleChange('maxOpenPositions', e.target.value)}
                className="w-24 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Max Daily Trades</div>
                <div className="text-xs text-gray-500">Per user</div>
              </div>
              <input
                type="number"
                value={lotSettings.maxDailyTrades}
                onChange={(e) => handleChange('maxDailyTrades', e.target.value)}
                className="w-24 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leverage Settings */}
      <div className="mt-6 bg-dark-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-purple-400">Leverage Settings</h3>
        <p className="text-sm text-gray-400 mb-4">Select which leverage options to enable for users. Higher leverage = higher risk.</p>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 5, 10, 20, 50, 100, 200, 500, 800, 1000, 1500, 2000].map(lev => {
            const isEnabled = lotSettings.enabledLeverages?.includes(lev);
            return (
              <button
                key={lev}
                onClick={() => {
                  const current = lotSettings.enabledLeverages || [1, 2, 5, 10];
                  const updated = isEnabled 
                    ? current.filter(l => l !== lev)
                    : [...current, lev].sort((a, b) => a - b);
                  setLotSettings(prev => ({ ...prev, enabledLeverages: updated }));
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isEnabled 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
              >
                {lev}x
              </button>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Enabled: {(lotSettings.enabledLeverages || [1, 2, 5, 10]).join('x, ')}x
        </div>
      </div>

      {/* Trading Settings */}
      <div className="mt-6 bg-dark-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-cyan-400">Trading Settings</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Allow Trading Outside Market Hours</div>
              <div className="text-xs text-gray-500">For LIMIT orders only</div>
            </div>
            <button
              onClick={() => setLotSettings(prev => ({ 
                ...prev, 
                allowTradingOutsideMarketHours: !prev.allowTradingOutsideMarketHours 
              }))}
              className={`w-12 h-6 rounded-full transition ${
                lotSettings.allowTradingOutsideMarketHours ? 'bg-green-600' : 'bg-dark-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition transform ${
                lotSettings.allowTradingOutsideMarketHours ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Margin Call %</div>
              <div className="text-xs text-gray-500">Auto-close when loss reaches this %</div>
            </div>
            <input
              type="number"
              value={lotSettings.marginCallPercentage || 100}
              onChange={(e) => setLotSettings(prev => ({ ...prev, marginCallPercentage: parseInt(e.target.value) || 100 }))}
              className="w-20 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-right"
            />
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h4 className="font-medium text-blue-400 mb-2">How Settings Work</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• <strong>Leverage</strong>: Higher leverage = more buying power but higher risk</li>
          <li>• <strong>Margin Call</strong>: Trades auto-close when loss reaches wallet balance</li>
          <li>• <strong>Intraday (MIS)</strong>: Orders that must be squared off same day</li>
          <li>• <strong>Carry Forward (NRML)</strong>: Orders that can be held till expiry</li>
        </ul>
      </div>
    </div>
  );
};

// Charge Management - Spread and Commission with multiple charge types
const ChargeManagement = () => {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [chargeSettings, setChargeSettings] = useState({
    spread: 0,
    commissionType: 'PER_LOT',
    perLotCharge: 0,
    perTradeCharge: 0,
    perCroreCharge: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchChargeSettings();
  }, []);

  const fetchChargeSettings = async () => {
    try {
      const { data } = await axios.get('/api/trading/admin/charge-settings', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      if (data) {
        setChargeSettings({
          spread: data.spread || 0,
          commissionType: data.commissionType || 'PER_LOT',
          perLotCharge: data.perLotCharge || data.commission || 0,
          perTradeCharge: data.perTradeCharge || 0,
          perCroreCharge: data.perCroreCharge || 0
        });
      }
    } catch (error) {
      console.error('Error fetching charge settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.post('/api/trading/admin/charge-settings', chargeSettings, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setMessage({ type: 'success', text: 'Charge settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Charge Management</h1>
          <p className="text-sm text-gray-400 mt-1">Configure spread and commission for trades</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Charge Settings */}
      <div className="bg-dark-800 rounded-lg p-6 max-w-3xl">
        <div className="space-y-6">
          {/* Spread */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Spread (Points)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Spread is added to buy price and subtracted from sell price. This is the difference between bid and ask price.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                step="0.01"
                min="0"
                value={chargeSettings.spread}
                onChange={(e) => setChargeSettings({ ...chargeSettings, spread: parseFloat(e.target.value) || 0 })}
                className="w-48 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-green-500"
              />
              <span className="text-gray-400">points per trade</span>
            </div>
          </div>

          {/* Commission Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Commission Type
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select how commission should be calculated for trades.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'PER_LOT', label: 'Per Lot', desc: 'Charge per lot traded' },
                { value: 'PER_TRADE', label: 'Per Trade', desc: 'Fixed charge per trade' },
                { value: 'PER_CRORE', label: 'Per Crore', desc: 'Charge per ₹1 Cr turnover' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setChargeSettings({ ...chargeSettings, commissionType: type.value })}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    chargeSettings.commissionType === type.value
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className="font-semibold text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Per Lot Charge */}
          {chargeSettings.commissionType === 'PER_LOT' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Per Lot Charge (₹)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargeSettings.perLotCharge}
                  onChange={(e) => setChargeSettings({ ...chargeSettings, perLotCharge: parseFloat(e.target.value) || 0 })}
                  className="w-48 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-green-500"
                />
                <span className="text-gray-400">₹ per lot</span>
              </div>
              <div className="mt-2 text-sm text-yellow-400">
                Example: If charge is ₹20 and user trades 5 lots, total = ₹100
              </div>
            </div>
          )}

          {/* Per Trade Charge */}
          {chargeSettings.commissionType === 'PER_TRADE' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Per Trade Charge (₹)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargeSettings.perTradeCharge}
                  onChange={(e) => setChargeSettings({ ...chargeSettings, perTradeCharge: parseFloat(e.target.value) || 0 })}
                  className="w-48 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-green-500"
                />
                <span className="text-gray-400">₹ per trade</span>
              </div>
              <div className="mt-2 text-sm text-yellow-400">
                Fixed charge applied to each trade regardless of quantity
              </div>
            </div>
          )}

          {/* Per Crore Charge */}
          {chargeSettings.commissionType === 'PER_CRORE' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Per Crore Charge (₹)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargeSettings.perCroreCharge}
                  onChange={(e) => setChargeSettings({ ...chargeSettings, perCroreCharge: parseFloat(e.target.value) || 0 })}
                  className="w-48 bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-green-500"
                />
                <span className="text-gray-400">₹ per crore turnover</span>
              </div>
              <div className="mt-2 text-sm text-yellow-400">
                Example: If charge is ₹500/Cr and trade value is ₹50 Lakhs, commission = ₹250
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="mt-8 bg-dark-700 rounded-lg p-4">
          <h3 className="font-medium mb-3 text-gray-300">Trade Charge Preview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-dark-600 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Spread</div>
              <div className="text-xl font-bold text-blue-400">{chargeSettings.spread} pts</div>
            </div>
            <div className="bg-dark-600 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Commission ({chargeSettings.commissionType.replace('_', ' ')})</div>
              <div className="text-xl font-bold text-purple-400">
                ₹{chargeSettings.commissionType === 'PER_LOT' ? chargeSettings.perLotCharge : 
                   chargeSettings.commissionType === 'PER_TRADE' ? chargeSettings.perTradeCharge :
                   chargeSettings.perCroreCharge}
                {chargeSettings.commissionType === 'PER_LOT' ? '/lot' : 
                 chargeSettings.commissionType === 'PER_TRADE' ? '/trade' : '/Cr'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 max-w-3xl">
        <h4 className="font-medium text-blue-400 mb-2">How Charges Work</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• <strong>Spread</strong>: Added to buy price, subtracted from sell price (affects entry/exit price)</li>
          <li>• <strong>Per Lot</strong>: Commission = Charge × Number of Lots</li>
          <li>• <strong>Per Trade</strong>: Fixed commission per trade regardless of size</li>
          <li>• <strong>Per Crore</strong>: Commission = (Trade Value ÷ 1,00,00,000) × Charge</li>
        </ul>
      </div>
    </div>
  );
};

// Profile & Password Settings
const ProfileSettings = () => {
  const { admin, setAdmin } = useAuth();
  const [profileData, setProfileData] = useState({ name: admin?.name || '', email: admin?.email || '', phone: admin?.phone || '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [brandingData, setBrandingData] = useState({ brandName: admin?.branding?.brandName || '', logoUrl: admin?.branding?.logoUrl || '', welcomeTitle: admin?.branding?.welcomeTitle || '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPasswords, setShowPasswords] = useState(false);

  const handleBrandingUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await axios.put('/api/admin/manage/branding', brandingData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAdmin({ ...admin, branding: data.branding });
      setMessage({ type: 'success', text: 'Branding updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating branding' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await axios.put('/api/admin/manage/update-profile', profileData, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAdmin({ ...admin, ...data });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error updating profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put('/api/admin/manage/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error changing password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Profile & Password</h1>

      {message.text && (
        <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Update */}
        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Update Profile</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={profileData.phone}
                onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded">
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded">
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Branding Settings - Only for ADMIN role */}
      {admin?.role === 'ADMIN' && (
        <div className="mt-6 bg-dark-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Branding Settings</h2>
          <p className="text-gray-400 text-sm mb-4">
            Customize your login page branding. Users who register via your referral link will see this branding.
          </p>
          <form onSubmit={handleBrandingUpdate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Brand Name</label>
              <input
                type="text"
                value={brandingData.brandName}
                onChange={e => setBrandingData({ ...brandingData, brandName: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2"
                placeholder="Your Brand Name (e.g., FKG)"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Welcome Title</label>
              <input
                type="text"
                value={brandingData.welcomeTitle}
                onChange={e => setBrandingData({ ...brandingData, welcomeTitle: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-lg"
                placeholder="Welcome to FKG Trading"
              />
              <p className="text-xs text-gray-500 mt-1">This title will be displayed prominently on the login page</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Logo</label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 bg-dark-700 border border-dark-600 border-dashed rounded px-4 py-3 hover:border-green-500 transition">
                      <Plus size={18} className="text-gray-400" />
                      <span className="text-gray-400">Upload Logo</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          setMessage({ type: 'error', text: 'File size must be less than 5MB' });
                          return;
                        }
                        setLoading(true);
                        setMessage({ type: '', text: '' });
                        try {
                          const formData = new FormData();
                          formData.append('logo', file);
                          const { data } = await axios.post('/api/upload/logo', formData, {
                            headers: { 
                              Authorization: `Bearer ${admin.token}`,
                              'Content-Type': 'multipart/form-data'
                            }
                          });
                          setBrandingData({ ...brandingData, logoUrl: data.logoUrl });
                          setAdmin({ ...admin, branding: data.branding });
                          setMessage({ type: 'success', text: 'Logo uploaded successfully' });
                        } catch (error) {
                          setMessage({ type: 'error', text: error.response?.data?.message || 'Error uploading logo' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                  </label>
                  {brandingData.logoUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await axios.delete('/api/upload/logo', {
                            headers: { Authorization: `Bearer ${admin.token}` }
                          });
                          setBrandingData({ ...brandingData, logoUrl: '' });
                          setAdmin({ ...admin, branding: { ...admin.branding, logoUrl: '' } });
                          setMessage({ type: 'success', text: 'Logo removed' });
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Error removing logo' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="px-3 py-3 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">Supported: JPEG, PNG, GIF, SVG, WebP (max 5MB)</p>
              </div>
            </div>
            {brandingData.logoUrl && (
              <div className="p-3 bg-dark-700 rounded">
                <p className="text-sm text-gray-400 mb-2">Preview:</p>
                <img src={brandingData.logoUrl} alt="Logo Preview" className="h-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}
            <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded">
              {loading ? 'Saving...' : 'Update Branding'}
            </button>
          </form>
          {admin?.referralUrl && (
            <div className="mt-4 p-3 bg-dark-700 rounded">
              <p className="text-sm text-gray-400 mb-1">Your Referral Link:</p>
              <code className="text-green-400 text-sm break-all">{admin.referralUrl}</code>
            </div>
          )}
        </div>
      )}

      {/* Account Info */}
      <div className="mt-6 bg-dark-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-dark-700 rounded">
            <div className="text-gray-400">Role</div>
            <div className={admin?.role === 'SUPER_ADMIN' ? 'text-yellow-400 font-bold' : 'text-purple-400 font-bold'}>{admin?.role}</div>
          </div>
          <div className="p-3 bg-dark-700 rounded">
            <div className="text-gray-400">Username</div>
            <div>{admin?.username}</div>
          </div>
          {admin?.adminCode && (
            <div className="p-3 bg-dark-700 rounded">
              <div className="text-gray-400">Admin Code</div>
              <div className="font-mono text-purple-400">{admin?.adminCode}</div>
            </div>
          )}
          <div className="p-3 bg-dark-700 rounded">
            <div className="text-gray-400">Status</div>
            <div className="text-green-400">{admin?.status || 'ACTIVE'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// All Users Management (Super Admin only) - View all users and transfer between admins
const AllUsersManagement = () => {
  const { admin } = useAuth();
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetAdminId, setTargetAdminId] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchAllUsers();
    fetchAdmins();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/all-users', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await axios.get('/api/admin/manage/admins', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setAdmins(data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !targetAdminId) return;
    
    setTransferring(true);
    try {
      await axios.post(`/api/admin/manage/users/${selectedUser._id}/transfer`, 
        { targetAdminId },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      alert('User transferred successfully!');
      setShowTransferModal(false);
      setSelectedUser(null);
      setTargetAdminId('');
      fetchAllUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error transferring user');
    } finally {
      setTransferring(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(filter.toLowerCase()) ||
    u.email?.toLowerCase().includes(filter.toLowerCase()) ||
    u.fullName?.toLowerCase().includes(filter.toLowerCase()) ||
    u.adminCode?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">All Users</h1>
        <div className="text-sm text-gray-400">
          Total: {users.length} users
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by username, email, name, or admin code..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full md:w-96 bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white"
        />
      </div>

      {/* Users Table */}
      <div className="bg-dark-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm">User</th>
                <th className="px-4 py-3 text-left text-sm">Admin</th>
                <th className="px-4 py-3 text-left text-sm">Wallet</th>
                <th className="px-4 py-3 text-left text-sm">Status</th>
                <th className="px-4 py-3 text-left text-sm">Joined</th>
                <th className="px-4 py-3 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredUsers.map(user => (
                <tr key={user._id} className="hover:bg-dark-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.fullName || user.username}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium">{user.admin?.name || 'N/A'}</div>
                      <div className="text-gray-400">{user.adminCode}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400">₹{(user.wallet?.balance || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowTransferModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Transfer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Transfer User</h2>
            
            <div className="mb-4 p-3 bg-dark-700 rounded-lg">
              <div className="text-sm text-gray-400">User</div>
              <div className="font-medium">{selectedUser.fullName || selectedUser.username}</div>
              <div className="text-sm text-gray-400">{selectedUser.email}</div>
              <div className="text-sm text-gray-400 mt-1">Current Admin: {selectedUser.adminCode}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Transfer to Admin</label>
              <select
                value={targetAdminId}
                onChange={(e) => setTargetAdminId(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="">Select Admin</option>
                {admins.filter(a => a.adminCode !== selectedUser.adminCode).map(a => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.adminCode}) - {a.stats?.totalUsers || 0} users
                  </option>
                ))}
                {/* Also include Super Admin option */}
                <option value={admin._id}>
                  Super Admin ({admin.adminCode})
                </option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedUser(null);
                  setTargetAdminId('');
                }}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!targetAdminId || transferring}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg"
              >
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserManagement = () => {
  const { admin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${admin.token}` }
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl md:text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          <span>Create User</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="animate-spin inline mr-2" size={20} />
            Loading...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No users found</div>
        ) : (
          filteredUsers.map(user => (
            <div key={user._id} className="bg-dark-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium">{user.fullName || user.username}</div>
                  <div className="text-sm text-gray-400">@{user.username}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-sm text-gray-400 mb-1">{user.email}</div>
              <div className="text-sm text-gray-400 mb-3">{user.phone || 'No phone'}</div>
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-bold">₹{user.wallet?.balance?.toLocaleString() || '0'}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedUser(user); setShowEditModal(true); }} className="p-2 bg-dark-700 rounded text-blue-400"><Edit size={16} /></button>
                  <button onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }} className="p-2 bg-dark-700 rounded text-yellow-400"><Key size={16} /></button>
                  <button onClick={() => { setSelectedUser(user); setShowWalletModal(true); }} className="p-2 bg-dark-700 rounded text-green-400"><Wallet size={16} /></button>
                  <button onClick={() => handleDelete(user._id)} className="p-2 bg-dark-700 rounded text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-dark-800 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-700">
            <tr>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Phone</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Balance</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-400">
                  <RefreshCw className="animate-spin inline mr-2" size={20} />
                  Loading...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user._id} className="border-t border-dark-600 hover:bg-dark-700">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.fullName || user.username}</div>
                      <div className="text-sm text-gray-400">@{user.username}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 text-gray-300">{user.phone || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-400 font-medium">
                      ₹{user.wallet?.balance?.toLocaleString() || '0'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.isActive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                        className="p-2 hover:bg-dark-600 rounded transition text-blue-400"
                        title="Edit User"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                        className="p-2 hover:bg-dark-600 rounded transition text-yellow-400"
                        title="Change Password"
                      >
                        <Key size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
                        className="p-2 hover:bg-dark-600 rounded transition text-green-400"
                        title="Manage Wallet"
                      >
                        <Wallet size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="p-2 hover:bg-dark-600 rounded transition text-red-400"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => { setShowCreateModal(false); fetchUsers(); }}
          token={admin.token}
        />
      )}
      {showEditModal && selectedUser && (
        <EditUserModal 
          user={selectedUser}
          onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedUser(null); fetchUsers(); }}
          token={admin.token}
        />
      )}
      {showPasswordModal && selectedUser && (
        <PasswordModal 
          user={selectedUser}
          onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }}
          token={admin.token}
        />
      )}
      {showWalletModal && selectedUser && (
        <WalletModal 
          user={selectedUser}
          onClose={() => { setShowWalletModal(false); setSelectedUser(null); }}
          onSuccess={() => { fetchUsers(); }}
          token={admin.token}
        />
      )}
    </div>
  );
};

const CreateUserModal = ({ onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', fullName: '', phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/users', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Create New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 pr-10 focus:outline-none focus:border-green-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-dark-600 hover:bg-dark-500 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditUserModal = ({ user, onClose, onSuccess, token }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    fullName: user.fullName || '',
    phone: user.phone || '',
    isActive: user.isActive
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.put(`/api/admin/users/${user._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm text-gray-400">Active Account</label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-dark-600 hover:bg-dark-500 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PasswordModal = ({ user, onClose, token }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.put(`/api/admin/users/${user._id}/password`, { newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Change Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-400 mb-4">
          Changing password for: <span className="text-white">{user.username}</span>
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded mb-4">
            Password changed successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 pr-10 focus:outline-none focus:border-green-500"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-dark-600 hover:bg-dark-500 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded transition disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WalletModal = ({ user, onClose, onSuccess, token }) => {
  const { admin, updateAdmin } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletData, setWalletData] = useState(null);
  const [adminBalance, setAdminBalance] = useState(admin?.wallet?.balance || 0);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const { data } = await axios.get(`/api/admin/manage/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletData(data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };

  const handleTransaction = async (type) => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Use the correct API that handles admin wallet deduction/credit
      const endpoint = type === 'deposit' 
        ? `/api/admin/manage/users/${user._id}/add-funds`
        : `/api/admin/manage/users/${user._id}/deduct-funds`;
      
      const { data } = await axios.post(endpoint, 
        { amount: Number(amount), description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAmount('');
      setDescription('');
      fetchWallet();
      onSuccess();
      
      // Update admin balance display and context if available
      if (data.adminWallet) {
        setAdminBalance(data.adminWallet.balance);
        // Update admin context so balance is reflected across the app
        updateAdmin({ wallet: data.adminWallet });
      }
    } catch (err) {
      setError(err.response?.data?.message || `Error ${type}ing funds`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Admin Wallet Info */}
        {admin?.role === 'ADMIN' && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-400">Your Wallet Balance</span>
              <span className="text-lg font-bold text-purple-400">₹{adminBalance.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Funds will be deducted from your wallet when depositing to user</p>
          </div>
        )}

        {/* User Wallet Info */}
        <div className="bg-dark-700 rounded-lg p-4 mb-4">
          <p className="text-gray-400 text-sm">User: {user.fullName || user.username}</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            ₹{(walletData?.wallet?.cashBalance || walletData?.wallet?.balance || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-400">
            Cash Balance: ₹{(walletData?.wallet?.cashBalance || 0).toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              placeholder="Enter amount"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 focus:outline-none focus:border-green-500"
              placeholder="Transaction note"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleTransaction('deposit')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-2 rounded transition disabled:opacity-50"
          >
            <ArrowUpCircle size={18} />
            Deposit
          </button>
          <button
            onClick={() => handleTransaction('withdraw')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 py-2 rounded transition disabled:opacity-50"
          >
            <ArrowDownCircle size={18} />
            Withdraw
          </button>
        </div>

        {/* Transaction History */}
        {walletData?.wallet?.transactions?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Transactions</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {walletData.wallet.transactions.slice(-5).reverse().map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between bg-dark-700 rounded px-3 py-2 text-sm">
                  <div>
                    <span className={tx.type === 'deposit' || tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                      {tx.type.toUpperCase()}
                    </span>
                    <span className="text-gray-400 ml-2">{tx.description}</span>
                  </div>
                  <span className={tx.type === 'deposit' || tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                    {tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 bg-dark-600 hover:bg-dark-500 py-2 rounded transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
