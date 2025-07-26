import { ethers } from 'ethers';
import BuyerWalletABI from '../abi/BuyerWallet.abi.json';
import { 
  NetworkConfig, 
  AgentInfo, 
  PaymentRules, 
  ContractCallResult,
  EventCallbacks 
} from '../types';

// 网络配置
const NETWORK_CONFIG: NetworkConfig = {
  chainId: 1439,
  name: 'Injective EVM Testnet',
  rpcUrl: 'https://k8s.testnet.json-rpc.injective.network/',
  blockExplorer: 'https://testnet.blockscout.injective.network/',
  contractAddress: process.env.REACT_APP_BUYER_WALLET_ADDRESS || '0x...', // 需要设置环境变量
  usdtAddress: '0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60'
};

class ContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private userAddress: string | null = null;

  /**
   * 初始化Web3连接
   */
  async initialize(): Promise<ContractCallResult<boolean>> {
    try {
      // 检查MetaMask是否安装
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包');
      }

      // 创建provider
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // 请求用户授权
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 获取signer
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();

      // 检查网络
      await this.checkAndSwitchNetwork();

      // 创建合约实例
      this.contract = new ethers.Contract(
        NETWORK_CONFIG.contractAddress,
        BuyerWalletABI,
        this.signer
      );

      console.log('✅ 合约连接成功:', {
        userAddress: this.userAddress,
        contractAddress: NETWORK_CONFIG.contractAddress
      });

      return { success: true, data: true };
    } catch (error: any) {
      console.error('❌ 初始化失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 检查并切换到正确的网络
   */
  private async checkAndSwitchNetwork(): Promise<void> {
    if (!this.provider) throw new Error('Provider not initialized');

    const network = await this.provider.getNetwork();
    
    if (network.chainId !== NETWORK_CONFIG.chainId) {
      try {
        // 尝试切换网络
        if (window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }]
          });
        }
      } catch (switchError: any) {
        // 如果网络不存在，添加网络
        if (switchError.code === 4902 && window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
              chainName: NETWORK_CONFIG.name,
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.blockExplorer],
              nativeCurrency: {
                name: 'INJ',
                symbol: 'INJ',
                decimals: 18
              }
            }]
          });
        } else {
          throw switchError;
        }
      }
    }
  }

  /**
   * 注册新的AI Agent
   */
  async registerAgent(
    agentId: string, 
    name: string, 
    signerAddress: string
  ): Promise<ContractCallResult> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const tx = await this.contract!.registerAgent(agentId, name, signerAddress);
      
      console.log('📝 注册Agent交易已发送:', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      console.log('✅ Agent注册成功:', {
        agentId,
        name,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      console.error('❌ 注册Agent失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 设置Agent支付规则
   */
  async setPaymentRules(
    agentId: string, 
    dailyLimit: number, 
    transactionLimit: number, 
    enabled: boolean = true
  ): Promise<ContractCallResult> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // 转换为合约需要的单位 (USDT有6位小数)
      const dailyLimitWei = ethers.utils.parseUnits(dailyLimit.toString(), 6);
      const transactionLimitWei = ethers.utils.parseUnits(transactionLimit.toString(), 6);

      const tx = await this.contract!.setPaymentRules(
        agentId,
        dailyLimitWei,
        transactionLimitWei,
        enabled
      );

      console.log('📝 设置规则交易已发送:', tx.hash);
      
      const receipt = await tx.wait();
      
      console.log('✅ 规则设置成功:', {
        agentId,
        dailyLimit: dailyLimit + ' USDT',
        transactionLimit: transactionLimit + ' USDT',
        txHash: receipt.transactionHash
      });

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error: any) {
      console.error('❌ 设置规则失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 直接支付 (Owner调用)
   */
  async payDirect(
    agentId: string, 
    recipient: string, 
    amount: number, 
    metadata: string = ''
  ): Promise<ContractCallResult> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // 转换金额为USDT单位
      const amountWei = ethers.utils.parseUnits(amount.toString(), 6);

      const tx = await this.contract!.payDirect(agentId, recipient, amountWei, metadata);

      console.log('📝 直接支付交易已发送:', tx.hash);
      
      const receipt = await tx.wait();
      
      console.log('✅ 支付成功:', {
        agentId,
        recipient,
        amount: amount + ' USDT',
        txHash: receipt.transactionHash
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        data: { amount }
      };
    } catch (error: any) {
      console.error('❌ 支付失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 添加池子地址
   */
  async addPoolAddress(poolAddress: string): Promise<ContractCallResult> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const tx = await this.contract!.addPoolAddress(poolAddress);
      
      console.log('📝 添加池子地址交易已发送:', tx.hash);
      
      const receipt = await tx.wait();
      
      console.log('✅ 池子地址添加成功:', {
        poolAddress,
        txHash: receipt.transactionHash
      });

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error: any) {
      console.error('❌ 添加池子地址失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 查询Agent信息
   */
  async getAgentInfo(agentId: string): Promise<ContractCallResult<AgentInfo>> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      const agentInfo = await this.contract!.getAgent(agentId);
      
      const result: AgentInfo = {
        agentId: agentInfo.agentId,
        name: agentInfo.name,
        signerAddress: agentInfo.signerAddress,
        isActive: agentInfo.isActive,
        totalSpent: ethers.utils.formatUnits(agentInfo.totalSpent, 6),
        registeredAt: new Date(agentInfo.registeredAt.toNumber() * 1000)
      };

      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ 查询Agent信息失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 查询Agent的支付规则
   */
  async getPaymentRules(agentId: string): Promise<ContractCallResult<PaymentRules>> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      const rules = await this.contract!.getPaymentRules(agentId);
      
      const result: PaymentRules = {
        dailyLimit: ethers.utils.formatUnits(rules.dailyLimit, 6),
        transactionLimit: ethers.utils.formatUnits(rules.transactionLimit, 6),
        enabled: rules.enabled
      };

      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ 查询支付规则失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 查询Agent今日消费
   */
  async getTodaySpending(agentId: string): Promise<ContractCallResult<string>> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      const spending = await this.contract!.getTodaySpending(agentId);
      const result = ethers.utils.formatUnits(spending, 6);
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ 查询今日消费失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 查询合约余额
   */
  async getContractBalance(): Promise<ContractCallResult<string>> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      // 创建USDT合约实例
      const usdtContract = new ethers.Contract(
        NETWORK_CONFIG.usdtAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider!
      );

      const balance = await usdtContract.balanceOf(NETWORK_CONFIG.contractAddress);
      const result = ethers.utils.formatUnits(balance, 6);
      
      return { success: true, data: result };
    } catch (error: any) {
      console.error('❌ 查询合约余额失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 存入USDT到合约
   */
  async deposit(amount: number): Promise<ContractCallResult> {
    try {
      if (!this.contract) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // 首先需要授权USDT转账
      const usdtContract = new ethers.Contract(
        NETWORK_CONFIG.usdtAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        this.signer!
      );

      const amountWei = ethers.utils.parseUnits(amount.toString(), 6);

      // 检查当前授权额度
      const currentAllowance = await usdtContract.allowance(
        this.userAddress!, 
        NETWORK_CONFIG.contractAddress
      );

      // 如果授权不足，先进行授权
      if (currentAllowance.lt(amountWei)) {
        console.log('📝 授权USDT转账...');
        const approveTx = await usdtContract.approve(
          NETWORK_CONFIG.contractAddress,
          amountWei
        );
        await approveTx.wait();
        console.log('✅ USDT授权成功');
      }

      // 执行存款
      const tx = await this.contract!.deposit(amountWei);
      
      console.log('📝 存款交易已发送:', tx.hash);
      
      const receipt = await tx.wait();
      
      console.log('✅ 存款成功:', {
        amount: amount + ' USDT',
        txHash: receipt.transactionHash
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        data: { amount }
      };
    } catch (error: any) {
      console.error('❌ 存款失败:', error);
      return { 
        success: false, 
        error: this.parseErrorMessage(error) 
      };
    }
  }

  /**
   * 监听合约事件
   */
  setupEventListeners(callbacks: EventCallbacks): void {
    if (!this.contract) return;

    // 监听Agent注册事件
    if (callbacks.onAgentRegistered) {
      this.contract.on('AgentRegistered', (agentId, name, signer, owner, timestamp, event) => {
        callbacks.onAgentRegistered!({
          agentId,
          name,
          signer,
          owner,
          timestamp: new Date(timestamp.toNumber() * 1000),
          txHash: event.transactionHash
        });
      });
    }

    // 监听支付事件
    if (callbacks.onPaymentMade) {
      this.contract.on('PaymentMade', (agentId, recipient, amount, metadata, timestamp, event) => {
        callbacks.onPaymentMade!({
          agentId,
          recipient,
          amount: ethers.utils.formatUnits(amount, 6),
          metadata,
          timestamp: new Date(timestamp.toNumber() * 1000),
          txHash: event.transactionHash
        });
      });
    }

    // 监听聚合支付事件
    if (callbacks.onPaymentAggregated) {
      this.contract.on('PaymentAggregated', (recipient, totalAmount, paymentCount, timestamp, event) => {
        callbacks.onPaymentAggregated!({
          recipient,
          totalAmount: ethers.utils.formatUnits(totalAmount, 6),
          paymentCount: paymentCount.toNumber(),
          timestamp: new Date(timestamp.toNumber() * 1000),
          txHash: event.transactionHash
        });
      });
    }
  }

  /**
   * 解析错误信息
   */
  private parseErrorMessage(error: any): string {
    if (error.code === 4001) {
      return '用户取消了交易';
    } else if (error.code === -32603) {
      return '交易执行失败，请检查参数和余额';
    } else if (error.message?.includes('insufficient funds')) {
      return '余额不足，请充值后重试';
    } else if (error.message?.includes('user rejected')) {
      return '用户拒绝了交易';
    } else if (error.message?.includes('already exists')) {
      return '记录已存在';
    } else if (error.message?.includes('not found')) {
      return '记录未找到';
    } else {
      return error.message || '未知错误';
    }
  }

  /**
   * 获取用户地址
   */
  getUserAddress(): string | null {
    return this.userAddress;
  }

  /**
   * 获取网络信息
   */
  getNetworkConfig(): NetworkConfig {
    return NETWORK_CONFIG;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.userAddress = null;
  }
}

// 创建单例实例
const contractService = new ContractService();

export default contractService; 