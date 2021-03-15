pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC20 is ERC20, Ownable {

    constructor () public ERC20("TestToken", "TTK") {
        _mint(_msgSender(), 10000000000);
    }

    function burn(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Incorrect amount");
        _burn(_msgSender(), _amount);
    }


    function mint(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Incorrect amount");
        _mint(_msgSender(), _amount);
    }
}