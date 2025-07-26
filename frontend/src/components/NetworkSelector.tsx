import React, { useState, useEffect } from 'react';
import { Select, Space, Typography, Badge, Button, message } from 'antd';
import { GlobalOutlined, SwapOutlined } from '@ant-design/icons';
import contractService from '../utils/contractService';
import { NetworkConfig } from '../types';

const { Text } = Typography;
const { Option } = Select;

interface NetworkSelectorProps {
  currentNetwork: string;
  onNetworkChange?: (networkKey: string) => void;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({ 
  currentNetwork, 
  onNetworkChange 
}) => {
  const [switching, setSwitching] = useState(false);
  const [networks, setNetworks] = useState<{ [key: string]: NetworkConfig }>({});

  useEffect(() => {
    // 获取支持的网络列表
    try {
      const supportedNetworks = contractService.getSupportedNetworks();
      setNetworks(supportedNetworks);
    } catch (error) {
      console.error('Failed to get supported networks:', error);
    }
  }, []);

  const handleNetworkChange = async (networkKey: string) => {
    if (networkKey === currentNetwork) return;

    setSwitching(true);
    try {
      const result = await contractService.switchToNetwork(networkKey);
      
      if (result.success) {
        message.success(`成功切换到 ${networks[networkKey]?.name}`);
        onNetworkChange?.(networkKey);
      } else {
        message.error(`网络切换失败: ${result.error}`);
      }
    } catch (error: any) {
      message.error(`网络切换失败: ${error.message}`);
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkStatus = (networkKey: string) => {
    return networkKey === currentNetwork ? 'success' : 'default';
  };

  const currentConfig = networks[currentNetwork];

  // 如果网络列表为空，显示加载状态
  if (Object.keys(networks).length === 0) {
    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space align="center">
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <Text strong>选择网络:</Text>
        </Space>
        <Select
          loading
          style={{ width: '100%' }}
          placeholder="加载网络配置中..."
          disabled
        />
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Space align="center">
        <GlobalOutlined style={{ color: '#1890ff' }} />
        <Text strong>选择网络:</Text>
      </Space>
      
      <Select
        value={currentNetwork}
        onChange={handleNetworkChange}
        loading={switching}
        style={{ width: '100%' }}
        placeholder="选择网络"
        suffixIcon={<SwapOutlined />}
      >
        {Object.entries(networks).map(([key, config]) => (
          <Option key={key} value={key}>
            <Space>
              <Badge status={getNetworkStatus(key)} />
              <Text>{config.name}</Text>
              <Text type="secondary">(Chain ID: {config.chainId})</Text>
            </Space>
          </Option>
        ))}
      </Select>

      {currentConfig && (
        <div style={{ 
          marginTop: '8px', 
          padding: '12px', 
          backgroundColor: '#f0f2f5', 
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong style={{ color: '#1890ff' }}>当前网络信息:</Text>
            <div><Text type="secondary">网络: </Text><Text>{currentConfig.name}</Text></div>
            <div><Text type="secondary">Chain ID: </Text><Text>{currentConfig.chainId}</Text></div>
            <div><Text type="secondary">RPC: </Text><Text copyable ellipsis>{currentConfig.rpcUrl}</Text></div>
            <div><Text type="secondary">浏览器: </Text><Text copyable ellipsis>{currentConfig.blockExplorer}</Text></div>
            <div><Text type="secondary">合约地址: </Text><Text copyable ellipsis>{currentConfig.contractAddress}</Text></div>
          </Space>
        </div>
      )}
    </Space>
  );
};

export default NetworkSelector; 