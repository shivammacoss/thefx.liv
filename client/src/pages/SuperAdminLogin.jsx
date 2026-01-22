import AdminLogin from './AdminLogin';

const SuperAdminLogin = () => {
  return <AdminLogin expectedRole="SUPER_ADMIN" basePath="/superadmin" panelLabel="Super Admin" />;
};

export default SuperAdminLogin;
