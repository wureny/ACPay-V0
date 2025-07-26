import React from 'react';
import { Form, Input, InputNumber, Switch, Button, message, Row, Col } from 'antd';
import { useContract } from '../hooks/useContract';
import { SetRulesForm } from '../types';

const SetPaymentRules: React.FC = () => {
  const { setPaymentRules, isLoading } = useContract();
  const [form] = Form.useForm();

  const handleSubmit = async (values: SetRulesForm) => {
    try {
      const result = await setPaymentRules(
        values.agentId, 
        values.dailyLimit, 
        values.transactionLimit, 
        values.enabled
      );
      
      if (result.success) {
        message.success('支付规则设置成功！');
        form.resetFields();
      } else {
        message.error(result.error || '设置失败');
      }
    } catch (error: any) {
      message.error(error.message || '设置失败');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
      initialValues={{
        enabled: true,
        dailyLimit: 100,
        transactionLimit: 10
      }}
    >
      <Form.Item
        label="Agent ID"
        name="agentId"
        rules={[{ required: true, message: '请输入Agent ID' }]}
      >
        <Input placeholder="输入Agent ID" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="日限额 (USDT)"
            name="dailyLimit"
            rules={[
              { required: true, message: '请输入日限额' },
              { type: 'number', min: 0.01, message: '日限额必须大于0.01' }
            ]}
          >
            <InputNumber
              placeholder="100"
              min={0.01}
              step={0.01}
              style={{ width: '100%' }}
              addonAfter="USDT"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="单笔限额 (USDT)"
            name="transactionLimit"
            rules={[
              { required: true, message: '请输入单笔限额' },
              { type: 'number', min: 0.01, message: '单笔限额必须大于0.01' }
            ]}
          >
            <InputNumber
              placeholder="10"
              min={0.01}
              step={0.01}
              style={{ width: '100%' }}
              addonAfter="USDT"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="启用规则"
        name="enabled"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={isLoading('setRules')}
          block
        >
          设置规则
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SetPaymentRules; 