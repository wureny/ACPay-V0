import os
import json
import time
import requests
from web3 import Web3
from eth_account import Account
from typing import Dict, Any, Optional

# Injective EVM测试网配置
INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network/"
BUYER_WALLET_ADDRESS = "0x..."  # 部署后的合约地址
USDT_ADDRESS = "0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60"  # 官方测试网USDT地址

# 合约ABI（简化版，仅包含需要的方法）
BUYER_WALLET_ABI = [
    {
        "inputs": [
            {"name": "_recipient", "type": "address"},
            {"name": "_amount", "type": "uint256"},
            {"name": "_metadata", "type": "string"}
        ],
        "name": "pay",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_agentAddress", "type": "address"}],
        "name": "getDailySpending",
        "outputs": [
            {"name": "todaySpent", "type": "uint256"},
            {"name": "dailyLimit", "type": "uint256"},
            {"name": "remainingLimit", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "agent", "type": "address"},
            {"indexed": True, "name": "recipient", "type": "address"},
            {"name": "amount", "type": "uint256"},
            {"name": "metadata", "type": "string"},
            {"name": "timestamp", "type": "uint256"}
        ],
        "name": "PaymentMade",
        "type": "event"
    }
]

class AIAgent:
    """AI代理类，演示x402协议支付流程"""
    
    def __init__(self, private_key: str, agent_name: str = "Demo AI Agent"):
        """
        初始化AI代理
        
        Args:
            private_key: 代理的私钥
            agent_name: 代理名称
        """
        self.private_key = private_key
        self.agent_name = agent_name
        
        # 连接到Injective EVM
        self.w3 = Web3(Web3.HTTPProvider(INJECTIVE_TESTNET_RPC))
        
        # 获取代理账户
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        
        # 连接到BuyerWallet合约
        self.buyer_wallet = self.w3.eth.contract(
            address=BUYER_WALLET_ADDRESS,
            abi=BUYER_WALLET_ABI
        )
        
        print(f"🤖 AI Agent '{agent_name}' initialized")
        print(f"📍 Agent Address: {self.address}")
        print(f"💰 Contract Address: {BUYER_WALLET_ADDRESS}")
        print(f"🌐 Network: Injective EVM Testnet")
        print("-" * 50)
    
    def get_spending_status(self) -> Dict[str, Any]:
        """获取代理的消费状态"""
        try:
            result = self.buyer_wallet.functions.getDailySpending(self.address).call()
            return {
                "today_spent": result[0] / 10**6,  # 转换为USDC
                "daily_limit": result[1] / 10**6,
                "remaining_limit": result[2] / 10**6
            }
        except Exception as e:
            print(f"❌ Error getting spending status: {e}")
            return {}
    
    def pay_for_service(self, recipient: str, amount_usdc: float, metadata: str) -> Optional[str]:
        """
        通过智能钱包支付服务费用
        
        Args:
            recipient: 接收方地址
            amount_usdc: 支付金额（USDC）
            metadata: 支付元数据
            
        Returns:
            交易哈希或None（如果失败）
        """
        try:
            # 转换金额为wei（USDC使用6位小数）
            amount_wei = int(amount_usdc * 10**6)
            
            print(f"💳 Preparing payment...")
            print(f"   To: {recipient}")
            print(f"   Amount: {amount_usdc} USDC")
            print(f"   Metadata: {metadata}")
            
            # 构建交易
            transaction = self.buyer_wallet.functions.pay(
                recipient,
                amount_wei,
                metadata
            ).build_transaction({
                'from': self.address,
                'gas': 200000,
                'gasPrice': self.w3.to_wei('20', 'gwei'),
                'nonce': self.w3.eth.get_transaction_count(self.address),
            })
            
            # 签名交易
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.private_key)
            
            # 发送交易
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            print(f"📤 Transaction sent: {tx_hash.hex()}")
            
            # 等待交易确认
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                print(f"✅ Payment successful!")
                print(f"   Gas used: {receipt.gasUsed}")
                return tx_hash.hex()
            else:
                print(f"❌ Payment failed!")
                return None
                
        except Exception as e:
            print(f"❌ Payment error: {e}")
            return None
    
    def call_paid_api(self, api_endpoint: str, payment_amount: float) -> Optional[Dict]:
        """
        模拟调用付费API的完整x402流程
        
        Args:
            api_endpoint: API端点
            payment_amount: 支付金额（USDC）
            
        Returns:
            API响应数据或None
        """
        print(f"🌐 Calling API: {api_endpoint}")
        
        try:
            # 第一步：调用API，期望收到402响应
            response = requests.get(api_endpoint, timeout=10)
            
            if response.status_code == 402:
                print("💰 Received 402 Payment Required")
                
                # 解析支付信息
                payment_info = response.json()
                recipient = payment_info.get('recipient')
                required_amount = payment_info.get('amount', payment_amount)
                
                print(f"   Required payment: {required_amount} USDC to {recipient}")
                
                # 第二步：执行支付
                tx_hash = self.pay_for_service(
                    recipient,
                    required_amount,
                    f"API payment for {api_endpoint}"
                )
                
                if tx_hash:
                    # 第三步：重新调用API，带上支付证明
                    headers = {'Payment-Tx': tx_hash}
                    final_response = requests.get(api_endpoint, headers=headers, timeout=10)
                    
                    if final_response.status_code == 200:
                        print("✅ API call successful with payment!")
                        return final_response.json()
                    else:
                        print(f"❌ API call failed: {final_response.status_code}")
                        return None
                else:
                    print("❌ Payment failed, cannot access API")
                    return None
                    
            elif response.status_code == 200:
                print("✅ API call successful (no payment required)")
                return response.json()
            else:
                print(f"❌ API call failed: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            print(f"❌ API request error: {e}")
            return None
    
    def demo_scenario(self):
        """运行演示场景"""
        print(f"🎬 Starting Demo Scenario for {self.agent_name}")
        print("=" * 60)
        
        # 场景1：检查消费状态
        print("\n📊 Step 1: Check spending status")
        status = self.get_spending_status()
        if status:
            print(f"   Today spent: {status['today_spent']} USDC")
            print(f"   Daily limit: {status['daily_limit']} USDC")
            print(f"   Remaining: {status['remaining_limit']} USDC")
        
        # 场景2：模拟天气API调用
        print("\n🌤️ Step 2: Call Weather API")
        weather_data = self.call_paid_api(
            "https://demo-api.acpay.com/weather",
            5.0  # 5 USDC
        )
        if weather_data:
            print(f"   Weather data: {weather_data}")
        
        # 场景3：模拟AI模型API调用
        print("\n🧠 Step 3: Call AI Model API")
        ai_data = self.call_paid_api(
            "https://demo-api.acpay.com/ai-model",
            15.0  # 15 USDC - 这应该会失败（超过单笔限额）
        )
        if ai_data:
            print(f"   AI model data: {ai_data}")
        
        # 场景4：检查更新后的消费状态
        print("\n📊 Step 4: Check updated spending status")
        final_status = self.get_spending_status()
        if final_status:
            print(f"   Today spent: {final_status['today_spent']} USDC")
            print(f"   Remaining: {final_status['remaining_limit']} USDC")
        
        print("\n🎉 Demo completed!")

def main():
    """主函数"""
    print("🚀 ACPay AI Agent Demo")
    print("=" * 60)
    
    # 从环境变量获取私钥
    private_key = os.getenv('AGENT_PRIVATE_KEY')
    if not private_key:
        print("❌ Error: Please set AGENT_PRIVATE_KEY environment variable")
        print("   Example: export AGENT_PRIVATE_KEY=0x...")
        return
    
    # 检查合约地址配置
    if BUYER_WALLET_ADDRESS == "0x...":
        print("❌ Error: Please update BUYER_WALLET_ADDRESS in the script")
        print("   Deploy the contract first and update the address")
        return
    
    try:
        # 创建AI代理实例
        agent = AIAgent(private_key, "Weather & AI Agent")
        
        # 运行演示场景
        agent.demo_scenario()
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")

if __name__ == "__main__":
    main() 