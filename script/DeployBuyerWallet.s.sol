// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/BuyerWallet.sol";

contract DeployBuyerWallet is Script {
    // ============ 网络配置 ============
    
    // Injective EVM Testnet 配置
    address constant INJECTIVE_TESTNET_USDT = 0xaDC7bcB5d8fe053Ef19b4E0C861c262Af6e0db60; // 官方测试网USDT (MTS USDT)
    uint256 constant TESTNET_DEFAULT_DAILY_LIMIT = 100 * 10**6;      // 100 USDT (6 decimals)
    uint256 constant TESTNET_DEFAULT_TRANSACTION_LIMIT = 10 * 10**6;  // 10 USDT (6 decimals)
    
    // Injective EVM Mainnet 配置 (预留，主网上线后需要更新真实地址)
    address constant INJECTIVE_MAINNET_USDT = 0x0000000000000000000000000000000000000000; // 待主网上线后更新
    uint256 constant MAINNET_DEFAULT_DAILY_LIMIT = 1000 * 10**6;     // 1000 USDT (6 decimals)
    uint256 constant MAINNET_DEFAULT_TRANSACTION_LIMIT = 100 * 10**6; // 100 USDT (6 decimals)
    
    // 部署者地址（从环境变量或私钥推导）
    address public deployer;
    
    // 部署的合约实例
    BuyerWallet public buyerWallet;
    
    function setUp() public {
        // 获取部署者地址
        deployer = vm.envOr("DEPLOYER_ADDRESS", vm.addr(vm.envUint("PRIVATE_KEY")));
        console.log("Deployer address:", deployer);
    }
    
    function run() public {
        // 检测当前网络
        uint256 chainId = block.chainid;
        console.log("Deploying to chain ID:", chainId);
        
        // 根据链ID选择配置
        (address usdtAddress, uint256 dailyLimit, uint256 transactionLimit) = getNetworkConfig(chainId);
        
        console.log("USDT Address:", usdtAddress);
        console.log("Default Daily Limit:", dailyLimit);
        console.log("Default Transaction Limit:", transactionLimit);
        
        // 开始部署
        vm.startBroadcast();
        
        // 部署BuyerWallet合约
        buyerWallet = new BuyerWallet(
            usdtAddress,
            dailyLimit,
            transactionLimit
        );
        
        console.log("BuyerWallet deployed at:", address(buyerWallet));
        console.log("Contract owner:", buyerWallet.owner());
        console.log("USDT token:", address(buyerWallet.USDT()));
        
        // 验证部署
        verifyDeployment();
        
        vm.stopBroadcast();
        
        // 输出部署信息
        logDeploymentInfo();
    }
    
    /**
     * @dev 根据链ID获取网络配置
     */
    function getNetworkConfig(uint256 chainId) internal pure returns (
        address usdtAddress,
        uint256 dailyLimit,
        uint256 transactionLimit
    ) {
        if (chainId == 1439) { // Injective EVM Testnet - 官方Chain ID
            return (
                INJECTIVE_TESTNET_USDT, // 官方测试网USDT地址
                TESTNET_DEFAULT_DAILY_LIMIT,
                TESTNET_DEFAULT_TRANSACTION_LIMIT
            );
        } else if (chainId == 2524) { // Injective EVM Mainnet (预留，coming soon)
            require(INJECTIVE_MAINNET_USDT != address(0), "Mainnet USDT address not configured yet");
            return (
                INJECTIVE_MAINNET_USDT,
                MAINNET_DEFAULT_DAILY_LIMIT,
                MAINNET_DEFAULT_TRANSACTION_LIMIT
            );
        } else {
            // 默认配置（用于本地测试）
            return (
                address(0x1234567890123456789012345678901234567890), // Mock USDT for local testing
                TESTNET_DEFAULT_DAILY_LIMIT,
                TESTNET_DEFAULT_TRANSACTION_LIMIT
            );
        }
    }
    
    /**
     * @dev 验证部署是否成功
     */
    function verifyDeployment() internal view {
        require(address(buyerWallet) != address(0), "BuyerWallet deployment failed");
        require(buyerWallet.owner() == deployer, "Owner not set correctly");
        require(address(buyerWallet.USDT()) != address(0), "USDT address not set");
        require(!buyerWallet.paused(), "Contract should not be paused initially");
        
        // 检查默认规则
        BuyerWallet.PaymentRules memory defaultRules = buyerWallet.getPaymentRules("");
        require(defaultRules.enabled, "Default rules should be enabled");
        require(defaultRules.dailyLimit > 0, "Default daily limit should be greater than 0");
        require(defaultRules.transactionLimit > 0, "Default transaction limit should be greater than 0");
        
        console.log("[SUCCESS] Deployment verification passed");
    }
    
    /**
     * @dev 输出部署信息
     */
    function logDeploymentInfo() internal view {
        console.log("\n=== ACPay Buyer Wallet Deployment Summary ===");
        console.log("Contract Address:", address(buyerWallet));
        console.log("Owner:", buyerWallet.owner());
        console.log("USDT Token:", address(buyerWallet.USDT()));
        console.log("Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
        
        // 获取默认规则信息
        BuyerWallet.PaymentRules memory rules = buyerWallet.getPaymentRules("");
        console.log("Default Daily Limit (USDT 6 decimals):", rules.dailyLimit);
        console.log("Default Transaction Limit (USDT 6 decimals):", rules.transactionLimit);
        console.log("Rules Enabled:", rules.enabled);
        
        console.log("=== Deployment Complete ===\n");
        
        // 输出部署后的操作建议
        console.log("=== Next Steps ===");
        console.log("1. Fund the contract with USDT:");
        console.log("First approve USDT spending:");
        console.log(string(abi.encodePacked("cast send ", _addressToString(address(buyerWallet.USDT())), " \"approve(address,uint256)\" ", _addressToString(address(buyerWallet)), " AMOUNT --rpc-url injective_testnet --private-key $PRIVATE_KEY")));
        console.log("Then deposit USDT:");
        console.log(string(abi.encodePacked("cast send ", _addressToString(address(buyerWallet)), " \"deposit(uint256)\" AMOUNT --rpc-url injective_testnet --private-key $PRIVATE_KEY")));
        console.log("2. Register AI agents:");
        console.log(string(abi.encodePacked("cast send ", _addressToString(address(buyerWallet)), " \"registerAgent(string,string,address)\" \"AGENT_ID\" \"AGENT_NAME\" SIGNER_ADDRESS --rpc-url injective_testnet --private-key $PRIVATE_KEY")));
        console.log("3. Verify deployment on block explorer:");
        console.log(string(abi.encodePacked("https://testnet.blockscout.injective.network/address/", _addressToString(address(buyerWallet)))));
    }
    
    /**
     * @dev 将地址转换为字符串
     */
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}

/**
 * @title DeployBuyerWalletWithMockUSDT
 * @dev 用于本地测试的部署脚本，包含Mock USDT合约
 */
contract DeployBuyerWalletWithMockUSDT is Script {
    // Mock USDT合约（用于测试）
    MockUSDT public mockUSDT;
    BuyerWallet public buyerWallet;
    
    function run() public {
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        vm.startBroadcast();
        
        // 部署Mock USDT
        mockUSDT = new MockUSDT();
        console.log("Mock USDT deployed at:", address(mockUSDT));
        
        // 部署BuyerWallet
        buyerWallet = new BuyerWallet(
            address(mockUSDT),
            100 * 10**6,  // 100 USDT daily limit
            10 * 10**6    // 10 USDT transaction limit
        );
        
        console.log("BuyerWallet deployed at:", address(buyerWallet));
        
        // 给部署者铸造一些测试USDT
        mockUSDT.mint(deployer, 10000 * 10**6); // 10,000 USDT
        console.log("Minted 10,000 USDT to deployer");
        
        vm.stopBroadcast();
    }
}

/**
 * @title MockUSDT
 * @dev 用于测试的Mock USDT合约
 */
contract MockUSDT {
    string public name = "Mock Tether USD";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
} 