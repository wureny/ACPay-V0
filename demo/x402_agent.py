import os
import json
import time
import requests
import hashlib
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass

# Injective EVM测试网配置
INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network/"
BUYER_WALLET_ADDRESS = "0x..."  # 部署后的合约地址
USDT_ADDRESS = "0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60"

@dataclass
class X402PaymentInfo:
    """x402支付信息"""
    agent_id: str
    recipient: str
    amount: int
    currency: str
    api_endpoint: str
    nonce: int
    expiry: int

@dataclass
class X402PaymentProof:
    """x402支付证明"""
    payment_hash: str
    agent_id: str
    recipient: str
    amount: int
    api_endpoint: str
    timestamp: int
    tx_hash: str

# 合约ABI（更新以匹配新的Agent ID架构）
BUYER_WALLET_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "_usdtAddress", "type": "address"},
            {"internalType": "uint256", "name": "_dailyLimit", "type": "uint256"},
            {"internalType": "uint256", "name": "_transactionLimit", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_agentId", "type": "string"},
            {"internalType": "address", "name": "_recipient", "type": "address"},
            {"internalType": "uint256", "name": "_amount", "type": "uint256"},
            {"internalType": "string", "name": "_metadata", "type": "string"},
            {"internalType": "bytes", "name": "_signature", "type": "bytes"},
            {"internalType": "uint256", "name": "_nonce", "type": "uint256"}
        ],
        "name": "payByAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_agentId", "type": "string"},
            {"internalType": "address", "name": "_recipient", "type": "address"},
            {"internalType": "uint256", "name": "_amount", "type": "uint256"},
            {"internalType": "string", "name": "_metadata", "type": "string"}
        ],
        "name": "payDirect",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_agentId", "type": "string"}
        ],
        "name": "getTodaySpending",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_agentId", "type": "string"}
        ],
        "name": "getPaymentRules",
        "outputs": [
            {"components": [
                {"internalType": "uint256", "name": "dailyLimit", "type": "uint256"},
                {"internalType": "uint256", "name": "transactionLimit", "type": "uint256"},
                {"internalType": "bool", "name": "enabled", "type": "bool"}
            ], "internalType": "struct BuyerWallet.PaymentRules", "name": "", "type": "tuple"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getContractBalance",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "", "type": "string"}
        ],
        "name": "agentNonces",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "string", "name": "agentId", "type": "string"},
            {"indexed": True, "internalType": "address", "name": "recipient", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "metadata", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "PaymentMade",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "string", "name": "agentId", "type": "string"},
            {"indexed": True, "internalType": "address", "name": "recipient", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "metadata", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "PaymentPending",
        "type": "event"
    }
]

