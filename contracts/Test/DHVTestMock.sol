// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../DHVToken.sol";

contract DHVTestMock is DHVToken{
    
    function setHardcap(uint256 _hardcap) public{
        hardCap=_hardcap;
    }
    function mintMock(address _receiver, uint _amount) public{
        this.mint(_receiver, _amount);
    }

}