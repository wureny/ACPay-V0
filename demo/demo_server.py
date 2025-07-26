#!/usr/bin/env python3
"""
ACPay Demo Server - x402 Protocol Implementation
支持多种演示场景的API服务器
"""

import os
import json
import time
import hashlib
from flask import Flask, request, jsonify, make_response
from web3 import Web3
from typing import Dict, Any, Optional
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置
INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network/"
BUYER_WALLET_ADDRESS = "0x14ebB18cA52796a3c1A68FfC0E74374CD735f74A"  # 实际部署的合约地址
SERVICE_RECIPIENT = "0xc1E4400506b6178ff92eD8A353e996A3227eD877"     # 服务提供商的收款地址

# 演示服务配置 - 不同价格用于测试限额
DEMO_SERVICES = {
    "/api/weather": {
        "name": "天气数据 API",
        "price": 2000000,  # 2 USDT (6 decimals) - 低价服务
        "currency": "USDT",
        "description": "获取实时天气数据",
        "demo_data": {
            "location": "杭州",
            "temperature": 28,
            "humidity": 65,
            "condition": "多云",
            "wind_speed": "3.2 m/s",
            "timestamp": None
        }
    },
    "/api/ai-chat": {
        "name": "AI 对话 API",
        "price": 8000000,  # 8 USDT - 中等价格
        "currency": "USDT", 
        "description": "AI智能对话服务",
        "demo_data": {
            "model": "GPT-4",
            "input": None,
            "output": "这是AI模拟回复：您的支付已验证，服务正常运行。今天杭州天气不错，适合户外活动！",
            "confidence": 0.95
        }
    },
    "/api/premium-data": {
        "name": "高级数据 API",
        "price": 15000000,  # 15 USDT - 高价服务，测试单笔限额
        "currency": "USDT",
        "description": "高级金融数据分析",
        "demo_data": {
            "market": "crypto",
            "analysis": "基于区块链数据的深度分析报告",
            "confidence": 0.98,
            "report_url": "https://demo.acpay.com/report/12345"
        }
    },
    "/api/bulk-service": {
        "name": "批量处理 API", 
        "price": 25000000,  # 25 USDT - 超高价服务，测试日限额
        "currency": "USDT",
        "description": "大批量数据处理服务",
        "demo_data": {
            "job_id": "bulk_123456",
            "status": "processing",
            "estimated_completion": "30 minutes"
        }
    }
}

# Web3连接
w3 = Web3(Web3.HTTPProvider(INJECTIVE_TESTNET_RPC))

def create_x402_response(endpoint: str) -> tuple:
    """创建标准x402响应"""
    service = DEMO_SERVICES.get(endpoint)
    if not service:
        return jsonify({"error": "服务未找到"}), 404
    
    # 生成nonce和过期时间
    nonce = int(time.time() * 1000)
    expiry = int(time.time()) + 3600  # 1小时过期
    
    # 创建Accept-Payment头部
    accept_payment = (
        f"injective address={SERVICE_RECIPIENT} "
        f"amount={service['price']} "
        f"currency={service['currency']} "
        f"endpoint={endpoint} "
        f"nonce={nonce} "
        f"expiry={expiry}"
    )
    
    # 响应体包含详细的支付信息
    response_data = {
        "error": "Payment Required",
        "message": f"此API需要支付 {service['price'] / 10**6} {service['currency']}",
        "service": {
            "name": service['name'],
            "description": service['description'],
            "price": f"{service['price'] / 10**6} {service['currency']}"
        },
        "payment_info": {
            "recipient": SERVICE_RECIPIENT,
            "amount": service['price'],
            "currency": service['currency'],
            "endpoint": endpoint,
            "nonce": nonce,
            "expiry": expiry,
            "contract": BUYER_WALLET_ADDRESS
        },
        "x402_demo": {
            "status": "等待支付",
            "next_step": "Agent需要调用智能合约进行支付",
            "demo_scenario": "演示x402协议自动支付流程"
        }
    }
    
    response = make_response(jsonify(response_data), 402)
    response.headers['Accept-Payment'] = accept_payment
    response.headers['Payment-Required'] = 'true'
    response.headers['X-Demo-Service'] = service['name']
    
    logger.info(f"📨 返回402响应: {endpoint} - {service['name']} ({service['price'] / 10**6} USDT)")
    return response

