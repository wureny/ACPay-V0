// 合约相关类型定义

export interface AgentInfo {
  agentId: string;
  name: string;
  signerAddress: string;
  isActive: boolean;
  totalSpent: string; // USDT金额字符串
  registeredAt: Date;
}

export interface PaymentRules {
  dailyLimit: string; // USDT金额字符串
  transactionLimit: string; // USDT金额字符串
  enabled: boolean;
}

export interface PaymentRecord {
  agentId: string;
  recipient: string;
  amount: string; // USDT金额字符串
  metadata: string;
  timestamp: Date;
  txHash: string;
}

export interface ContractBalanceInfo {
  balance: string; // USDT金额字符串
  userBalance: string; // 用户USDT余额
}

// UI状态相关类型
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
}

export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  txHash?: string;
  gasUsed?: string;
}

// 表单数据类型
export interface RegisterAgentForm {
  agentId: string;
  name: string;
  signerAddress: string;
}

export interface SetRulesForm {
  agentId: string;
  dailyLimit: number;
  transactionLimit: number;
  enabled: boolean;
}

export interface PaymentForm {
  agentId: string;
  recipient: string;
  amount: number;
  metadata?: string;
}

// 网络配置类型
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contractAddress: string;
  usdtAddress: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// 事件监听相关类型
export interface EventCallbacks {
  onAgentRegistered?: (event: {
    agentId: string;
    name: string;
    signer: string;
    owner: string;
    timestamp: Date;
    txHash: string;
  }) => void;
  
  onPaymentMade?: (event: {
    agentId: string;
    recipient: string;
    amount: string;
    metadata: string;
    timestamp: Date;
    txHash: string;
  }) => void;
  
  onPaymentAggregated?: (event: {
    recipient: string;
    totalAmount: string;
    paymentCount: number;
    timestamp: Date;
    txHash: string;
  }) => void;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 加载状态类型
export interface LoadingState {
  [key: string]: boolean;
} 