import { useState, useEffect, useCallback } from 'react';
import contractService from '../utils/contractService';
import { 
  WalletState, 
  AgentInfo, 
  PaymentRules, 
  ContractCallResult,
  LoadingState 
} from '../types';

export const useContract = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isCorrectNetwork: false
  });

  const [loading, setLoading] = useState<LoadingState>({});
  const [contractBalance, setContractBalance] = useState<string>('0');
  const [currentNetwork, setCurrentNetwork] = useState<string>('injective_testnet');

  // 设置加载状态
  const setLoadingState = useCallback((key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  // 刷新合约余额
  const refreshContractBalance = useCallback(async () => {
    try {
      const result = await contractService.getContractBalance();
      if (result.success && result.data) {
        setContractBalance(result.data);
      }
    } catch (error) {
      console.error('Failed to refresh contract balance:', error);
    }
  }, []);

  // 连接钱包
  const connectWallet = useCallback(async (targetNetwork?: string): Promise<ContractCallResult<boolean>> => {
    setLoadingState('connect', true);
    try {
      const result = await contractService.initialize(targetNetwork);
      
      if (result.success) {
        const address = contractService.getUserAddress();
        const networkConfig = contractService.getNetworkConfig();
        const currentNet = contractService.getCurrentNetwork();
        
        setWalletState({
          isConnected: true,
          address,
          chainId: networkConfig.chainId,
          isCorrectNetwork: true
        });

        setCurrentNetwork(currentNet);

        // 获取合约余额
        await refreshContractBalance();
      }
      
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoadingState('connect', false);
    }
  }, [setLoadingState, refreshContractBalance]);

  // 切换网络
  const switchNetwork = useCallback(async (networkKey: string): Promise<ContractCallResult<boolean>> => {
    setLoadingState('switchNetwork', true);
    try {
      const result = await contractService.switchToNetwork(networkKey);
      
      if (result.success) {
        const networkConfig = contractService.getNetworkConfig();
        const currentNet = contractService.getCurrentNetwork();
        
        setWalletState(prev => ({
          ...prev,
          chainId: networkConfig.chainId
        }));

        setCurrentNetwork(currentNet);
        
        // 切换网络后刷新合约余额
        await refreshContractBalance();
      }
      
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoadingState('switchNetwork', false);
    }
  }, [setLoadingState, refreshContractBalance]);

  // 断开钱包
  const disconnectWallet = useCallback(() => {
    contractService.disconnect();
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      isCorrectNetwork: false
    });
    setContractBalance('0');
    setCurrentNetwork('injective_testnet');
  }, []);

  // 注册Agent
  const registerAgent = useCallback(async (
    agentId: string, 
    name: string, 
    signerAddress: string
  ): Promise<ContractCallResult> => {
    setLoadingState('registerAgent', true);
    try {
      return await contractService.registerAgent(agentId, name, signerAddress);
    } finally {
      setLoadingState('registerAgent', false);
    }
  }, [setLoadingState]);

  // 设置支付规则
  const setPaymentRules = useCallback(async (
    agentId: string, 
    dailyLimit: number, 
    transactionLimit: number, 
    enabled: boolean = true
  ): Promise<ContractCallResult> => {
    setLoadingState('setRules', true);
    try {
      return await contractService.setPaymentRules(agentId, dailyLimit, transactionLimit, enabled);
    } finally {
      setLoadingState('setRules', false);
    }
  }, [setLoadingState]);

  // 直接支付
  const payDirect = useCallback(async (
    agentId: string, 
    recipient: string, 
    amount: number, 
    metadata: string = ''
  ): Promise<ContractCallResult> => {
    setLoadingState('pay', true);
    try {
      const result = await contractService.payDirect(agentId, recipient, amount, metadata);
      
      // 支付成功后刷新余额
      if (result.success) {
        await refreshContractBalance();
      }
      
      return result;
    } finally {
      setLoadingState('pay', false);
    }
  }, [setLoadingState, refreshContractBalance]);

  // 添加池子地址
  const addPoolAddress = useCallback(async (poolAddress: string): Promise<ContractCallResult> => {
    setLoadingState('addPool', true);
    try {
      return await contractService.addPoolAddress(poolAddress);
    } finally {
      setLoadingState('addPool', false);
    }
  }, [setLoadingState]);

  // 存款
  const deposit = useCallback(async (amount: number): Promise<ContractCallResult> => {
    setLoadingState('deposit', true);
    try {
      const result = await contractService.deposit(amount);
      
      // 存款成功后刷新余额
      if (result.success) {
        await refreshContractBalance();
      }
      
      return result;
    } finally {
      setLoadingState('deposit', false);
    }
  }, [setLoadingState, refreshContractBalance]);

  // 获取Agent信息
  const getAgentInfo = useCallback(async (agentId: string): Promise<ContractCallResult<AgentInfo>> => {
    setLoadingState('getAgent', true);
    try {
      return await contractService.getAgentInfo(agentId);
    } finally {
      setLoadingState('getAgent', false);
    }
  }, [setLoadingState]);

  // 获取支付规则
  const getPaymentRules = useCallback(async (agentId: string): Promise<ContractCallResult<PaymentRules>> => {
    setLoadingState('getRules', true);
    try {
      return await contractService.getPaymentRules(agentId);
    } finally {
      setLoadingState('getRules', false);
    }
  }, [setLoadingState]);

  // 获取今日消费
  const getTodaySpending = useCallback(async (agentId: string): Promise<ContractCallResult<string>> => {
    setLoadingState('getSpending', true);
    try {
      return await contractService.getTodaySpending(agentId);
    } finally {
      setLoadingState('getSpending', false);
    }
  }, [setLoadingState]);

  // 监听账户变化
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== walletState.address) {
        // 账户变化，重新连接
        connectWallet();
      }
    };

    const handleChainChanged = (chainId: string) => {
      // 网络变化，重新连接
      connectWallet();
    };

    const ethereum = window.ethereum;
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (ethereum) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [walletState.address, connectWallet, disconnectWallet]);

  // 组件挂载时检查是否已连接
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, [connectWallet]);

  return {
    // 状态
    walletState,
    loading,
    contractBalance,
    currentNetwork,
    
    // 钱包操作
    connectWallet,
    disconnectWallet,
    switchNetwork,
    
    // 合约操作
    registerAgent,
    setPaymentRules,
    payDirect,
    addPoolAddress,
    deposit,
    
    // 查询操作
    getAgentInfo,
    getPaymentRules,
    getTodaySpending,
    refreshContractBalance,
    
    // 工具函数
    isLoading: (key: string) => loading[key] || false
  };
}; 