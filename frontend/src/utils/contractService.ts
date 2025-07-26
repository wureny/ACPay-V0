import { ethers } from 'ethers';
import BuyerWalletABI from '../abi/BuyerWallet.abi.json';
import { 
  NetworkConfig, 
  AgentInfo, 
  PaymentRules, 
  ContractCallResult,
  EventCallbacks 
} from '../types';

// 导入多链配置
import multiChainConfig from '../multi-chain-config.json';

// 网络配置 - 从多链配置文件中读取
const SUPPORTED_NETWORKS: { [key: string]: NetworkConfig } = {
  'injective_testnet': {
    chainId: multiChainConfig.networks.injective_testnet.chainId,
    name: multiChainConfig.networks.injective_testnet.name,
    rpcUrl: multiChainConfig.networks.injective_testnet.rpcUrl,
    blockExplorer: multiChainConfig.networks.injective_testnet.explorer,
    contractAddress: multiChainConfig.networks.injective_testnet.contracts.buyerWallet,
    usdtAddress: multiChainConfig.networks.injective_testnet.contracts.usdt,
    nativeCurrency: multiChainConfig.networks.injective_testnet.nativeCurrency
  },
  'bnb_testnet': {
    chainId: multiChainConfig.networks.bnb_testnet.chainId,
    name: multiChainConfig.networks.bnb_testnet.name,
    rpcUrl: multiChainConfig.networks.bnb_testnet.rpcUrl,
    blockExplorer: multiChainConfig.networks.bnb_testnet.explorer,
    contractAddress: multiChainConfig.networks.bnb_testnet.contracts.buyerWallet,
    usdtAddress: multiChainConfig.networks.bnb_testnet.contracts.usdt,
    nativeCurrency: multiChainConfig.networks.bnb_testnet.nativeCurrency
  }
};

// 默认网络
const DEFAULT_NETWORK = 'injective_testnet';

class ContractService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private userAddress: string | null = null;
  private currentNetwork: string = DEFAULT_NETWORK;

  /**
   * 获取支持的所有网络
   */
  getSupportedNetworks(): { [key: string]: NetworkConfig } {
    return SUPPORTED_NETWORKS;
  }

  /**
   * 设置当前网络
   */
  setCurrentNetwork(networkKey: string): void {
    if (SUPPORTED_NETWORKS[networkKey]) {
      this.currentNetwork = networkKey;
    }
  }

  /**
   * 获取当前网络配置
   */
  getCurrentNetworkConfig(): NetworkConfig {
    return SUPPORTED_NETWORKS[this.currentNetwork];
  }

  /**
   * 根据chainId检测当前网络
   */
  detectNetworkByChainId(chainId: number): string | null {
    for (const [key, config] of Object.entries(SUPPORTED_NETWORKS)) {
      if (config.chainId === chainId) {
        return key;
      }
    }
    return null;
  }

  /**
   * 初始化Web3连接
   */
  async initialize(targetNetwork?: string): Promise<ContractCallResult<boolean>> {
    try {
      // 检查MetaMask是否安装
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包');
      }

      // 如果指定了目标网络，设置为当前网络
      if (targetNetwork && SUPPORTED_NETWORKS[targetNetwork]) {
        this.currentNetwork = targetNetwork;
      }

      // 创建provider
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // 请求用户授权
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 获取signer
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();

      // 检查当前钱包连接的网络
      const network = await this.provider.getNetwork();
      const detectedNetwork = this.detectNetworkByChainId(network.chainId);
      
      if (detectedNetwork) {
        // 如果检测到支持的网络，使用该网络
        this.currentNetwork = detectedNetwork;
      } else {
        // 如果当前连接的网络不支持，切换到目标网络
        await this.checkAndSwitchNetwork();
      }

      // 创建合约实例
      const currentConfig = this.getCurrentNetworkConfig();
      this.contract = new ethers.Contract(
        currentConfig.contractAddress,
        BuyerWalletABI,
        this.signer
      );

      console.log('✅ 合约连接成功:', {
        userAddress: this.userAddress,
        network: currentConfig.name,
        contractAddress: currentConfig.contractAddress
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
   * 切换到指定网络
   */
  async switchToNetwork(networkKey: string): Promise<ContractCallResult<boolean>> {
    try {
      if (!SUPPORTED_NETWORKS[networkKey]) {
        throw new Error(`不支持的网络: ${networkKey}`);
      }

      const targetConfig = SUPPORTED_NETWORKS[networkKey];
      this.currentNetwork = networkKey;

      // 切换网络
      await this.checkAndSwitchNetwork();

      // 重新初始化合约
      if (this.signer) {
        this.contract = new ethers.Contract(
          targetConfig.contractAddress,
          BuyerWalletABI,
          this.signer
        );
      }

      console.log('✅ 网络切换成功:', targetConfig.name);
      return { success: true, data: true };
    } catch (error: any) {
      console.error('❌ 网络切换失败:', error);
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

    const currentConfig = this.getCurrentNetworkConfig();
    const network = await this.provider.getNetwork();
    
    if (network.chainId !== currentConfig.chainId) {
      try {
        // 尝试切换网络
        if (window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${currentConfig.chainId.toString(16)}` }]
          });
        }
      } catch (switchError: any) {
        // 如果网络不存在，添加网络
        if (switchError.code === 4902 && window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${currentConfig.chainId.toString(16)}`,
              chainName: currentConfig.name,
              rpcUrls: [currentConfig.rpcUrl],
              blockExplorerUrls: [currentConfig.blockExplorer],
              nativeCurrency: currentConfig.nativeCurrency
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
        this.getCurrentNetworkConfig().usdtAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider!
      );

      const balance = await usdtContract.balanceOf(this.getCurrentNetworkConfig().contractAddress);
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
        this.getCurrentNetworkConfig().usdtAddress,
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
        this.getCurrentNetworkConfig().contractAddress
      );

      // 如果授权不足，先进行授权
      if (currentAllowance.lt(amountWei)) {
        console.log('📝 授权USDT转账...');
        const approveTx = await usdtContract.approve(
          this.getCurrentNetworkConfig().contractAddress,
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
   * 获取当前用户地址
   */
  getUserAddress(): string | null {
    return this.userAddress;
  }

  /**
   * 获取当前网络key
   */
  getCurrentNetwork(): string {
    return this.currentNetwork;
  }

  /**
   * 获取网络信息
   */
  getNetworkConfig(): NetworkConfig {
    return this.getCurrentNetworkConfig();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.userAddress = null;
    this.currentNetwork = DEFAULT_NETWORK;
  }
}

// 创建单例实例
const contractService = new ContractService();

export default contractService; 