def verify_payment_mock(payment_hash: str, endpoint: str, expected_amount: int) -> bool:
    """
    模拟支付验证 - 演示用
    在实际应用中，这里会调用智能合约验证支付
    """
    # 演示模式：简单验证payment_hash格式
    if payment_hash and payment_hash.startswith('0x') and len(payment_hash) == 66:
        logger.info(f"✅ 支付验证成功: {payment_hash[:10]}... for {endpoint}")
        return True
    
    logger.warning(f"❌ 支付验证失败: {payment_hash} for {endpoint}")
    return False

@app.route('/api/weather', methods=['GET'])
def weather_api():
    """天气API - 需要2 USDT支付"""
    endpoint = "/api/weather"
    service = DEMO_SERVICES[endpoint]
    
    # 检查支付证明
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_hash:
        return create_x402_response(endpoint)
    
    # 验证支付
    if not verify_payment_mock(payment_hash, endpoint, service['price']):
        return jsonify({
            "error": "支付验证失败",
            "payment_hash": payment_hash,
            "demo_note": "请确保支付hash格式正确(0x开头的66字符)"
        }), 402
    
    # 返回天气数据
    weather_data = service['demo_data'].copy()
    weather_data['timestamp'] = datetime.now().isoformat()
    weather_data['payment_verified'] = True
    weather_data['payment_hash'] = payment_hash
    weather_data['service_cost'] = f"{service['price'] / 10**6} {service['currency']}"
    
    logger.info(f"🌤️  天气数据已提供，支付: {payment_hash[:10]}...")
    return jsonify(weather_data)

@app.route('/api/ai-chat', methods=['POST'])
def ai_chat_api():
    """AI对话API - 需要8 USDT支付"""
    endpoint = "/api/ai-chat"
    service = DEMO_SERVICES[endpoint]
    
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_hash:
        return create_x402_response(endpoint)
    
    if not verify_payment_mock(payment_hash, endpoint, service['price']):
        return jsonify({
            "error": "支付验证失败", 
            "payment_hash": payment_hash
        }), 402
    
    # 获取用户输入
    user_input = request.json.get('message', '你好！') if request.json else '你好！'
    
    # 返回AI对话结果
    ai_data = service['demo_data'].copy()
    ai_data['input'] = user_input
    ai_data['output'] = f"AI回复：感谢您的支付！针对「{user_input}」，这是智能回复内容。"
    ai_data['timestamp'] = datetime.now().isoformat()
    ai_data['payment_verified'] = True
    ai_data['payment_hash'] = payment_hash
    ai_data['service_cost'] = f"{service['price'] / 10**6} {service['currency']}"
    
    logger.info(f"🤖 AI对话已完成，支付: {payment_hash[:10]}...")
    return jsonify(ai_data)

@app.route('/api/premium-data', methods=['GET'])
def premium_data_api():
    """高级数据API - 需要15 USDT支付（测试单笔限额）"""
    endpoint = "/api/premium-data"
    service = DEMO_SERVICES[endpoint]
    
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_hash:
        return create_x402_response(endpoint)
    
    if not verify_payment_mock(payment_hash, endpoint, service['price']):
        return jsonify({
            "error": "支付验证失败",
            "payment_hash": payment_hash
        }), 402
    
    # 返回高级数据
    data = service['demo_data'].copy()
    data['timestamp'] = datetime.now().isoformat()
    data['payment_verified'] = True
    data['payment_hash'] = payment_hash
    data['service_cost'] = f"{service['price'] / 10**6} {service['currency']}"
    data['demo_note'] = "这是高价服务，用于测试单笔限额功能"
    
    logger.info(f"💎 高级数据已提供，支付: {payment_hash[:10]}...")
    return jsonify(data)

