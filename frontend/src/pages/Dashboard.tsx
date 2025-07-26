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
  message,
  Badge,
  Dropdown,
  Menu,
  Progress,
  Timeline,
  Tag,
  Avatar
} from 'antd';
import { 
  WalletOutlined, 
  SettingOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  GlobalOutlined,
  SwapOutlined,
  TeamOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  TrophyOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useContract } from '../hooks/useContract';
import RegisterAgent from '../components/RegisterAgent';
import SetPaymentRules from '../components/SetPaymentRules';
import DirectPayment from '../components/DirectPayment';
import AgentList from '../components/AgentList';
import DepositFunds from '../components/DepositFunds';
import contractService from '../utils/contractService';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { 
    walletState, 
    contractBalance, 
    disconnectWallet,
    refreshContractBalance,
    isLoading,
    currentNetwork,
    switchNetwork
  } = useContract();

  const [activeTab, setActiveTab] = useState('overview');
  const [networks, setNetworks] = useState<{ [key: string]: any }>({});

  // 页面加载时刷新余额和获取网络信息
  useEffect(() => {
    if (walletState.isConnected) {
      refreshContractBalance();
    }
    const supportedNetworks = contractService.getSupportedNetworks();
    setNetworks(supportedNetworks);
  }, [walletState.isConnected, refreshContractBalance]);

  const handleRefreshBalance = async () => {
    await refreshContractBalance();
    message.success('余额已刷新');
  };

  const handleDisconnect = () => {
    disconnectWallet();
    message.info('已断开钱包连接');
  };

  const handleNetworkSwitch = async (networkKey: string) => {
    if (networkKey === currentNetwork) return;
    
    const result = await switchNetwork(networkKey);
    if (result.success) {
      message.success(`成功切换到 ${networks[networkKey]?.name}`);
    } else {
      message.error(`网络切换失败: ${result.error}`);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getCurrentNetworkInfo = () => {
    return networks[currentNetwork] || {};
  };

  // 网络切换菜单
  const networkMenu = (
    <Menu>
      {Object.entries(networks).map(([key, config]) => (
        <Menu.Item 
          key={key} 
          onClick={() => handleNetworkSwitch(key)}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <Badge 
            status={key === currentNetwork ? 'success' : 'default'} 
            text={`${config.name} (Chain ID: ${config.chainId})`}
          />
        </Menu.Item>
      ))}
    </Menu>
  );

  const currentNetworkInfo = getCurrentNetworkInfo();
  const balance = parseFloat(contractBalance);

  // 模拟一些统计数据（实际项目中应该从合约获取）
  const mockStats = {
    totalAgents: 3,
    activeAgents: 2,
    totalTransactions: 15,
    totalVolume: 127.5,
    dailySpent: 23.8,
    dailyLimit: 100,
    gasOptimization: 78
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <TrophyOutlined />
          <span>总览</span>
        </Space>
      ),
      children: (
        <div>
          {/* 核心统计数据 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stats-card" style={{ background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', color: 'white' }}>
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>合约余额</span>}
                  value={balance}
                  precision={2}
                  suffix="USDT"
                  prefix={<WalletOutlined />}
                  valueStyle={{ color: 'white', fontSize: '28px' }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                  可用于AI代理支付
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card className="stats-card">
                <Statistic
                  title="管理代理"
                  value={mockStats.totalAgents}
                  suffix={`/ ${mockStats.activeAgents} 活跃`}
                  prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Progress 
                  percent={(mockStats.activeAgents / mockStats.totalAgents) * 100} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#52c41a"
                  style={{ marginTop: '8px' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="stats-card">
                <Statistic
                  title="今日消费"
                  value={mockStats.dailySpent}
                  suffix={`/ ${mockStats.dailyLimit}`}
                  prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: mockStats.dailySpent > mockStats.dailyLimit * 0.8 ? '#ff4d4f' : '#faad14' }}
                />
                <Progress 
                  percent={(mockStats.dailySpent / mockStats.dailyLimit) * 100} 
                  size="small" 
                  showInfo={false}
                  strokeColor={mockStats.dailySpent > mockStats.dailyLimit * 0.8 ? '#ff4d4f' : '#faad14'}
                  style={{ marginTop: '8px' }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card className="stats-card">
                <Statistic
                  title="Gas优化"
                  value={mockStats.gasOptimization}
                  suffix="%"
                  prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  聚合支付节省费用
                </div>
              </Card>
            </Col>
          </Row>

          {/* 网络和系统信息 */}
          <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <GlobalOutlined style={{ color: '#1890ff' }} />
                    <Text strong>当前网络状态</Text>
                  </Space>
                }
                extra={
                  <Tag color="success">
                    <Badge status="success" />
                    已连接
                  </Tag>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <Avatar 
                        size={48} 
                        style={{ 
                          backgroundColor: currentNetwork === 'injective_testnet' ? '#00d4aa' : '#f0b90b',
                          marginBottom: '8px'
                        }}
                      >
                        {currentNetwork === 'injective_testnet' ? 'INJ' : 'BNB'}
                      </Avatar>
                      <div>
                        <Text strong>{currentNetworkInfo.name}</Text>
                        <br />
                        <Text type="secondary">Chain ID: {currentNetworkInfo.chainId}</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary">合约地址</Text>
                        <br />
                        <Text copyable style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                          {currentNetworkInfo.contractAddress}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary">区块链浏览器</Text>
                        <br />
                        <a href={currentNetworkInfo.blockExplorer} target="_blank" rel="noopener noreferrer">
                          <Text style={{ fontSize: '12px' }}>查看合约 →</Text>
                        </a>
                      </div>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: '#722ed1' }} />
                    <Text strong>最近活动</Text>
                  </Space>
                }
              >
                <Timeline
                  items={[
                    {
                      children: '连接到 ' + currentNetworkInfo.name,
                      color: 'green',
                      dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    },
                    {
                      children: '合约余额: ' + balance + ' USDT',
                      color: 'blue'
                    },
                    {
                      children: '等待AI代理注册...',
                      color: 'gray'
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>

          {/* 功能快捷入口 */}
          <Card 
            title={
              <Space>
                <ApiOutlined style={{ color: '#1890ff' }} />
                <Text strong>快速操作</Text>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<TeamOutlined />}
                  onClick={() => setActiveTab('agents')}
                  style={{ height: '60px', borderRadius: '8px' }}
                >
                  注册代理
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<SafetyOutlined />}
                  onClick={() => setActiveTab('rules')}
                  style={{ height: '60px', borderRadius: '8px' }}
                >
                  设置规则
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<DollarOutlined />}
                  onClick={() => setActiveTab('payment')}
                  style={{ height: '60px', borderRadius: '8px' }}
                >
                  发起支付
                </Button>
              </Col>
              <Col xs={12} sm={6}>
                <Button
                  block
                  size="large"
                  icon={<WalletOutlined />}
                  onClick={() => setActiveTab('payment')}
                  style={{ height: '60px', borderRadius: '8px' }}
                >
                  存入资金
                </Button>
              </Col>
            </Row>
          </Card>
        </div>
      )
    },
    {
      key: 'agents',
      label: (
        <Space>
          <TeamOutlined />
          <span>Agent管理</span>
        </Space>
      ),
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
      label: (
        <Space>
          <SafetyOutlined />
          <span>支付规则</span>
        </Space>
      ),
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
      label: (
        <Space>
          <DollarOutlined />
          <span>支付管理</span>
        </Space>
      ),
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
        background: 'linear-gradient(90deg, #1890ff 0%, #722ed1 100%)', 
        padding: '0 24px', 
        borderBottom: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'white' }}>
            ACPay Dashboard
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }}>AI代理支付管理系统</Text>
        </div>
        
        <Space size="large">
          {/* 网络信息显示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge status="success" />
            <Text style={{ fontSize: '14px', color: 'white' }}>{currentNetworkInfo.name}</Text>
            <Dropdown 
              overlay={networkMenu} 
              trigger={['click']} 
              placement="bottomRight"
            >
              <Button 
                icon={<SwapOutlined />} 
                type="text" 
                size="small"
                loading={isLoading('switchNetwork')}
                title="切换网络"
                style={{ color: 'white' }}
              >
                切换
              </Button>
            </Dropdown>
          </div>
          
          {/* 钱包地址 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#52c41a', fontSize: '12px' }}>●</span>
            <Text style={{ color: 'white' }}>{formatAddress(walletState.address || '')}</Text>
          </div>
          
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefreshBalance}
            loading={isLoading('refresh')}
            title="刷新余额"
            ghost
          >
            刷新
          </Button>
          
          <Button 
            icon={<DisconnectOutlined />} 
            onClick={handleDisconnect}
            danger
            ghost
          >
            断开连接
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={tabItems}
          style={{ 
            background: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        />
      </Content>
    </Layout>
  );
};

export default Dashboard; 