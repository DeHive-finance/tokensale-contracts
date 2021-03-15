pragma solidity ^0.6.12;

import "./DeHiveTokensale.sol";

contract DeHiveTokensaleMock is DeHiveTokensale {

    function initializeMock(address _treasury, address _dhv, address _usdt, address _dai, address _nux) public  {
        this.initialize(_treasury, _dhv, _usdt, _dai, _nux);
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