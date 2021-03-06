// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

contract DHVToken is ERC20Burnable {

    constructor () ERC20("DeHive Token", "DHV") {
        transfer(msg.sender, 10000000 * 10 ** 18);
    }
}