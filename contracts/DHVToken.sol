// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DHV - token for DeHive protocol.
/// @notice Initial hard cap for 10M tokens.
contract DHVToken is ERC20, Ownable {

    uint256 public hardCap = 10000000 * 10 ** 18;
    /// @notice Contract's constructor
    /// @dev Mints 10M tokens for the deployer
    constructor () public ERC20("DeHive Token", "DHV") {

    }

    /// @notice Mint method for the exceptional cases
    /// @param _amount Amount of DHV tokens (with decimals) to be minted for the caller
    function mint(address _receiver, uint256 _amount) external onlyOwner {
        require(_receiver!=address(0), "Null address provided");
        require(_amount > 0, "Incorrect amount");
        require(totalSupply().add(_amount) <= hardCap, "Total supply exceeds hard cap");
        _mint(_receiver, _amount);
    }
}