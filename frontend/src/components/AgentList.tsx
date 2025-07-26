import React, { useState } from 'react';
import { List, Input, message, Typography, Space, Tag } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useContract } from '../hooks/useContract';
import { AgentInfo } from '../types';

const { Text } = Typography;

const AgentList: React.FC = () => {
  const { getAgentInfo, isLoading } = useContract();
  const [searchValue, setSearchValue] = useState('');
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      message.warning('请输入Agent ID');
      return;
    }

    try {
      const result = await getAgentInfo(searchValue.trim());
      
      if (result.success && result.data) {
        setAgentInfo(result.data);
        message.success('查询成功');
      } else {
        message.error(result.error || '查询失败');
        setAgentInfo(null);
      }
    } catch (error: any) {
      message.error(error.message || '查询失败');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input.Search
        placeholder="输入Agent ID进行查询"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSearch={handleSearch}
        loading={isLoading('getAgent')}
        enterButton={<SearchOutlined />}
      />

      {agentInfo && (
        <List
          size="small"
          bordered
          dataSource={[
            { label: 'Agent ID', value: agentInfo.agentId },
            { label: '名称', value: agentInfo.name },
            { 
              label: '签名地址', 
              value: (
                <Text code className="address-text">
                  {formatAddress(agentInfo.signerAddress)}
                </Text>
              )
            },
            {
              label: '状态',
              value: (
                <Tag color={agentInfo.isActive ? 'success' : 'error'}>
                  {agentInfo.isActive ? '激活' : '未激活'}
                </Tag>
              )
            },
            { 
              label: '总消费', 
              value: `${parseFloat(agentInfo.totalSpent).toFixed(2)} USDT` 
            },
            { 
              label: '注册时间', 
              value: agentInfo.registeredAt.toLocaleString() 
            }
          ]}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={<Text strong>{item.label}</Text>}
                description={item.value}
              />
            </List.Item>
          )}
        />
      )}

      {!agentInfo && (
        <div style={{ 
          textAlign: 'center', 
          color: '#999', 
          padding: '40px 0' 
        }}>
          <EyeOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <div>搜索Agent查看详细信息</div>
        </div>
      )}
    </Space>
  );
};

export default AgentList; 