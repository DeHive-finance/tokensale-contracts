// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../DeHiveTokensale.sol";

contract DeHiveTokensaleMock is DeHiveTokensale {

    function initializeMock(address _DAIToken,
        address _USDTToken,
        address _NUXToken,
        address treasury,
        address dhv) public initializer
    {
        DeHiveTokensale.initialize(treasury, dhv);
        USDTToken = _USDTToken;
        DAIToken = _DAIToken;
        NUXToken = _NUXToken;

    }
    function adminSetvestingStartMock(uint _vestingStart) public {
        this.adminSetVestingStart(_vestingStart);
    }
    function adminSetRatesMock(address _token, uint256 _rate) public {
        this.adminSetRates(_token, _rate);
    }
    function adminSetTreasuryMock(address _treasury) public {
        this.adminSetTreasury(_treasury);
    }
     function adminPauseMock() public {
        this.adminPause();
    }
    function adminUnpauseMock() public {
        this.adminUnpause();
    }
    function getUSDTToken() public view returns(address){
        return USDTToken;
    }
    function getDAIToken() public view returns(address){
        return DAIToken;
    }
    function getNUXToken() public view returns(address){
        return NUXToken;
    }
}