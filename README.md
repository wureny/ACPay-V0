# ACPay - Agent Crypto Pay

基于 x402 协议的 AI 代理支付系统，支持智能合约钱包、Agent ID 管理和聚合支付功能。

## 🌟 核心功能

### 智能合约钱包架构
- **Agent ID 管理**: 使用字符串 ID 标识 AI 代理，无需为每个 Agent 管理独立私钥
- **签名授权**: Agent 通过签名授权支付，资金安全由智能合约控制
- **规则限制**: 支持日限额、单笔限额等安全规则，可为每个 Agent 单独配置
- **聚合支付**: 小额支付自动聚合，达到阈值后统一结算，优化 Gas 费用
- **池子对接**: 自动识别 seller 池子地址并启用聚合支付功能

### x402 协议兼容
- **标准 HTTP 402 响应**: 完全符合 x402 协议标准
- **链上支付证明**: 生成可验证的链上支付证明
- **自动重试机制**: 支付成功后自动重新调用 API

## 🏗️ 架构概览

```
用户 (Owner) 
    ↓ 部署合约
BuyerWallet 智能合约
    ↓ 注册 Agent ID
AI Agent (字符串 ID + 签名地址)
    ↓ 签名授权支付
支付验证 & 执行
    ↓ 根据接收方类型
直接支付 / 聚合支付
```

### 核心概念

1. **Agent ID**: 字符串标识符，如 "weather-agent"、"gpt-agent"
2. **签名地址**: 每个 Agent 绑定的签名地址，用于授权支付
3. **智能钱包**: 资金集中管理，规则强制执行
4. **聚合支付**: 面向池子地址的小额支付暂存和批量结算

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 克隆项目
git clone <repository>
cd ACPay-V0

# 安装依赖
forge install
```

### 2. 编译合约

```bash
forge build
```

### 3. 运行测试

```bash
forge test
```

### 4. 部署到 Injective 测试网

#### 方法一：使用部署脚本

```bash
./deploy_to_injective.sh
```

#### 方法二：使用 forge create

```bash
forge create \
  src/BuyerWallet.sol:BuyerWallet \
  --rpc-url https://k8s.testnet.json-rpc.injective.network/ \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60 100000000 10000000 \
  --broadcast
```

**构造函数参数说明**:
- `0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60`: USDT 代币地址 (Injective 测试网)
- `100000000`: 默认日限额 (100 USDT, 6 位小数)
- `10000000`: 默认单笔限额 (10 USDT, 6 位小数)

## 📋 使用指南

### 1. 合约管理

#### 注册 AI Agent
```solidity
// 注册一个新的 AI Agent
function registerAgent(
    string calldata _agentId,     // "weather-agent"
    string calldata _name,        // "Weather AI Agent"
    address _signerAddress        // Agent 的签名地址
) external onlyOwner;
```

#### 设置支付规则
```solidity
// 为特定 Agent 设置规则
function setPaymentRules(
    string calldata _agentId,     // Agent ID (空字符串表示默认规则)
    uint256 _dailyLimit,          // 日限额 (USDT wei)
    uint256 _transactionLimit,    // 单笔限额 (USDT wei)
    bool _enabled                 // 是否启用
) external onlyOwner;
```

#### 池子地址管理
```solidity
// 添加 seller 池子地址（支持聚合支付）
function addPoolAddress(address _poolAddress) external onlyOwner;

// 移除池子地址
function removePoolAddress(address _poolAddress) external onlyOwner;
```

### 2. Agent 支付

#### 签名授权支付
```solidity
function payByAgent(
    string calldata _agentId,     // Agent ID
    address _recipient,           // 接收方地址
    uint256 _amount,             // 支付金额 (USDT wei)
    string calldata _metadata,   // 元数据
    bytes calldata _signature,   // Agent 签名
    uint256 _nonce              // 防重放 nonce
) external;
```

#### 直接支付（Owner 调用）
```solidity
function payDirect(
    string calldata _agentId,     // Agent ID
    address _recipient,           // 接收方地址  
    uint256 _amount,             // 支付金额
    string calldata _metadata   // 元数据
) external onlyOwner;
```

### 3. 聚合支付机制

- **自动触发**: 当向池子地址的待聚合金额达到阈值时自动执行
- **手动触发**: Owner 可以手动触发任何池子的聚合支付
- **Gas 优化**: 多笔小额支付合并为一次转账，显著降低 Gas 成本

```solidity
// 手动触发聚合支付
function forceAggregatePayment(address _recipient) external onlyOwner;

// 设置聚合阈值
function setAggregationThreshold(uint256 _threshold) external onlyOwner;
```

## 🔧 Python Agent 示例

### 基本用法

```python
from demo.x402_agent import X402Agent

# 创建 Agent 实例
agent = X402Agent(
    agent_id="weather-agent",           # Agent ID
    private_key="0x...",               # 签名私钥
    name="Weather AI Agent"            # Agent 名称
)

# 检查消费状态
status = agent.get_spending_status()
print(f"今日已消费: {status['today_spent']} USDT")
print(f"剩余额度: {status['remaining_limit']} USDT")

# 调用支持 x402 的 API
weather_data = agent.call_x402_api(
    "https://api.example.com/x402/weather",
    max_amount=5.0  # 最多支付 5 USDT
)
```

### 环境变量设置

```bash
export AGENT_PRIVATE_KEY=0x...  # Agent 的签名私钥
export BUYER_WALLET_ADDRESS=0x...  # 部署的合约地址
```

## 🌐 网络信息

### Injective EVM 测试网
- **Chain ID**: 1439
- **RPC URL**: https://k8s.testnet.json-rpc.injective.network/
- **浏览器**: https://testnet.blockscout.injective.network/
- **水龙头**: https://testnet.faucet.injective.network/

### 代币地址
- **USDT (MTS USDT)**: 0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60

## 📊 Gas 优化

### 聚合支付效果
- **传统方式**: 10 笔 5 USDT 支付 = 10 次转账交易
- **聚合支付**: 累积 50 USDT 后 = 1 次转账交易
- **Gas 节省**: 约 90% 的 Gas 费用节省

### 最佳实践
1. 设置合理的聚合阈值（默认 50 USDT）
2. 将高频支付的 seller 地址添加为池子地址
3. 定期检查待聚合支付状态
4. 使用 `forceAggregatePayment` 处理长时间未达到阈值的支付

## 🔐 安全特性

### 资金安全
- ✅ 资金由智能合约统一管理
- ✅ Agent 无法绕过合约规则直接转账  
- ✅ 多层验证：签名验证 + 规则检查 + 余额检查

### 访问控制
- ✅ Owner 权限：合约管理、Agent 注册、规则设置
- ✅ Agent 权限：签名授权支付、查询状态
- ✅ 签名验证：防止未授权支付

### 防重放攻击
- ✅ Nonce 机制防止重放攻击
- ✅ 时间戳验证增强安全性
- ✅ 签名消息包含完整上下文

## 🧪 测试

### 运行完整测试套件
```bash
forge test -vv
```

### 测试覆盖范围
- ✅ Agent 注册和管理
- ✅ 支付规则设置和验证
- ✅ 签名验证机制
- ✅ 直接支付和聚合支付
- ✅ 池子地址管理
- ✅ 权限控制
- ✅ 异常情况处理

