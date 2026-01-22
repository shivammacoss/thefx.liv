import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import BrokerLogin from './pages/BrokerLogin';
import SubBrokerLogin from './pages/SubBrokerLogin';
import UserLogin from './pages/UserLogin';
import UserDashboardNew from './pages/UserDashboardNew';
import UserDashboard from './pages/UserDashboard';
import UserOrders from './pages/UserOrders';
import UserTransactions from './pages/UserTransactions';
import LandingPage from './pages/LandingPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: '#1a1a1a', minHeight: '100vh' }}>
          <h1>Something went wrong</h1>
          <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedAdminRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-dark-900">Loading...</div>;
  return admin ? children : <Navigate to="/admin/login" />;
};

const ProtectedRoleRoute = ({ children, allowedRoles, loginPath }) => {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-dark-900">Loading...</div>;

  if (!admin) return <Navigate to={loginPath} />;
  if (admin.role === 'SUPER_ADMIN') return children;

  return allowedRoles.includes(admin.role) ? children : <Navigate to={loginPath} />;
};

const ProtectedUserRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-dark-900">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/admin/login" element={<AdminLogin expectedRole="ADMIN" basePath="/admin" panelLabel="Admin" />} />
            <Route path="/broker/login" element={<BrokerLogin />} />
            <Route path="/subbroker/login" element={<SubBrokerLogin />} />

            <Route path="/superadmin/*" element={
              <ProtectedRoleRoute allowedRoles={['SUPER_ADMIN']} loginPath="/superadmin/login">
                <AdminDashboard basePath="/superadmin" />
              </ProtectedRoleRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoleRoute allowedRoles={['ADMIN']} loginPath="/admin/login">
                <AdminDashboard basePath="/admin" />
              </ProtectedRoleRoute>
            } />
            <Route path="/broker/*" element={
              <ProtectedRoleRoute allowedRoles={['BROKER']} loginPath="/broker/login">
                <AdminDashboard basePath="/broker" />
              </ProtectedRoleRoute>
            } />
            <Route path="/subbroker/*" element={
              <ProtectedRoleRoute allowedRoles={['SUB_BROKER']} loginPath="/subbroker/login">
                <AdminDashboard basePath="/subbroker" />
              </ProtectedRoleRoute>
            } />
            {/* Trader Room - Separate page without sidebar */}
            <Route path="/user/trader-room" element={
              <ProtectedUserRoute>
                <UserDashboard />
              </ProtectedUserRoute>
            } />
            {/* Orders Page - Full page orders history */}
            <Route path="/user/orders" element={
              <ProtectedUserRoute>
                <UserOrders />
              </ProtectedUserRoute>
            } />
            {/* Transactions Page - All wallet and fund transactions */}
            <Route path="/user/transactions" element={
              <ProtectedUserRoute>
                <UserTransactions />
              </ProtectedUserRoute>
            } />
            {/* User CRM Dashboard with sidebar */}
            <Route path="/user/*" element={
              <ProtectedUserRoute>
                <UserDashboardNew />
              </ProtectedUserRoute>
            } />
            <Route path="/dashboard" element={<Navigate to="/user/home" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/user/home" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
