// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./interfaces/IERC20.sol";

/**
 * @title BuyerWallet
 * @dev 智能合约钱包，支持多Agent管理、规则控制和聚合支付
 * @notice 基于x402协议的AI代理支付管理系统
 * 
 * 核心功能：
 * 1. Agent ID管理 - 支持注册和管理多个AI代理（用ID标识，非地址）
 * 2. 规则限制 - 实现日限额、单笔限额等安全规则
 * 3. 签名验证 - Agent通过签名授权支付，无需持有资金私钥
 * 4. 延迟聚合支付 - 小额支付先暂存，达到阈值后统一结算
 * 5. 池子对接 - 自动识别seller池子并聚合支付
 * 6. x402支付 - 支持HTTP 402协议的自动支付
 */
contract BuyerWallet {    
    /// @dev 合约所有者（管理员）
    address public owner;
    
    /// @dev USDT代币合约地址
    IERC20 public immutable USDT;
    
    /// @dev 合约是否暂停
    bool public paused;
    
    /// @dev 聚合支付阈值（默认50 USDT）
    uint256 public aggregationThreshold = 50 * 10**6;
    
    
    /**
     * @dev AI代理信息结构体
     */
    struct AgentInfo {
        string agentId;            // 代理ID（字符串标识）
        string name;               // 代理名称
        address signerAddress;     // 代理签名地址（用于验证授权）
        bool isActive;             // 是否激活
        uint256 totalSpent;        // 总消费金额
        uint256 registeredAt;      // 注册时间
    }
    
    /**
     * @dev 支付规则结构体
     */
    struct PaymentRules {
        uint256 dailyLimit;        // 日限额 (USDT, 6 decimals)
        uint256 transactionLimit;  // 单笔限额 (USDT, 6 decimals)
        bool enabled;              // 规则是否启用
    }
    
    /**
     * @dev 日消费跟踪结构体
     */
    struct DailySpending {
        uint256 date;              // 日期 (timestamp / 86400)
        uint256 amount;            // 当日消费金额
    }
    
    /**
     * @dev 待聚合支付结构体
     */
    struct PendingPayment {
        string agentId;            // 发起支付的Agent ID
        address recipient;         // 接收方地址
        uint256 amount;            // 支付金额
        string metadata;           // 元数据
        uint256 timestamp;         // 创建时间
    }
    
    /**
     * @dev 批量支付结构体
     */
    struct BatchPayment {
        address recipient;         // 接收方地址
        uint256 amount;            // 支付金额
        string metadata;           // 元数据
    }
    
    /**
     * @dev x402支付信息结构体
     */
    struct X402PaymentInfo {
        string agentId;            // Agent ID
        address recipient;         // 接收方地址
        uint256 amount;            // 支付金额 (USDT, 6 decimals)
        string apiEndpoint;        // API端点
        uint256 nonce;             // 防重放nonce
        uint256 expiry;            // 过期时间
    }
    
    /**
     * @dev x402支付证明结构体
     */
    struct X402PaymentProof {
        bytes32 paymentHash;       // 支付哈希
        string agentId;            // Agent ID
        address recipient;         // 接收方地址
        uint256 amount;            // 支付金额
        string apiEndpoint;        // API端点
        uint256 timestamp;         // 支付时间戳
        bytes32 txHash;            // 交易哈希
    }
    
    // ============ 状态变量 ============
    
    /// @dev Agent ID到Agent信息的映射
    mapping(string => AgentInfo) public agents;
    
    /// @dev Agent ID到支付规则的映射
    mapping(string => PaymentRules) public agentRules;
    
    /// @dev Agent ID到日消费记录的映射
    mapping(string => DailySpending) public dailySpending;
    
    /// @dev 默认支付规则
    PaymentRules public defaultRules;
    
    /// @dev Agent ID列表
    string[] public agentList;
    
    /// @dev 待聚合支付队列
    PendingPayment[] public pendingPayments;
    
    /// @dev 接收方地址到待聚合金额的映射
    mapping(address => uint256) public pendingAmounts;
    
    /// @dev 池子地址列表（seller池子）
    address[] public poolAddresses;
    
    /// @dev 地址是否为池子地址
    mapping(address => bool) public isPoolAddress;
    
    /// @dev x402支付证明映射
    mapping(bytes32 => X402PaymentProof) public x402Proofs;
    
    /// @dev Agent签名nonce映射
    mapping(string => uint256) public agentNonces;
    
    // ============ 事件 ============
    
    event AgentRegistered(string indexed agentId, string name, address signer, address indexed owner, uint256 timestamp);
    event AgentUpdated(string indexed agentId, string name, address signer, bool isActive, uint256 timestamp);
    event RulesUpdated(string indexed agentId, uint256 dailyLimit, uint256 transactionLimit, bool enabled, uint256 timestamp);
    event PaymentMade(string indexed agentId, address indexed recipient, uint256 amount, string metadata, uint256 timestamp);
    event BatchPaymentMade(string indexed agentId, uint256 totalAmount, uint256 paymentCount, uint256 timestamp);
    event PaymentPending(string indexed agentId, address indexed recipient, uint256 amount, string metadata, uint256 timestamp);
    event PaymentAggregated(address indexed recipient, uint256 totalAmount, uint256 paymentCount, uint256 timestamp);
    event PoolAddressAdded(address indexed poolAddress, uint256 timestamp);
    event PoolAddressRemoved(address indexed poolAddress, uint256 timestamp);
    event X402PaymentMade(bytes32 indexed paymentHash, string indexed agentId, address indexed recipient, uint256 amount, uint256 timestamp);
    event ContractPaused(address indexed owner, uint256 timestamp);
    event ContractUnpaused(address indexed owner, uint256 timestamp);
    
    // ============ 修饰符 ============
    
    /**
     * @dev 只有合约所有者可以调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "BuyerWallet: caller is not the owner");
        _;
    }
    
    /**
     * @dev 只有注册的活跃Agent可以调用（通过签名验证）
     */
    modifier onlyValidAgent(string calldata agentId, bytes calldata signature, uint256 nonce) {
        require(agents[agentId].isActive, "BuyerWallet: agent not active");
        require(nonce == agentNonces[agentId] + 1, "BuyerWallet: invalid nonce");
        
        // 验证签名
        bytes32 hash = keccak256(abi.encodePacked(agentId, nonce, block.timestamp));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address signer = _recoverSigner(ethSignedMessageHash, signature);
        require(signer == agents[agentId].signerAddress, "BuyerWallet: invalid signature");
        
        // 更新nonce
        agentNonces[agentId] = nonce;
        _;
    }
    
    /**
     * @dev 验证地址有效性
     */
    modifier validAddress(address _address) {
        require(_address != address(0), "BuyerWallet: invalid address");
        _;
    }
    
    /**
     * @dev 验证金额有效性
     */
    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "BuyerWallet: invalid amount");
        _;
    }
    
    /**
     * @dev 合约未暂停时才能执行
     */
    modifier whenNotPaused() {
        require(!paused, "BuyerWallet: contract is paused");
        _;
    }
    
    // ============ 构造函数 ============
    
    /**
     * @dev 构造函数
     * @param _usdtAddress USDT代币地址
     * @param _dailyLimit 默认日限额
     * @param _transactionLimit 默认单笔限额
     */
    constructor(
        address _usdtAddress,
        uint256 _dailyLimit,
        uint256 _transactionLimit
    ) validAddress(_usdtAddress) {
        owner = msg.sender;
        USDT = IERC20(_usdtAddress);
        
        // 设置默认规则
        defaultRules = PaymentRules({
            dailyLimit: _dailyLimit,
            transactionLimit: _transactionLimit,
            enabled: true
        });
        
        emit RulesUpdated("", _dailyLimit, _transactionLimit, true, block.timestamp);
    }
    
    
    /**
     * @dev 注册新的AI代理
     * @param _agentId 代理ID
     * @param _name 代理名称
     * @param _signerAddress 代理签名地址
     */
    function registerAgent(
        string calldata _agentId,
        string calldata _name,
        address _signerAddress
    ) 
        external 
        onlyOwner 
        validAddress(_signerAddress) 
        whenNotPaused 
    {
        require(bytes(_agentId).length > 0, "BuyerWallet: agentId cannot be empty");
        require(bytes(_name).length > 0, "BuyerWallet: name cannot be empty");
        require(agents[_agentId].registeredAt == 0, "BuyerWallet: agent already registered");
        
        // 创建代理信息
        agents[_agentId] = AgentInfo({
            agentId: _agentId,
            name: _name,
            signerAddress: _signerAddress,
            isActive: true,
            totalSpent: 0,
            registeredAt: block.timestamp
        });
        
        // 添加到代理列表
        agentList.push(_agentId);
        
        // 设置默认规则
        agentRules[_agentId] = defaultRules;
        
        emit AgentRegistered(_agentId, _name, _signerAddress, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 更新代理信息
     * @param _agentId 代理ID
     * @param _name 新名称
     * @param _signerAddress 新签名地址
     * @param _isActive 是否激活
     */
    function updateAgent(
        string calldata _agentId,
        string calldata _name,
        address _signerAddress,
        bool _isActive
    ) 
        external 
        onlyOwner 
        validAddress(_signerAddress) 
    {
        require(agents[_agentId].registeredAt > 0, "BuyerWallet: agent not found");
        require(bytes(_name).length > 0, "BuyerWallet: name cannot be empty");
        
        agents[_agentId].name = _name;
        agents[_agentId].signerAddress = _signerAddress;
        agents[_agentId].isActive = _isActive;
        
        emit AgentUpdated(_agentId, _name, _signerAddress, _isActive, block.timestamp);
    }
    
    // ============ 规则管理功能 ============
    
    /**
     * @dev 设置支付规则
     * @param _agentId 代理ID（空字符串表示默认规则）
     * @param _dailyLimit 日限额
     * @param _transactionLimit 单笔限额
     * @param _enabled 是否启用
     */
    function setPaymentRules(
        string calldata _agentId,
        uint256 _dailyLimit,
        uint256 _transactionLimit,
        bool _enabled
    ) 
        external 
        onlyOwner 
    {
        require(_dailyLimit >= _transactionLimit, "BuyerWallet: daily limit must be >= transaction limit");
        
        PaymentRules memory newRules = PaymentRules({
            dailyLimit: _dailyLimit,
            transactionLimit: _transactionLimit,
            enabled: _enabled
        });
        
        if (bytes(_agentId).length == 0) {
            // 设置默认规则
            defaultRules = newRules;
        } else {
            // 设置特定代理规则
            require(agents[_agentId].registeredAt > 0, "BuyerWallet: agent not found");
            agentRules[_agentId] = newRules;
        }
        
        emit RulesUpdated(_agentId, _dailyLimit, _transactionLimit, _enabled, block.timestamp);
    }
    
    /**
     * @dev 获取代理的支付规则
     * @param _agentId 代理ID
     * @return 支付规则结构体
     */
    function getPaymentRules(string calldata _agentId) 
        external 
        view 
        returns (PaymentRules memory) 
    {
        if (agents[_agentId].registeredAt == 0) {
            return defaultRules;
        }
        return agentRules[_agentId];
    }
    
    // ============ 支付功能 ============
    
    /**
     * @dev Agent发起支付（需要签名验证）
     * @param _agentId Agent ID
     * @param _recipient 接收方地址
     * @param _amount 支付金额
     * @param _metadata 元数据
     * @param _signature Agent签名
     * @param _nonce 防重放nonce
     */
    function payByAgent(
        string calldata _agentId,
        address _recipient,
        uint256 _amount,
        string calldata _metadata,
        bytes calldata _signature,
        uint256 _nonce
    ) 
        external 
        onlyValidAgent(_agentId, _signature, _nonce)
        validAddress(_recipient) 
        validAmount(_amount) 
        whenNotPaused 
    {
        // 检查是否为池子地址，决定立即支付还是聚合支付
        if (isPoolAddress[_recipient]) {
            _addToPendingPayments(_agentId, _recipient, _amount, _metadata);
            _checkAndExecuteAggregation(_recipient);
        } else {
            _executeDirectPayment(_agentId, _recipient, _amount, _metadata);
        }
    }
    
    /**
     * @dev 直接支付（由用户调用，用于紧急情况）
     * @param _agentId Agent ID
     * @param _recipient 接收方地址
     * @param _amount 支付金额
     * @param _metadata 元数据
     */
    function payDirect(
        string calldata _agentId,
        address _recipient,
        uint256 _amount,
        string calldata _metadata
    ) 
        external 
        onlyOwner
        validAddress(_recipient) 
        validAmount(_amount) 
        whenNotPaused 
    {
        require(agents[_agentId].registeredAt > 0, "BuyerWallet: agent not found");
        _executeDirectPayment(_agentId, _recipient, _amount, _metadata);
    }
    
    /**
     * @dev 内部函数：执行直接支付
     */
    function _executeDirectPayment(
        string calldata _agentId,
        address _recipient,
        uint256 _amount,
        string calldata _metadata
    ) internal {
        // 验证支付规则
        require(_validatePayment(_agentId, _amount), "BuyerWallet: payment violates rules");
        
        // 检查合约余额
        require(USDT.balanceOf(address(this)) >= _amount, "BuyerWallet: insufficient contract balance");
        
        // 更新消费记录
        _updateSpending(_agentId, _amount);
        
        // 执行转账
        require(USDT.transfer(_recipient, _amount), "BuyerWallet: USDT transfer failed");
        
        emit PaymentMade(_agentId, _recipient, _amount, _metadata, block.timestamp);
    }
    
    /**
     * @dev 内部函数：添加到待聚合支付
     */
    function _addToPendingPayments(
        string calldata _agentId,
        address _recipient,
        uint256 _amount,
        string calldata _metadata
    ) internal {
        // 验证支付规则
        require(_validatePayment(_agentId, _amount), "BuyerWallet: payment violates rules");
        
        // 更新消费记录
        _updateSpending(_agentId, _amount);
        
        // 添加到待聚合支付队列
        pendingPayments.push(PendingPayment({
            agentId: _agentId,
            recipient: _recipient,
            amount: _amount,
            metadata: _metadata,
            timestamp: block.timestamp
        }));
        
        // 更新待聚合金额
        pendingAmounts[_recipient] += _amount;
        
        emit PaymentPending(_agentId, _recipient, _amount, _metadata, block.timestamp);
    }
    
    /**
     * @dev 内部函数：检查并执行聚合支付
     */
    function _checkAndExecuteAggregation(address _recipient) internal {
        if (pendingAmounts[_recipient] >= aggregationThreshold) {
            _executeAggregatedPayment(_recipient);
        }
    }
    
    /**
     * @dev 内部函数：执行聚合支付
     */
    function _executeAggregatedPayment(address _recipient) internal {
        uint256 totalAmount = pendingAmounts[_recipient];
        uint256 paymentCount = 0;
        
        // 检查合约余额
        require(USDT.balanceOf(address(this)) >= totalAmount, "BuyerWallet: insufficient contract balance");
        
        // 计算该接收方的支付数量
        for (uint256 i = 0; i < pendingPayments.length; i++) {
            if (pendingPayments[i].recipient == _recipient) {
                paymentCount++;
            }
        }
        
        // 清空待聚合金额
        pendingAmounts[_recipient] = 0;
        
        // 执行转账
        require(USDT.transfer(_recipient, totalAmount), "BuyerWallet: USDT transfer failed");
        
        // 清理已执行的待聚合支付
        _cleanupExecutedPayments(_recipient);
        
        emit PaymentAggregated(_recipient, totalAmount, paymentCount, block.timestamp);
    }
    
    /**
     * @dev 内部函数：清理已执行的待聚合支付
     */
    function _cleanupExecutedPayments(address _recipient) internal {
        uint256 writeIndex = 0;
        for (uint256 readIndex = 0; readIndex < pendingPayments.length; readIndex++) {
            if (pendingPayments[readIndex].recipient != _recipient) {
                if (writeIndex != readIndex) {
                    pendingPayments[writeIndex] = pendingPayments[readIndex];
                }
                writeIndex++;
            }
        }
        // 删除尾部元素
        for (uint256 i = writeIndex; i < pendingPayments.length; i++) {
            pendingPayments.pop();
        }
    }
    
    /**
     * @dev 手动触发聚合支付（由Owner调用）
     * @param _recipient 接收方地址
     */
    function forceAggregatePayment(address _recipient) 
        external 
        onlyOwner 
        validAddress(_recipient)
    {
        require(pendingAmounts[_recipient] > 0, "BuyerWallet: no pending payments for recipient");
        _executeAggregatedPayment(_recipient);
    }
    
    
    /**
     * @dev 添加池子地址
     * @param _poolAddress 池子地址
     */
    function addPoolAddress(address _poolAddress) 
        external 
        onlyOwner 
        validAddress(_poolAddress)
    {
        require(!isPoolAddress[_poolAddress], "BuyerWallet: pool address already exists");
        
        isPoolAddress[_poolAddress] = true;
        poolAddresses.push(_poolAddress);
        
        emit PoolAddressAdded(_poolAddress, block.timestamp);
    }
    
    /**
     * @dev 移除池子地址
     * @param _poolAddress 池子地址
     */
    function removePoolAddress(address _poolAddress) 
        external 
        onlyOwner 
        validAddress(_poolAddress)
    {
        require(isPoolAddress[_poolAddress], "BuyerWallet: pool address not found");
        
        isPoolAddress[_poolAddress] = false;
        
        // 从数组中移除
        for (uint256 i = 0; i < poolAddresses.length; i++) {
            if (poolAddresses[i] == _poolAddress) {
                poolAddresses[i] = poolAddresses[poolAddresses.length - 1];
                poolAddresses.pop();
                break;
            }
        }
        
        emit PoolAddressRemoved(_poolAddress, block.timestamp);
    }
    
    // ============ 内部验证函数 ============
    
    /**
     * @dev 验证支付是否符合规则
     */
    function _validatePayment(string calldata _agentId, uint256 _amount) internal view returns (bool) {
        PaymentRules memory rules = agentRules[_agentId];
        if (!rules.enabled) {
            return false;
        }
        
        // 检查单笔限额
        if (_amount > rules.transactionLimit) {
            return false;
        }
        
        // 检查日限额
        uint256 today = block.timestamp / 86400;
        DailySpending memory todaySpending = dailySpending[_agentId];
        
        uint256 todayTotal = (todaySpending.date == today) ? todaySpending.amount + _amount : _amount;
        
        return todayTotal <= rules.dailyLimit;
    }
    
    /**
     * @dev 更新消费记录
     */
    function _updateSpending(string calldata _agentId, uint256 _amount) internal {
        uint256 today = block.timestamp / 86400;
        DailySpending storage todaySpending = dailySpending[_agentId];
        
        if (todaySpending.date != today) {
            todaySpending.date = today;
            todaySpending.amount = _amount;
        } else {
            todaySpending.amount += _amount;
        }
        
        agents[_agentId].totalSpent += _amount;
    }
    
    /**
     * @dev 从签名中恢复签名者地址
     */
    function _recoverSigner(bytes32 _hash, bytes memory _signature) internal pure returns (address) {
        if (_signature.length != 65) {
            return address(0);
        }
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        return ecrecover(_hash, v, r, s);
    }
    
    // ============ 查询功能 ============
    
    /**
     * @dev 获取Agent总数
     */
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }
    
    /**
     * @dev 获取待聚合支付总数
     */
    function getPendingPaymentCount() external view returns (uint256) {
        return pendingPayments.length;
    }
    
    /**
     * @dev 获取池子地址总数
     */
    function getPoolAddressCount() external view returns (uint256) {
        return poolAddresses.length;
    }
    
    /**
     * @dev 获取Agent的今日消费
     */
    function getTodaySpending(string calldata _agentId) external view returns (uint256) {
        uint256 today = block.timestamp / 86400;
        DailySpending memory todaySpending = dailySpending[_agentId];
        
        return (todaySpending.date == today) ? todaySpending.amount : 0;
    }
    
    
    /**
     * @dev 设置聚合阈值
     * @param _threshold 新的聚合阈值
     */
    function setAggregationThreshold(uint256 _threshold) 
        external 
        onlyOwner 
        validAmount(_threshold)
    {
        aggregationThreshold = _threshold;
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender, block.timestamp);
    }
    
    /**
     * @dev 存入USDT到合约
     * @param _amount 存入金额
     */
    function deposit(uint256 _amount) 
        external 
        onlyOwner 
        validAmount(_amount) 
    {
        require(USDT.transferFrom(msg.sender, address(this), _amount), "BuyerWallet: USDT transfer failed");
    }
    
    /**
     * @dev 提取USDT从合约
     * @param _amount 提取金额
     */
    function withdraw(uint256 _amount) 
        external 
        onlyOwner 
        validAmount(_amount) 
    {
        require(USDT.balanceOf(address(this)) >= _amount, "BuyerWallet: insufficient contract balance");
        require(USDT.transfer(msg.sender, _amount), "BuyerWallet: USDT transfer failed");
    }
    
    /**
     * @dev 获取合约USDT余额
     */
    function getContractBalance() external view returns (uint256) {
        return USDT.balanceOf(address(this));
    }
} 