class X402Agent:
    """x402协议兼容的AI代理"""
    
    def __init__(self, agent_id: str, private_key: str, name: str):
        """
        初始化Agent
        
        Args:
            agent_id: Agent ID字符串标识
            private_key: 签名私钥（用于授权支付，不持有资金）
            name: Agent名称
        """
        self.agent_id = agent_id
        self.private_key = private_key
        self.name = name
        self.account = Account.from_key(private_key)
        
        # 初始化Web3连接
        self.w3 = Web3(Web3.HTTPProvider(INJECTIVE_TESTNET_RPC))
        if not self.w3.is_connected():
            raise Exception("Failed to connect to Injective testnet")
        
        # 初始化合约
        self.buyer_wallet = self.w3.eth.contract(
            address=BUYER_WALLET_ADDRESS,
            abi=BUYER_WALLET_ABI
        )
        
        print(f"🤖 Agent '{self.name}' (ID: {self.agent_id}) initialized")
        print(f"   Signer Address: {self.account.address}")
        print(f"   Network: Injective EVM Testnet")
    
    def generate_signature(self, nonce: int) -> bytes:
        """
        生成支付授权签名
        
        Args:
            nonce: 防重放nonce
            
        Returns:
            签名字节
        """
        # 构造签名消息（与合约中的验证逻辑匹配）
        timestamp = int(time.time())
        message_hash = Web3.keccak(
            Web3.solidity_keccak(['string', 'uint256', 'uint256'], 
                                [self.agent_id, nonce, timestamp])
        )
        
        # 创建以太坊消息格式
        message = encode_defunct(message_hash)
        
        # 签名
        signed_message = self.account.sign_message(message)
        
        # 返回签名字节（r + s + v格式）
        return signed_message.signature
    
    def get_next_nonce(self) -> int:
        """获取下一个可用的nonce"""
        try:
            current_nonce = self.buyer_wallet.functions.agentNonces(self.agent_id).call()
            return current_nonce + 1
        except Exception as e:
            print(f"⚠️  Warning: Could not get nonce from contract: {e}")
            # 如果无法获取nonce，从1开始
            return 1
    
    def get_spending_status(self) -> Optional[Dict[str, Any]]:
        """获取Agent的消费状态"""
        try:
            # 获取今日消费
            today_spent = self.buyer_wallet.functions.getTodaySpending(self.agent_id).call()
            
            # 获取支付规则
            rules = self.buyer_wallet.functions.getPaymentRules(self.agent_id).call()
            daily_limit = rules[0]
            transaction_limit = rules[1]
            enabled = rules[2]
            
            # 转换为USDT单位（6位小数）
            today_spent_usdt = today_spent / 10**6
            daily_limit_usdt = daily_limit / 10**6
            transaction_limit_usdt = transaction_limit / 10**6
            remaining_limit_usdt = max(0, daily_limit_usdt - today_spent_usdt)
            
            return {
                "agent_id": self.agent_id,
                "today_spent": today_spent_usdt,
                "daily_limit": daily_limit_usdt,
                "transaction_limit": transaction_limit_usdt,
                "remaining_limit": remaining_limit_usdt,
                "rules_enabled": enabled
            }
        except Exception as e:
            print(f"❌ Error getting spending status: {e}")
            return None
    
    def execute_payment(self, recipient: str, amount_usdt: float, metadata: str = "") -> Optional[str]:
        """
        执行支付（通过签名授权）
        
        Args:
            recipient: 接收方地址
            amount_usdt: 支付金额（USDT）
            metadata: 元数据
            
        Returns:
            交易哈希或None
        """
        try:
            # 转换金额为wei单位（6位小数）
            amount_wei = int(amount_usdt * 10**6)
            
            # 获取nonce
            nonce = self.get_next_nonce()
            
            # 生成签名
            signature = self.generate_signature(nonce)
            
            print(f"💰 Executing payment...")
            print(f"   Agent ID: {self.agent_id}")
            print(f"   Recipient: {recipient}")
            print(f"   Amount: {amount_usdt} USDT")
            print(f"   Nonce: {nonce}")
            
            # 调用合约的payByAgent函数
            # 注意：这需要用户（Owner）的私钥来实际发送交易
            # 在实际应用中，这会通过后端服务或多签机制处理
            print("⚠️  Note: In production, this would require the wallet owner to approve the transaction")
            print("   For demo purposes, this shows the payment authorization signature")
            
            return f"0x{signature.hex()}"  # 返回签名作为演示
            
        except Exception as e:
            print(f"❌ Payment execution failed: {e}")
            return None
    
    def parse_x402_response(self, response) -> Optional[X402PaymentInfo]:
        """解析x402协议响应"""
        if response.status_code != 402:
            return None
        
        try:
            # 解析Accept-Payment头
            accept_payment = response.headers.get('Accept-Payment', '')
            if not accept_payment.startswith('injective-evm'):
                return None
            
            # 解析响应体中的支付信息
            payment_data = response.json()
            
            return X402PaymentInfo(
                agent_id=self.agent_id,
                recipient=payment_data['recipient'],
                amount=int(payment_data['amount']),
                currency=payment_data['currency'],
                api_endpoint=payment_data['api_endpoint'],
                nonce=payment_data['nonce'],
                expiry=payment_data['expiry']
            )
        except Exception as e:
            print(f"❌ Error parsing x402 response: {e}")
            return None
    
    def call_x402_api(self, url: str, max_amount: float = None) -> Optional[Dict[str, Any]]:
        """
        调用支持x402协议的API
        
        Args:
            url: API端点URL
            max_amount: 最大支付金额限制
            
        Returns:
            API响应数据或None
        """
        try:
            print(f"🌐 Calling x402 API: {url}")
            
            # 第一次调用
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                print("✅ API call successful (no payment required)")
                return response.json()
            
            elif response.status_code == 402:
                print("💳 Payment required (402 status)")
                
                # 解析支付信息
                payment_info = self.parse_x402_response(response)
                if not payment_info:
                    print("❌ Failed to parse payment information")
                    return None
                
                amount_usdt = payment_info.amount / 10**6
                print(f"   Required payment: {amount_usdt} USDT")
                print(f"   Recipient: {payment_info.recipient}")
                
                # 检查金额限制
                if max_amount and amount_usdt > max_amount:
                    print(f"❌ Payment amount exceeds limit ({max_amount} USDT)")
                    return None
                
                # 执行支付授权
                payment_signature = self.execute_payment(
                    payment_info.recipient,
                    amount_usdt,
                    f"x402 payment for {payment_info.api_endpoint}"
                )
                
                if not payment_signature:
                    print("❌ Payment authorization failed")
                    return None
                
                print("✅ Payment authorized successfully")
                
                # 生成支付证明头
                payment_proof_header = f"injective-evm signature={payment_signature}"
                
                # 重新调用API，带上支付证明
                headers = {
                    'Payment-Proof': payment_proof_header
                }
                
                print("🔄 Retrying API call with payment proof...")
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    print("✅ API call successful with payment")
                    return response.json()
                else:
                    print(f"❌ API call failed: {response.status_code}")
                    return None
            
            else:
                print(f"❌ API call failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error calling x402 API: {e}")
            return None
    
    def demo_x402_scenario(self):
        """演示x402协议的完整流程"""
        print(f"\n🎬 Starting x402 Protocol Demo for Agent: {self.name}")
        print("=" * 60)
        
        # 场景1：检查Agent状态
        print("\n📊 Step 1: Check Agent spending status")
        status = self.get_spending_status()
        if status:
            print(f"   Daily limit: {status['daily_limit']} USDT")
            print(f"   Transaction limit: {status['transaction_limit']} USDT")
            print(f"   Today spent: {status['today_spent']} USDT")
            print(f"   Remaining: {status['remaining_limit']} USDT")
            print(f"   Rules enabled: {status['rules_enabled']}")
        else:
            print("   ⚠️  Could not retrieve status (contract not configured)")
        
        # 场景2：调用需要付费的天气API
        print("\n🌤️  Step 2: Call x402 Weather API")
        weather_data = self.call_x402_api(
            "https://demo-api.acpay.com/x402/weather",
            max_amount=5.0  # 最多支付5 USDT
        )
        if weather_data:
            print(f"   Weather data received: {json.dumps(weather_data, indent=2)}")
        
        # 场景3：调用支持x402的AI模型API
        print("\n🧠 Step 3: Call x402 AI Model API")
        ai_data = self.call_x402_api(
            "https://demo-api.acpay.com/x402/ai-model",
            max_amount=15.0  # 最多支付15 USDT
        )
        if ai_data:
            print(f"   AI model data received: {json.dumps(ai_data, indent=2)}")
        
        # 场景4：检查更新后的消费状态
        print("\n📊 Step 4: Check updated spending status")
        final_status = self.get_spending_status()
        if final_status:
            print(f"   Today spent: {final_status['today_spent']} USDT")
            print(f"   Remaining: {final_status['remaining_limit']} USDT")
        
        print("\n🎉 x402 Protocol Demo completed!")

def main():
    """主函数"""
    print("🚀 ACPay x402 Protocol AI Agent Demo")
    print("=" * 60)
    
    # 从环境变量获取配置
    agent_private_key = os.getenv('AGENT_PRIVATE_KEY')
    if not agent_private_key:
        print("❌ Error: Please set AGENT_PRIVATE_KEY environment variable")
        print("   Example: export AGENT_PRIVATE_KEY=0x...")
        return
    
    # 检查合约地址配置
    if BUYER_WALLET_ADDRESS == "0x...":
        print("❌ Error: Please update BUYER_WALLET_ADDRESS in the script")
        print("   Deploy the contract first and update the address")
        return
    
    try:
        # 创建x402协议AI代理实例
        agent = X402Agent(
            agent_id="weather-ai-agent",  # 使用字符串ID
            private_key=agent_private_key,
            name="Weather & AI Agent"
        )
        
        # 运行x402协议演示场景
        agent.demo_x402_scenario()
        
    except Exception as e:
        print(f"❌ x402 Demo failed: {e}")

if __name__ == "__main__":
    main() 