#!/bin/bash

echo "🔗 BNB Chain 测试网部署脚本"
echo "================================"

# 检查是否设置了私钥
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ 错误: 请设置 PRIVATE_KEY 环境变量"
    echo "   export PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# 检查 Foundry 是否安装
if ! command -v forge &> /dev/null; then
    echo "❌ 错误: 未找到 forge 命令，请先安装 Foundry"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

echo "🏗️  编译合约..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ 合约编译失败"
    exit 1
fi

echo "✅ 合约编译成功"

echo ""
echo "📋 部署信息:"
echo "   网络: BNB Chain 测试网 (Chain ID: 97)"
echo "   RPC: https://data-seed-prebsc-1-s1.bnbchain.org:8545/"
echo "   浏览器: https://testnet.bscscan.com/"
echo "   USDT: 0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684"
echo "   日限额: 100 USDT"
echo "   单笔限额: 10 USDT"
echo ""

read -p "确认部署到 BNB Chain 测试网? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消部署"
    exit 0
fi

echo "🚀 开始部署到 BNB Chain 测试网..."
echo ""

# 检查是否设置了 BSC API key，如果有则验证合约
if [ -n "$BSC_API_KEY" ]; then
    echo "✅ 检测到 BSC_API_KEY，将自动验证合约"
    # 部署并验证合约
    forge script script/DeployBNB.s.sol:DeployBNB \
        --rpc-url bnb_testnet \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        --etherscan-api-key $BSC_API_KEY \
        -v
else
    echo "⚠️  未设置 BSC_API_KEY，跳过自动验证"
    echo "   可稍后手动验证合约"
    # 仅部署，不验证
    forge script script/DeployBNB.s.sol:DeployBNB \
        --rpc-url bnb_testnet \
        --private-key $PRIVATE_KEY \
        --broadcast \
        -v
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功!"
    echo "📁 部署信息已保存到: bnb-deployment.txt"
    echo ""
    echo "🔗 相关链接:"
    echo "   BSCScan 测试网: https://testnet.bscscan.com/"
    echo "   BNB Chain 水龙头: https://testnet.bnbchain.org/faucet-smart"
    echo ""
    echo "📝 下一步:"
    echo "   1. 从水龙头获取测试 BNB 和 USDT"
    echo "   2. 更新前端配置文件中的合约地址"
    echo "   3. 在演示中展示多链支持"
    
    if [ -z "$BSC_API_KEY" ]; then
        echo ""
        echo "💡 手动验证合约:"
        echo "   1. 设置 BSC_API_KEY: export BSC_API_KEY=your_api_key"
        echo "   2. 运行验证命令 (见部署输出)"
    fi
else
    echo "❌ 部署失败，请检查网络连接和私钥配置"
    exit 1
fi 