import os
import json
import time
import hashlib
from flask import Flask, request, jsonify, make_response
from web3 import Web3
from typing import Dict, Any, Optional

app = Flask(__name__)

# 配置
INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network/"
BUYER_WALLET_ADDRESS = "0x..."  # 实际部署的合约地址
SERVICE_RECIPIENT = "0x..."     # 服务提供商的收款地址

# 合约ABI（简化版）
BUYER_WALLET_ABI = [
    {
        "inputs": [{"name": "_paymentHash", "type": "bytes32"}],
        "name": "verifyX402Payment",
        "outputs": [
            {
                "components": [
                    {"name": "paymentHash", "type": "bytes32"},
                    {"name": "agent", "type": "address"},
                    {"name": "recipient", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "apiEndpoint", "type": "string"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "txHash", "type": "bytes32"}
                ],
                "name": "proof",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# Web3连接
w3 = Web3(Web3.HTTPProvider(INJECTIVE_TESTNET_RPC))
buyer_wallet_contract = w3.eth.contract(
    address=BUYER_WALLET_ADDRESS,
    abi=BUYER_WALLET_ABI
)

# 服务配置
SERVICES = {
    "/x402/weather": {
        "name": "Weather API",
        "price": 5000000,  # 5 USDT (6 decimals)
        "currency": "USDT",
        "description": "Real-time weather data"
    },
    "/x402/ai-model": {
        "name": "AI Model API",
        "price": 15000000,  # 15 USDT (6 decimals)
        "currency": "USDT",
        "description": "Advanced AI model inference"
    }
}

def parse_payment_proof(payment_proof_header: str) -> Optional[Dict[str, str]]:
    """
    解析Payment-Proof头部
    
    格式: injective hash=0x... agent=0x... timestamp=1234567890
    """
    try:
        parts = payment_proof_header.split()
        if parts[0] != "injective":
            return None
        
        proof_data = {}
        for part in parts[1:]:
            if '=' in part:
                key, value = part.split('=', 1)
                proof_data[key] = value
        
        return proof_data
    except:
        return None

def verify_payment_on_chain(payment_hash: str, expected_endpoint: str, expected_amount: int) -> bool:
    """
    在链上验证支付证明
    """
    try:
        # 调用合约验证支付证明
        proof_data = buyer_wallet_contract.functions.verifyX402Payment(payment_hash).call()
        
        # 检查支付信息
        if (proof_data[2].lower() != SERVICE_RECIPIENT.lower() or  # recipient
            proof_data[3] != expected_amount or                    # amount
            expected_endpoint not in proof_data[4]):               # apiEndpoint
            return False
        
        # 检查支付时间（不能太久之前，防止重放攻击）
        payment_time = proof_data[5]
        current_time = int(time.time())
        if current_time - payment_time > 3600:  # 1小时过期
            return False
        
        return True
        
    except Exception as e:
        print(f"Error verifying payment: {e}")
        return False

def create_x402_response(endpoint: str) -> tuple:
    """
    创建标准x402响应
    """
    service = SERVICES.get(endpoint)
    if not service:
        return jsonify({"error": "Service not found"}), 404
    
    # 生成nonce和过期时间
    nonce = int(time.time() * 1000)
    expiry = int(time.time()) + 3600  # 1小时过期
    
    # 创建Accept-Payment头部
    accept_payment = f"injective address={SERVICE_RECIPIENT} amount={service['price']} currency={service['currency']} endpoint={endpoint} nonce={nonce} expiry={expiry}"
    
    # 响应体包含详细的支付信息
    response_data = {
        "error": "Payment Required",
        "message": f"This API requires payment of {service['price'] / 10**6} {service['currency']}",
        "service": service['name'],
        "payment_info": {
            "recipient": SERVICE_RECIPIENT,
            "amount": service['price'],
            "currency": service['currency'],
            "endpoint": endpoint,
            "nonce": nonce,
            "expiry": expiry
        }
    }
    
    response = make_response(jsonify(response_data), 402)
    response.headers['Accept-Payment'] = accept_payment
    response.headers['Payment-Required'] = 'true'
    
    return response

@app.route('/x402/weather', methods=['GET'])
def weather_api():
    """天气API - 需要5 USDT支付"""
    endpoint = "/x402/weather"
    service = SERVICES[endpoint]
    
    # 检查是否提供了支付证明
    payment_proof = request.headers.get('Payment-Proof')
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_proof or not payment_hash:
        # 没有支付证明，返回402响应
        return create_x402_response(endpoint)
    
    # 解析支付证明
    proof_data = parse_payment_proof(payment_proof)
    if not proof_data:
        return jsonify({"error": "Invalid payment proof format"}), 400
    
    # 验证支付证明
    if not verify_payment_on_chain(payment_hash, endpoint, service['price']):
        return jsonify({"error": "Payment verification failed"}), 402
    
    # 支付验证成功，返回天气数据
    weather_data = {
        "location": "San Francisco",
        "temperature": 22,
        "humidity": 65,
        "condition": "Sunny",
        "timestamp": int(time.time()),
        "payment_verified": True,
        "payment_hash": payment_hash
    }
    
    return jsonify(weather_data)

@app.route('/x402/ai-model', methods=['GET'])
def ai_model_api():
    """AI模型API - 需要15 USDT支付"""
    endpoint = "/x402/ai-model"
    service = SERVICES[endpoint]
    
    # 检查是否提供了支付证明
    payment_proof = request.headers.get('Payment-Proof')
    payment_hash = request.headers.get('X-Payment-Hash')
    
    if not payment_proof or not payment_hash:
        # 没有支付证明，返回402响应
        return create_x402_response(endpoint)
    
    # 解析支付证明
    proof_data = parse_payment_proof(payment_proof)
    if not proof_data:
        return jsonify({"error": "Invalid payment proof format"}), 400
    
    # 验证支付证明
    if not verify_payment_on_chain(payment_hash, endpoint, service['price']):
        return jsonify({"error": "Payment verification failed"}), 402
    
    # 支付验证成功，返回AI模型结果
    ai_result = {
        "model": "GPT-4",
        "input": request.args.get('query', 'Hello, world!'),
        "output": "This is a simulated AI model response. Your payment has been verified and the service is now available.",
        "confidence": 0.95,
        "timestamp": int(time.time()),
        "payment_verified": True,
        "payment_hash": payment_hash
    }
    
    return jsonify(ai_result)

@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    """验证支付证明的独立端点"""
    data = request.get_json()
    
    if not data or 'payment_hash' not in data:
        return jsonify({"error": "Missing payment_hash"}), 400
    
    payment_hash = data['payment_hash']
    endpoint = data.get('endpoint', '/x402/weather')
    
    service = SERVICES.get(endpoint)
    if not service:
        return jsonify({"error": "Invalid endpoint"}), 400
    
    # 验证支付
    is_valid = verify_payment_on_chain(payment_hash, endpoint, service['price'])
    
    return jsonify({
        "valid": is_valid,
        "payment_hash": payment_hash,
        "endpoint": endpoint,
        "timestamp": int(time.time())
    })

@app.route('/services', methods=['GET'])
def list_services():
    """列出所有可用的服务"""
    services_info = {}
    for endpoint, service in SERVICES.items():
        services_info[endpoint] = {
            "name": service['name'],
            "price": f"{service['price'] / 10**6} {service['currency']}",
            "description": service['description'],
            "payment_required": True
        }
    
    return jsonify({
        "services": services_info,
        "payment_recipient": SERVICE_RECIPIENT,
        "protocol": "x402",
        "blockchain": "Injective EVM"
    })

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "protocol": "x402",
        "blockchain": "Injective EVM",
        "contract": BUYER_WALLET_ADDRESS,
        "timestamp": int(time.time())
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    print("🚀 Starting ACPay x402 Protocol Server")
    print("=" * 50)
    print(f"Contract Address: {BUYER_WALLET_ADDRESS}")
    print(f"Service Recipient: {SERVICE_RECIPIENT}")
    print(f"Available Services:")
    for endpoint, service in SERVICES.items():
        print(f"  {endpoint} - {service['name']} ({service['price'] / 10**6} {service['currency']})")
    print("=" * 50)
    
    # 检查配置
    if BUYER_WALLET_ADDRESS == "0x..." or SERVICE_RECIPIENT == "0x...":
        print("❌ Error: Please update contract addresses in the script")
        exit(1)
    
    app.run(host='0.0.0.0', port=5000, debug=True) 