import React from 'react';
import { Form, Input, InputNumber, Button, message } from 'antd';
import { useContract } from '../hooks/useContract';
import { PaymentForm } from '../types';

const DirectPayment: React.FC = () => {
  const { payDirect, isLoading } = useContract();
  const [form] = Form.useForm();

  const handleSubmit = async (values: PaymentForm) => {
    try {
      const result = await payDirect(
        values.agentId, 
        values.recipient, 
        values.amount, 
        values.metadata || ''
      );
      
      if (result.success) {
        message.success('支付成功！');
        form.resetFields();
      } else {
        message.error(result.error || '支付失败');
      }
    } catch (error: any) {
      message.error(error.message || '支付失败');
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
        rules={[{ required: true, message: '请输入Agent ID' }]}
      >
        <Input placeholder="输入Agent ID" />
      </Form.Item>

      <Form.Item
        label="接收方地址"
        name="recipient"
        rules={[
          { required: true, message: '请输入接收方地址' },
          { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }
        ]}
      >
        <Input placeholder="0x..." />
      </Form.Item>

      <Form.Item
        label="支付金额 (USDT)"
        name="amount"
        rules={[
          { required: true, message: '请输入支付金额' },
          { type: 'number', min: 0.01, message: '支付金额必须大于0.01' }
        ]}
      >
        <InputNumber
          placeholder="10.00"
          min={0.01}
          step={0.01}
          style={{ width: '100%' }}
          addonAfter="USDT"
        />
      </Form.Item>

      <Form.Item
        label="备注信息（可选）"
        name="metadata"
      >
        <Input.TextArea 
          placeholder="输入备注信息"
          rows={3}
          maxLength={200}
        />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={isLoading('pay')}
          block
        >
          执行支付
        </Button>
      </Form.Item>
    </Form>
  );
};

export default DirectPayment; 