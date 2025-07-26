import React from 'react';
import { Form, InputNumber, Button, message, Alert } from 'antd';
import { useContract } from '../hooks/useContract';

interface DepositForm {
  amount: number;
}

const DepositFunds: React.FC = () => {
  const { deposit, isLoading } = useContract();
  const [form] = Form.useForm();

  const handleSubmit = async (values: DepositForm) => {
    try {
      const result = await deposit(values.amount);
      
      if (result.success) {
        message.success('存款成功！');
        form.resetFields();
      } else {
        message.error(result.error || '存款失败');
      }
    } catch (error: any) {
      message.error(error.message || '存款失败');
    }
  };

  return (
    <>
      <Alert
        message="存款说明"
        description="存入USDT到合约，用于Agent支付。首次存款需要授权USDT转账。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="存款金额 (USDT)"
          name="amount"
          rules={[
            { required: true, message: '请输入存款金额' },
            { type: 'number', min: 0.01, message: '存款金额必须大于0.01' }
          ]}
        >
          <InputNumber
            placeholder="100.00"
            min={0.01}
            step={0.01}
            style={{ width: '100%' }}
            addonAfter="USDT"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={isLoading('deposit')}
            block
          >
            存入资金
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default DepositFunds; 