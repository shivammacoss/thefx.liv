import AdminLogin from './AdminLogin';

const SubBrokerLogin = () => {
  return <AdminLogin expectedRole="SUB_BROKER" basePath="/subbroker" panelLabel="Sub Broker" />;
};

export default SubBrokerLogin;
