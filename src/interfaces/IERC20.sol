// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IERC20
 * @dev Interface for ERC20 standard token operations
 * Used for interacting with USDC and other stablecoins
 */
interface IERC20 {
    /**
     * @dev Returns the total token supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the account balance of another account with address `owner`
     */
    function balanceOf(address owner) external view returns (uint256);

    /**
     * @dev Transfers `value` amount of tokens to address `to`
     * Returns a boolean value indicating whether the operation succeeded
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Transfers `value` amount of tokens from address `from` to address `to`
     * Returns a boolean value indicating whether the operation succeeded
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Allows `spender` to withdraw from your account multiple times, up to the `value` amount
     * Returns a boolean value indicating whether the operation succeeded
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Returns the amount which `spender` is still allowed to withdraw from `owner`
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() external view returns (uint8);

    /**
     * @dev Returns the name of the token
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token
     */
    function symbol() external view returns (string memory);

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
} 