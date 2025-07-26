#!/bin/bash

echo "🚀 ACPay x402 演示系统启动脚本"
echo "=================================="

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到python3，请先安装Python"
    exit 1
fi

# 检查依赖包
echo "📦 检查Python依赖包..."
python3 -c "import flask, web3, requests, eth_account" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  缺少依赖包，正在安装..."
    pip3 install flask web3 requests eth-account
fi

echo "✅ 依赖检查完成"

# 获取用户选择
echo ""
echo "请选择运行模式:"
echo "1. 启动API服务器 (demo_server.py)"
echo "2. 运行Agent演示 (demo_agent.py)"
echo "3. 同时启动服务器和演示"
echo ""

read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo "🌐 启动API服务器..."
        python3 demo_server.py
        ;;
    2)
        echo "🤖 运行Agent演示..."
        python3 demo_agent.py
        ;;
    3)
        echo "🔄 同时启动服务器和演示..."
        echo "正在后台启动API服务器..."
        python3 demo_server.py &
        SERVER_PID=$!
        sleep 3
        
        echo "正在启动Agent演示..."
        python3 demo_agent.py
        
        echo "停止API服务器..."
        kill $SERVER_PID 2>/dev/null
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo "🎉 演示完成!" 