#!/usr/bin/env python3
"""
ACPay Demo Agent - 演示AI代理自动支付功能
支持多种演示场景：正常支付、限额测试等
"""

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
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 配置
INJECTIVE_TESTNET_RPC = "https://k8s.testnet.json-rpc.injective.network/"
BUYER_WALLET_ADDRESS = "0x14ebB18cA52796a3c1A68FfC0E74374CD735f74A"
USDT_ADDRESS = "0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60"
DEMO_API_BASE = "http://localhost:5001"

@dataclass
class DemoScenario:
    """演示场景配置"""
    name: str
    agent_id: str
    endpoint: str
    expected_result: str
    description: str

# 演示场景配置
DEMO_SCENARIOS = [
    DemoScenario(
        name="正常支付",
        agent_id="weather-agent",
        endpoint="/api/weather",
        expected_result="success",
        description="演示2 USDT天气API正常支付流程"
    ),
    DemoScenario(
        name="中等价格支付",
        agent_id="ai-agent",
        endpoint="/api/ai-chat",
        expected_result="success",
        description="演示8 USDT AI对话API支付"
    ),
    DemoScenario(
        name="单笔限额测试",
        agent_id="premium-agent",
        endpoint="/api/premium-data",
        expected_result="limit_exceeded",
        description="演示15 USDT服务触发单笔限额（默认10 USDT）"
    ),
    DemoScenario(
        name="日限额测试",
        agent_id="bulk-agent",
        endpoint="/api/bulk-service",
        expected_result="daily_limit_exceeded",
        description="演示25 USDT服务触发日限额（默认100 USDT）"
    )
]

