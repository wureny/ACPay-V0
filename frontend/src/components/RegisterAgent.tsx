import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { useContract } from '../hooks/useContract';
import { RegisterAgentForm } from '../types';

const RegisterAgent: React.FC = () => {
  const { registerAgent, isLoading } = useContract();
  const [form] = Form.useForm();

  const handleSubmit = async (values: RegisterAgentForm) => {
    try {
      const result = await registerAgent(values.agentId, values.name, values.signerAddress);
      
      if (result.success) {
        message.success('Agent注册成功！');
        form.resetFields();
      } else {
        message.error(result.error || '注册失败');
      }
    } catch (error: any) {
      message.error(error.message || '注册失败');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="Agent ID"
        name="agentId"
        rules={[
          { required: true, message: '请输入Agent ID' },
          { pattern: /^[a-zA-Z0-9-_]+$/, message: '只能包含字母、数字、短横线和下划线' }
        ]}
      >
        <Input placeholder="例如: weather-agent" />
      </Form.Item>

      <Form.Item
        label="Agent名称"
        name="name"
        rules={[{ required: true, message: '请输入Agent名称' }]}
      >
        <Input placeholder="例如: 天气查询Agent" />
      </Form.Item>

      <Form.Item
        label="签名地址"
        name="signerAddress"
        rules={[
          { required: true, message: '请输入签名地址' },
          { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }
        ]}
      >
        <Input placeholder="0x..." />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={isLoading('registerAgent')}
          block
        >
          注册Agent
        </Button>
      </Form.Item>
    </Form>
  );
};

export default RegisterAgent; 