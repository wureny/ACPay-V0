import React from 'react';
import { Button, Card, Typography, Space, Alert } from 'antd';
import { WalletOutlined, RocketOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useContract } from '../hooks/useContract';

const { Title, Paragraph } = Typography;

const WelcomePage: React.FC = () => {
  const { connectWallet, isLoading } = useContract();

  const handleConnectWallet = async () => {
    const result = await connectWallet();
    if (!result.success) {
      console.error('连接钱包失败:', result.error);
    }
  };

  const features = [
    {
      icon: <RocketOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      title: 'AI代理管理',
      description: '统一管理多个AI代理，设置支付规则和限额'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      title: '安全支付',
      description: '智能合约保障资金安全，防止超支和恶意使用'
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: '32px', color: '#faad14' }} />,
      title: 'Gas优化',
      description: '聚合支付机制，大幅降低区块链交易费用'
    }
  ];

  return (
    <div className="center-content">
      <Card style={{ maxWidth: 800, width: '90%', textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={1} className="gradient-text">
              ACPay Dashboard
            </Title>
            <Paragraph style={{ fontSize: '16px', color: '#666' }}>
              基于x402协议的AI代理支付管理系统
            </Paragraph>
          </div>

          <Alert
            message="开始使用前，请连接您的MetaMask钱包"
            description="确保您已安装MetaMask浏览器插件，并切换到Injective EVM测试网"
            type="info"
            showIcon
            style={{ textAlign: 'left' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
            {features.map((feature, index) => (
              <div key={index} style={{ flex: '1', minWidth: '200px', textAlign: 'center' }}>
                <div style={{ marginBottom: '12px' }}>
                  {feature.icon}
                </div>
                <Title level={4}>{feature.title}</Title>
                <Paragraph style={{ color: '#666' }}>
                  {feature.description}
                </Paragraph>
              </div>
            ))}
          </div>

          <Button
            type="primary"
            size="large"
            icon={<WalletOutlined />}
            onClick={handleConnectWallet}
            loading={isLoading('connect')}
            style={{ height: '48px', fontSize: '16px', minWidth: '200px' }}
          >
            {isLoading('connect') ? '连接中...' : '连接钱包'}
          </Button>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <Title level={5} style={{ marginBottom: '8px' }}>网络信息</Title>
            <Space direction="vertical" size="small" style={{ fontSize: '14px', color: '#666' }}>
              <div>网络：Injective EVM 测试网</div>
              <div>Chain ID：1439</div>
              <div>RPC：https://k8s.testnet.json-rpc.injective.network/</div>
              <div>浏览器：https://testnet.blockscout.injective.network/</div>
            </Space>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default WelcomePage; 