// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/BuyerWallet.sol";

/**
 * @title DeployBNB
 * @dev Deploy script for BNB Chain testnet
 */
contract DeployBNB is Script {
    // BNB Chain testnet configuration
    address constant USDT_ADDRESS = 0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684; // BNB testnet USDT
    uint256 constant DEFAULT_DAILY_LIMIT = 100 * 10**18;      // 100 USDT (18 decimals on BSC)
    uint256 constant DEFAULT_TX_LIMIT = 10 * 10**18;          // 10 USDT (18 decimals on BSC)
    
    function setUp() public {}

    function run() public {
        // Get deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== BNB Chain Testnet Deployment ===");
        console.log("Chain ID: 97");
        console.log("Deployer:", deployer);
        console.log("USDT Address:", USDT_ADDRESS);
        console.log("Daily Limit:", DEFAULT_DAILY_LIMIT / 10**18, "USDT");
        console.log("Transaction Limit:", DEFAULT_TX_LIMIT / 10**18, "USDT");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy BuyerWallet contract
        BuyerWallet buyerWallet = new BuyerWallet(
            USDT_ADDRESS,
            DEFAULT_DAILY_LIMIT,
            DEFAULT_TX_LIMIT
        );
        
        vm.stopBroadcast();
        
        // Output deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("BuyerWallet deployed to:", address(buyerWallet));
        console.log("Transaction hash: (check your terminal)");
        
        // Verify deployment
        console.log("\n=== Verify Deployment ===");
        console.log("Owner:", buyerWallet.owner());
        console.log("USDT Token:", address(buyerWallet.USDT()));
        console.log("Aggregation Threshold:", buyerWallet.aggregationThreshold() / 10**18, "USDT");
        
        // Output deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network: BNB Chain Testnet (Chain ID: 97)");
        console.log("Deployer:", deployer);
        console.log("BuyerWallet:", address(buyerWallet));
        console.log("USDT Token:", USDT_ADDRESS);
        console.log("Block Number:", block.number);
        console.log("Timestamp:", block.timestamp);
        
        // Output BSCScan verification command
        console.log("\n=== BSCScan Verification Command ===");
        console.log("Use the following command to verify on BSCScan:");
        console.log("forge verify-contract --chain bnb_testnet");
        console.log("--constructor-args $(cast abi-encode");
        console.log("\"constructor(address,uint256,uint256)\"");
        console.log(USDT_ADDRESS, DEFAULT_DAILY_LIMIT, DEFAULT_TX_LIMIT, ")");
        console.log(vm.toString(address(buyerWallet)));
        console.log("src/BuyerWallet.sol:BuyerWallet");
    }
} 