import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Space, 
  Typography, 
  Tabs, 
  message
} from 'antd';
import { 
  WalletOutlined, 
  SettingOutlined,
  DisconnectOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useContract } from '../hooks/useContract';
import RegisterAgent from '../components/RegisterAgent';
import SetPaymentRules from '../components/SetPaymentRules';
import DirectPayment from '../components/DirectPayment';
import AgentList from '../components/AgentList';
import DepositFunds from '../components/DepositFunds';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { 
    walletState, 
    contractBalance, 
    disconnectWallet,
    refreshContractBalance,
    isLoading 
  } = useContract();

  const [activeTab, setActiveTab] = useState('overview');

  // 页面加载时刷新余额
  useEffect(() => {
    if (walletState.isConnected) {
      refreshContractBalance();
    }
  }, [walletState.isConnected, refreshContractBalance]);

  const handleRefreshBalance = async () => {
    await refreshContractBalance();
    message.success('余额已刷新');
  };

  const handleDisconnect = () => {
    disconnectWallet();
    message.info('已断开钱包连接');
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card className="stats-card">
              <Statistic
                title="合约余额"
                value={parseFloat(contractBalance)}
                precision={2}
                suffix="USDT"
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="stats-card">
              <Statistic
                title="网络"
                value="Injective EVM"
                prefix={<span style={{ color: '#52c41a' }}>●</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="stats-card">
              <Statistic
                title="合约地址"
                value={formatAddress(walletState.address || '')}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'agents',
      label: 'Agent管理',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="注册新Agent" className="form-card">
              <RegisterAgent />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Agent列表" className="form-card">
              <AgentList />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'rules',
      label: '支付规则',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="设置支付规则" className="form-card">
              <SetPaymentRules />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'payment',
      label: '支付管理',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="直接支付" className="form-card">
              <DirectPayment />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="存入资金" className="form-card">
              <DepositFunds />
            </Card>
          </Col>
        </Row>
      )
    }
  ];

  return (
    <Layout className="dashboard-layout">
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            ACPay Dashboard
          </Title>
          <Text type="secondary">AI代理支付管理系统</Text>
        </div>
        
        <Space>
          <div className="wallet-status">
            <span className="online">●</span>
            <Text>{formatAddress(walletState.address || '')}</Text>
          </div>
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefreshBalance}
            loading={isLoading('refresh')}
            title="刷新余额"
          >
            刷新
          </Button>
          
          <Button 
            icon={<DisconnectOutlined />} 
            onClick={handleDisconnect}
            danger
          >
            断开连接
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={tabItems}
          style={{ background: '#fff', borderRadius: '8px', padding: '16px' }}
        />
      </Content>
    </Layout>
  );
};

export default Dashboard; 