@app.route('/api/bulk-service', methods=['POST'])
def bulk_service_api():
    """批量处理API - 需要25 USDT支付（测试日限额）"""
    endpoint = "/api/bulk-service"
    service = DEMO_SERVICES[endpoint]
    
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_hash:
        return create_x402_response(endpoint)
    
    if not verify_payment_mock(payment_hash, endpoint, service['price']):
        return jsonify({
            "error": "支付验证失败",
            "payment_hash": payment_hash
        }), 402
    
    # 返回批量处理结果
    data = service['demo_data'].copy()
    data['timestamp'] = datetime.now().isoformat()
    data['payment_verified'] = True
    data['payment_hash'] = payment_hash
    data['service_cost'] = f"{service['price'] / 10**6} {service['currency']}"
    data['demo_note'] = "这是超高价服务，用于测试日限额功能"
    
    logger.info(f"📦 批量服务已启动，支付: {payment_hash[:10]}...")
    return jsonify(data)

@app.route('/demo/services', methods=['GET'])
def list_demo_services():
    """列出所有演示服务"""
    services_info = {}
    for endpoint, service in DEMO_SERVICES.items():
        services_info[endpoint] = {
            "name": service['name'],
            "price": f"{service['price'] / 10**6} {service['currency']}",
            "price_wei": service['price'],
            "description": service['description'],
            "demo_purpose": get_demo_purpose(service['price'])
        }
    
    return jsonify({
        "services": services_info,
        "payment_recipient": SERVICE_RECIPIENT,
        "contract_address": BUYER_WALLET_ADDRESS,
        "protocol": "x402",
        "blockchain": "Injective EVM",
        "demo_info": {
            "low_price": "2 USDT - 正常支付测试",
            "medium_price": "8 USDT - 中等价格测试", 
            "high_price": "15 USDT - 单笔限额测试",
            "very_high_price": "25 USDT - 日限额测试"
        }
    })

def get_demo_purpose(price: int) -> str:
    """根据价格返回演示目的"""
    if price <= 5000000:  # <= 5 USDT
        return "正常支付流程演示"
    elif price <= 10000000:  # <= 10 USDT
        return "中等价格服务演示"
    elif price <= 20000000:  # <= 20 USDT
        return "单笔限额测试（默认10 USDT限额）"
    else:
        return "日限额测试（默认100 USDT限额）"

@app.route('/demo/status', methods=['GET'])
def demo_status():
    """演示系统状态"""
    return jsonify({
        "status": "运行中",
        "protocol": "x402",
        "blockchain": "Injective EVM测试网",
        "contract": BUYER_WALLET_ADDRESS,
        "recipient": SERVICE_RECIPIENT,
        "services_count": len(DEMO_SERVICES),
        "rpc_endpoint": INJECTIVE_TESTNET_RPC,
        "timestamp": datetime.now().isoformat(),
        "demo_ready": True
    })

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "API端点未找到",
        "available_endpoints": list(DEMO_SERVICES.keys()),
        "demo_endpoints": ["/demo/services", "/demo/status", "/health"]
    }), 404

if __name__ == '__main__':
    print("🚀 启动 ACPay x402 演示服务器")
    print("=" * 60)
    print(f"📋 合约地址: {BUYER_WALLET_ADDRESS}")
    print(f"💰 收款地址: {SERVICE_RECIPIENT}")
    print(f"🌐 区块链: Injective EVM 测试网")
    print("\n📚 可用演示服务:")
    for endpoint, service in DEMO_SERVICES.items():
        purpose = get_demo_purpose(service['price'])
        print(f"  {endpoint:<20} - {service['name']:<15} ({service['price'] / 10**6:>2} USDT) - {purpose}")
    
    print("\n🎯 演示场景:")
    print("  1. 正常支付 (2-8 USDT)")
    print("  2. 单笔限额测试 (15 USDT)")
    print("  3. 日限额测试 (25 USDT)")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5001, debug=False) 