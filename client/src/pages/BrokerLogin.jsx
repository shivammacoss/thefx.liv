import AdminLogin from './AdminLogin';

const BrokerLogin = () => {
  return <AdminLogin expectedRole="BROKER" basePath="/broker" panelLabel="Broker" />;
};

export default BrokerLogin;
