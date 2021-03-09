// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DHV - token for DeHive protocol.
/// @notice Initial hard cap for 10M tokens.
contract DHVToken is ERC20, Ownable {

    /// @notice Contract's constructor
    /// @dev Mints 10M tokens for the deployer
    constructor () public ERC20("DeHive Token", "DHV") {
        _mint(_msgSender(), 10000000 * 10 ** 18);
    }

    /// @notice Burn method for the exceptional cases
    /// @param _amount Amount of DHV tokens (with decimals) to be burned from the caller
    function burn(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Incorrect amount");
        _burn(_msgSender(), _amount);
    }

    /// @notice Mint method for the exceptional cases
    /// @param _amount Amount of DHV tokens (with decimals) to be minted for the caller
    function mint(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Incorrect amount");
        _mint(_msgSender(), _amount);
    }
}