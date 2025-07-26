import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Row, Col, Statistic, Timeline, Divider } from 'antd';
import { 
  WalletOutlined, 
  RocketOutlined, 
  SafetyOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  TeamOutlined,
  DollarOutlined,
  TrophyOutlined,
  GlobalOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useContract } from '../hooks/useContract';
import NetworkSelector from './NetworkSelector';

const { Title, Paragraph, Text } = Typography;

const WelcomePage: React.FC = () => {
  const { connectWallet, isLoading, currentNetwork } = useContract();
  const [selectedNetwork, setSelectedNetwork] = useState<string>('injective_testnet');

  // 同步当前网络状态
  useEffect(() => {
    setSelectedNetwork(currentNetwork);
  }, [currentNetwork]);

  const handleConnect = async () => {
    await connectWallet(selectedNetwork);
  };

  const handleNetworkChange = (networkKey: string) => {
    setSelectedNetwork(networkKey);
  };

  const features = [
    {
      icon: <TeamOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      title: 'AI代理舰队管理',
      description: '统一管理多个AI代理，无需为每个代理管理独立私钥',
      highlight: '智能合约钱包架构'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      title: '智能安全规则',
      description: '链上强制执行日限额、单笔限额，防止代理超支风险',
      highlight: '规则如防火墙'
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: '32px', color: '#faad14' }} />,
      title: '聚合支付优化',
      description: '小额支付自动聚合批量结算，大幅降低Gas费用',
      highlight: '节省高达80%交易费'
    },
    {
      icon: <ApiOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      title: 'x402协议兼容',
      description: '完全符合Coinbase x402标准，HTTP-native即时稳定币支付',
      highlight: '2025年最新Web3标准'
    }
  ];

  const demoServices = [
    { name: '天气 API', price: 2, description: '正常支付演示' },
    { name: 'AI 对话 API', price: 8, description: '中等价格演示' },
    { name: '高级数据 API', price: 15, description: '单笔限额测试' },
    { name: '批量处理 API', price: 25, description: '日限额测试' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px 0'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* 主标题区域 */}
        <Card 
          style={{ 
            marginBottom: '32px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            textAlign: 'center'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <RocketOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} />
              <Title level={1} style={{ marginBottom: '8px', color: '#1890ff', fontSize: '48px' }}>
                ACPay
              </Title>
              <Title level={3} style={{ marginBottom: '16px', color: '#666', fontWeight: 'normal' }}>
                Agent Crypto Pay - AI代理加密支付生态系统
              </Title>
              <Text style={{ fontSize: '18px', color: '#666' }}>
                基于Coinbase x402协议，为AI代理经济量身打造的智能支付平台
              </Text>
            </div>

            <Row gutter={32} style={{ marginTop: '24px' }}>
              <Col span={8}>
                <Statistic 
                  title="支持网络" 
                  value="2" 
                  suffix="个"
                  prefix={<GlobalOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: '32px' }}
                />
                <Text type="secondary">BSC & Injective EVM</Text>
              </Col>
              <Col span={8}>
                <Statistic 
                  title="统一合约地址" 
                  value="100%" 
                  suffix="兼容"
                  prefix={<LinkOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: '32px' }}
                />
                <Text type="secondary">跨链无缝体验</Text>
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Gas费优化" 
                  value="80%" 
                  suffix="节省"
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: '32px' }}
                />
                <Text type="secondary">聚合支付技术</Text>
              </Col>
            </Row>
          </Space>
        </Card>

        <Row gutter={24}>
          {/* 左侧：功能特色 */}
          <Col xs={24} lg={14}>
            <Card 
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '18px' }}>核心创新功能</Text>
                </Space>
              }
              style={{ 
                marginBottom: '24px',
                borderRadius: '12px',
                height: '100%'
              }}
            >
              <Row gutter={[24, 24]}>
                {features.map((feature, index) => (
                  <Col xs={24} sm={12} key={index}>
                    <Card
                      size="small"
                      style={{ 
                        height: '100%',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                      hoverable
                      bodyStyle={{ padding: '16px' }}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                          {feature.icon}
                        </div>
                        <Title level={5} style={{ textAlign: 'center', margin: 0 }}>
                          {feature.title}
                        </Title>
                        <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                          {feature.description}
                        </Text>
                        <div style={{ textAlign: 'center', marginTop: '8px' }}>
                          <Text style={{ 
                            background: '#f6ffed', 
                            color: '#52c41a', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {feature.highlight}
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Divider />

              <div>
                <Title level={5} style={{ marginBottom: '16px' }}>
                  <ApiOutlined style={{ color: '#722ed1', marginRight: '8px' }} />
                  演示API服务
                </Title>
                <Row gutter={[12, 12]}>
                  {demoServices.map((service, index) => (
                    <Col xs={12} sm={6} key={index}>
                      <Card
                        size="small"
                        style={{ textAlign: 'center', border: '1px solid #f0f0f0' }}
                        bodyStyle={{ padding: '12px 8px' }}
                      >
                        <Space direction="vertical" size={4}>
                          <Text strong style={{ fontSize: '12px' }}>{service.name}</Text>
                          <Text style={{ color: '#1890ff', fontSize: '14px', fontWeight: 'bold' }}>
                            ${service.price}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '10px' }}>
                            {service.description}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </Card>
          </Col>

          {/* 右侧：连接钱包 */}
          <Col xs={24} lg={10}>
            <Card 
              title={
                <Space>
                  <WalletOutlined style={{ color: '#1890ff' }} />
                  <Text strong style={{ fontSize: '18px' }}>开始使用</Text>
                </Space>
              }
              style={{ 
                marginBottom: '24px',
                borderRadius: '12px'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  message="🌟 多链生态系统"
                  description="ACPay已在BSC测试网和Injective EVM测试网成功部署，合约地址完全相同，为您提供无缝的跨链体验。"
                  type="info"
                  showIcon
                  style={{ 
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, #e6f7ff 0%, #f6ffed 100%)'
                  }}
                />

                <div>
                  <NetworkSelector 
                    currentNetwork={selectedNetwork}
                    onNetworkChange={handleNetworkChange}
                  />
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<WalletOutlined />}
                  onClick={handleConnect}
                  loading={isLoading('connect')}
                  style={{ 
                    width: '100%', 
                    height: '56px', 
                    fontSize: '18px',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, #1890ff 0%, #722ed1 100%)',
                    border: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading('connect') ? '连接中...' : '🚀 连接钱包，开启AI代理支付'}
                </Button>

                <Timeline
                  style={{ marginTop: '16px' }}
                  items={[
                    {
                      children: '选择网络并连接MetaMask钱包',
                      color: selectedNetwork ? 'green' : 'blue'
                    },
                    {
                      children: '注册AI代理并设置支付规则',
                      color: 'blue'
                    },
                    {
                      children: '体验x402协议智能支付',
                      color: 'blue'
                    }
                  ]}
                />

                <div style={{ 
                  padding: '16px', 
                  background: '#f8f9fa', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <Text style={{ fontSize: '12px', color: '#666' }}>
                    💡 首次连接将自动配置网络参数
                    <br />
                    📄 合约地址: 
                    <Text copyable style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      0x14ebB18cA52796a3c1A68FfC0E74374CD735f74A
                    </Text>
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default WelcomePage; 