# ACPay x402 演示系统

## 🎯 演示概述

这是一个完整的 ACPay x402 协议演示系统，展示AI Agent自动支付的完整流程，包括：

- ✅ **正常支付流程**：Agent收到402响应 → 自动支付 → 获取服务
- ⚠️ **限额控制演示**：单笔限额、日限额保护机制
- 🔄 **x402协议实现**：标准HTTP 402支付协议
- 🤖 **AI Agent模拟**：多个Agent角色，不同消费场景

## 🚀 快速开始

### 方法一：使用启动脚本
```bash
cd ACPay-V0/demo
./run_demo.sh
```

### 方法二：手动启动

#### 1. 启动API服务器
```bash
# 终端1 - 启动x402 API服务器
cd ACPay-V0/demo
python3 demo_server.py
```

#### 2. 运行Agent演示
```bash
# 终端2 - 运行演示Agent
cd ACPay-V0/demo
python3 demo_agent.py
```

## 📚 演示场景

### 场景1：正常支付 (2 USDT)
- **Agent**: weather-agent
- **服务**: 天气数据API
- **预期**: ✅ 支付成功，获取天气数据

### 场景2：中等价格支付 (8 USDT)
- **Agent**: ai-agent  
- **服务**: AI对话API
- **预期**: ✅ 支付成功，获取AI回复

### 场景3：单笔限额测试 (15 USDT)
- **Agent**: premium-agent
- **服务**: 高级数据API
- **预期**: ❌ 超出单笔限额（10 USDT），支付被拒绝

### 场景4：日限额测试 (25 USDT)
- **Agent**: bulk-agent (已消费80 USDT)
- **服务**: 批量处理API
- **预期**: ❌ 超出日限额（100 USDT），支付被拒绝

## 🎭 演示流程

1. **Agent发起API调用**
   ```
   GET http://localhost:5000/api/weather
   ```

2. **收到402响应**
   ```json
   {
     "error": "Payment Required",
     "message": "此API需要支付 2.0 USDT",
     "payment_info": {
       "recipient": "0xc1E4...",
       "amount": 2000000,
       "currency": "USDT"
     }
   }
   ```

3. **Agent智能合约支付**
   - 检查支付规则（单笔限额、日限额）
   - 生成支付签名
   - 调用合约 `payByAgent()`

4. **重新调用API（带支付证明）**
   ```
   GET http://localhost:5000/api/weather
   X-Payment-Hash: 0x1234567890abcdef...
   ```

5. **获取服务数据**
   ```json
   {
     "location": "杭州",
     "temperature": 28,
     "payment_verified": true
   }
   ```

## 🔧 技术架构

### API服务器 (`demo_server.py`)
- **Flask Web框架**：提供HTTP API服务
- **x402协议实现**：标准402响应和支付验证
- **多种价格服务**：模拟不同消费场景
- **支付验证模拟**：演示模式下的支付确认

### Agent客户端 (`demo_agent.py`)
- **Web3集成**：连接Injective测试网
- **智能合约交互**：调用BuyerWallet合约
- **规则检查**：本地预检查限额规则
- **自动重试**：支付后自动重新调用API

## 🎪 演示亮点

### 对比传统支付
| 传统支付 | ACPay x402 |
|---------|------------|
| 手动充值 | 自动支付 |
| 预付费 | 按需付费 |
| 无限额控制 | 智能限额 |
| 需要注册 | 无需注册 |

### 限额保护机制
- **单笔限额**：防止单次大额支付
- **日限额**：控制每日总消费
- **链上强制**：规则不可绕过
- **实时监控**：支付状态透明

## 🎯 评审要点

### 创意 ⭐⭐⭐⭐⭐
- **跳出边框思考**：从支付协议到生态系统
- **AI + Web3融合**：代理自主支付新模式
- **用户体验革新**：无感支付体验

### 技术复杂性 ⭐⭐⭐⭐
- **多层架构**：智能合约 + API服务 + Agent客户端
- **协议实现**：完整x402标准支持
- **安全机制**：多重限额保护

### 社会影响力 ⭐⭐⭐⭐⭐
- **AI代理经济**：推动自主Agent生态
- **支付基础设施**：Web3时代的支付标准
- **技术向善**：智能合约保护资金安全

## 📝 依赖包

```bash
pip3 install flask web3 requests eth-account
```

## 🔗 相关链接

- **合约地址**: `0x14ebB18cA52796a3c1A68FfC0E74374CD735f74A`
- **区块链**: Injective EVM 测试网
- **x402协议**: https://x402.gitbook.io/x402
- **前端界面**: http://localhost:3000

## 💡 演示技巧

1. **先运行成功场景**：建立信心
2. **对比限额效果**：展示保护机制
3. **实时日志观察**：显示技术细节
4. **强调自动化**：Agent无需人工干预

## 🐛 故障排除

### API服务器无法启动
```bash
# 检查端口占用
lsof -i :5000
# 更换端口
python3 demo_server.py --port 5001
```

### Agent连接失败
```bash
# 检查网络连接
curl http://localhost:5000/demo/status
```

### 依赖包问题
```bash
# 重新安装依赖
pip3 uninstall flask web3 requests eth-account
pip3 install flask web3 requests eth-account
``` 