# 简化的合约ABI
BUYER_WALLET_ABI = [
    {
        "inputs": [
            {"name": "_agentId", "type": "string"},
            {"name": "_recipient", "type": "address"},
            {"name": "_amount", "type": "uint256"},
            {"name": "_metadata", "type": "string"},
            {"name": "_signature", "type": "bytes"},
            {"name": "_nonce", "type": "uint256"}
        ],
        "name": "payByAgent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_agentId", "type": "string"}
        ],
        "name": "getTodaySpending",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_agentId", "type": "string"}
        ],
        "name": "getPaymentRules",
        "outputs": [
            {
                "components": [
                    {"name": "dailyLimit", "type": "uint256"},
                    {"name": "transactionLimit", "type": "uint256"},
                    {"name": "enabled", "type": "bool"}
                ],
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

class DemoAgent:
    """演示Agent类"""
    
    def __init__(self, agent_id: str, private_key: str = None):
        self.agent_id = agent_id
        
        # 如果没有提供私钥，生成一个演示用的
        if not private_key:
            # 为演示生成确定性私钥（不要在生产环境使用！）
            seed = f"demo_agent_{agent_id}_{int(time.time() / 86400)}"  # 每天变化
            private_key = hashlib.sha256(seed.encode()).hexdigest()
        
        self.account = Account.from_key(private_key)
        self.w3 = Web3(Web3.HTTPProvider(INJECTIVE_TESTNET_RPC))
        
        # 初始化合约
        self.contract = self.w3.eth.contract(
            address=BUYER_WALLET_ADDRESS,
            abi=BUYER_WALLET_ABI
        )
        
        logger.info(f"🤖 初始化演示Agent: {agent_id}")
        logger.info(f"📝 签名地址: {self.account.address}")
    
    def call_api_with_x402_payment(self, endpoint: str, method: str = "GET", 
                                  data: Dict = None) -> Tuple[bool, Dict[str, Any]]:
        """
        调用支持x402协议的API
        """
        url = f"{DEMO_API_BASE}{endpoint}"
        
        logger.info(f"🌐 Agent {self.agent_id} 调用API: {endpoint}")
        
        try:
            # 第一次调用，预期收到402响应
            if method == "GET":
                response = requests.get(url)
            else:
                response = requests.post(url, json=data)
            
            if response.status_code == 402:
                # 收到402响应，解析支付信息
                payment_info = response.json()
                logger.info(f"📨 收到402响应: 需要支付 {payment_info['service']['price']}")
                
                # 模拟支付过程
                payment_result = self.simulate_payment(payment_info)
                
                if payment_result['success']:
                    # 支付成功，重新调用API
                    headers = {'X-Payment-Hash': payment_result['payment_hash']}
                    
                    if method == "GET":
                        response = requests.get(url, headers=headers)
                    else:
                        response = requests.post(url, json=data, headers=headers)
                    
                    if response.status_code == 200:
                        logger.info(f"✅ API调用成功，服务已获取")
                        return True, response.json()
                    else:
                        logger.error(f"❌ 支付后API调用失败: {response.status_code}")
                        return False, {"error": "支付后API调用失败", "details": response.text}
                else:
                    # 支付失败（可能是限额问题）
                    logger.warning(f"⚠️  支付失败: {payment_result['error']}")
                    return False, payment_result
            
            elif response.status_code == 200:
                # 不需要支付（可能是测试端点）
                logger.info(f"✅ API调用成功（无需支付）")
                return True, response.json()
            
            else:
                logger.error(f"❌ API调用失败: {response.status_code}")
                return False, {"error": f"HTTP {response.status_code}", "details": response.text}
        
        except Exception as e:
            logger.error(f"❌ API调用异常: {e}")
            return False, {"error": "网络异常", "details": str(e)}
    
    def simulate_payment(self, payment_info: Dict) -> Dict[str, Any]:
        """
        模拟智能合约支付过程
        """
        try:
            amount = payment_info['payment_info']['amount']
            recipient = payment_info['payment_info']['recipient']
            endpoint = payment_info['payment_info']['endpoint']
            
            logger.info(f"💳 模拟支付: {amount / 10**6} USDT 到 {recipient[:10]}...")
            
            # 检查支付规则
            rules_check = self.check_payment_rules(amount)
            if not rules_check['allowed']:
                return {
                    'success': False,
                    'error': rules_check['reason'],
                    'amount': amount,
                    'agent_id': self.agent_id
                }
            
            # 模拟智能合约调用（演示模式不实际发送交易）
            payment_hash = self.generate_mock_payment_hash(amount, recipient, endpoint)
            
            logger.info(f"✅ 支付模拟成功: {payment_hash[:10]}...")
            
            return {
                'success': True,
                'payment_hash': payment_hash,
                'amount': amount,
                'recipient': recipient,
                'agent_id': self.agent_id,
                'timestamp': int(time.time())
            }
            
        except Exception as e:
            logger.error(f"❌ 支付模拟失败: {e}")
            return {
                'success': False,
                'error': f"支付异常: {str(e)}",
                'agent_id': self.agent_id
            }
    
    def check_payment_rules(self, amount: int) -> Dict[str, Any]:
        """
        检查支付规则（模拟智能合约规则检查）
        """
        try:
            # 模拟获取规则（实际应用中从合约读取）
            default_daily_limit = 100 * 10**6  # 100 USDT
            default_tx_limit = 10 * 10**6      # 10 USDT
            
            # 模拟今日已消费（在实际应用中从合约读取）
            today_spent = self.get_simulated_daily_spending()
            
            logger.info(f"📊 规则检查 - 单笔限额: {default_tx_limit / 10**6} USDT, 日限额: {default_daily_limit / 10**6} USDT")
            logger.info(f"📊 今日已消费: {today_spent / 10**6} USDT, 本次金额: {amount / 10**6} USDT")
            
            # 检查单笔限额
            if amount > default_tx_limit:
                return {
                    'allowed': False,
                    'reason': f'超出单笔限额: {amount / 10**6} > {default_tx_limit / 10**6} USDT',
                    'limit_type': 'transaction_limit'
                }
            
            # 检查日限额
            if today_spent + amount > default_daily_limit:
                return {
                    'allowed': False,
                    'reason': f'超出日限额: {(today_spent + amount) / 10**6} > {default_daily_limit / 10**6} USDT',
                    'limit_type': 'daily_limit'
                }
            
            return {
                'allowed': True,
                'remaining_daily': default_daily_limit - today_spent - amount,
                'remaining_tx': default_tx_limit - amount
            }
            
        except Exception as e:
            logger.error(f"❌ 规则检查失败: {e}")
            return {
                'allowed': False,
                'reason': f'规则检查异常: {str(e)}',
                'limit_type': 'system_error'
            }
    
    def get_simulated_daily_spending(self) -> int:
        """
        模拟获取今日消费金额
        为了演示不同场景，根据agent_id返回不同的模拟值
        """
        spending_map = {
            'weather-agent': 0,          # 0 USDT - 正常支付
            'ai-agent': 2000000,         # 2 USDT - 中等价格测试
            'premium-agent': 0,          # 0 USDT - 单笔限额测试
            'bulk-agent': 80000000,      # 80 USDT - 日限额测试（80+25=105 > 100）
        }
        
        return spending_map.get(self.agent_id, 0)
    
    def generate_mock_payment_hash(self, amount: int, recipient: str, endpoint: str) -> str:
        """
        生成模拟支付哈希（演示用）
        """
        timestamp = int(time.time())
        data = f"{self.agent_id}_{amount}_{recipient}_{endpoint}_{timestamp}"
        return "0x" + hashlib.sha256(data.encode()).hexdigest()
    
    def get_spending_status(self) -> Dict[str, Any]:
        """
        获取消费状态
        """
        today_spent = self.get_simulated_daily_spending()
        daily_limit = 100 * 10**6  # 100 USDT
        
        return {
            'agent_id': self.agent_id,
            'today_spent': f"{today_spent / 10**6} USDT",
            'daily_limit': f"{daily_limit / 10**6} USDT",
            'remaining_limit': f"{(daily_limit - today_spent) / 10**6} USDT",
            'transaction_limit': "10 USDT",
            'signature_address': self.account.address
        }

def run_demo_scenario(scenario: DemoScenario) -> None:
    """运行单个演示场景"""
    print(f"\n{'='*60}")
    print(f"🎯 演示场景: {scenario.name}")
    print(f"📝 描述: {scenario.description}")
    print(f"🤖 Agent ID: {scenario.agent_id}")
    print(f"🌐 API端点: {scenario.endpoint}")
    print(f"{'='*60}")
    
    # 创建演示Agent
    agent = DemoAgent(scenario.agent_id)
    
    # 显示Agent状态
    status = agent.get_spending_status()
    print(f"📊 Agent状态:")
    print(f"   今日已消费: {status['today_spent']}")
    print(f"   日限额: {status['daily_limit']}")
    print(f"   剩余额度: {status['remaining_limit']}")
    print(f"   单笔限额: {status['transaction_limit']}")
    
    # 调用API
    print(f"\n🚀 开始API调用...")
    
    if scenario.endpoint == "/api/ai-chat":
        # AI对话需要POST请求
        success, result = agent.call_api_with_x402_payment(
            scenario.endpoint, 
            method="POST",
            data={"message": "今天杭州天气怎么样？"}
        )
    else:
        # 其他API使用GET请求
        success, result = agent.call_api_with_x402_payment(scenario.endpoint)
    
    # 显示结果
    print(f"\n📊 执行结果:")
    if success:
        print(f"✅ 成功: API调用完成")
        if 'payment_verified' in result:
            print(f"💳 支付已验证: {result.get('payment_hash', '')[:10]}...")
        print(f"📄 返回数据: {json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        print(f"❌ 失败: {result.get('error', '未知错误')}")
        if 'limit_type' in result:
            print(f"🚫 限制类型: {result['limit_type']}")
        print(f"📄 错误详情: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    print(f"{'='*60}")
    
    # 等待用户确认继续
    input("按Enter键继续下一个演示...")

def main():
    """主演示程序"""
    print("🚀 ACPay x402 演示系统")
    print("=" * 60)
    print("本演示将展示AI Agent自动支付的完整流程")
    print("包括：正常支付、单笔限额、日限额等场景")
    print("=" * 60)
    
    # 检查API服务器
    try:
        response = requests.get(f"{DEMO_API_BASE}/demo/status")
        if response.status_code == 200:
            print("✅ API服务器正在运行")
        else:
            print("❌ API服务器响应异常")
            return
    except:
        print("❌ 无法连接到API服务器，请先启动 demo_server.py")
        print("   运行命令: python demo_server.py")
        return
    
    print(f"📋 合约地址: {BUYER_WALLET_ADDRESS}")
    print(f"🌐 API服务器: {DEMO_API_BASE}")
    
    # 显示可用演示场景
    print(f"\n📚 可用演示场景:")
    for i, scenario in enumerate(DEMO_SCENARIOS, 1):
        print(f"  {i}. {scenario.name} - {scenario.description}")
    
    print(f"\n🎯 演示说明:")
    print("- 场景1和2应该支付成功")
    print("- 场景3应该触发单笔限额（15 USDT > 10 USDT限额）")
    print("- 场景4应该触发日限额（80+25=105 USDT > 100 USDT限额）")
    
    # 询问用户选择
    while True:
        try:
            choice = input(f"\n请选择演示场景 (1-{len(DEMO_SCENARIOS)}, 或输入 'all' 运行全部): ").strip()
            
            if choice.lower() == 'all':
                # 运行所有场景
                for scenario in DEMO_SCENARIOS:
                    run_demo_scenario(scenario)
                break
            
            elif choice.isdigit():
                index = int(choice) - 1
                if 0 <= index < len(DEMO_SCENARIOS):
                    run_demo_scenario(DEMO_SCENARIOS[index])
                    break
                else:
                    print(f"❌ 请输入1-{len(DEMO_SCENARIOS)}之间的数字")
            
            else:
                print("❌ 无效输入，请输入数字或 'all'")
        
        except KeyboardInterrupt:
            print("\n👋 演示已取消")
            break
    
    print("\n🎉 演示完成！")
    print("感谢体验 ACPay x402 自动支付系统")

if __name__ == '__main__':
    main() 