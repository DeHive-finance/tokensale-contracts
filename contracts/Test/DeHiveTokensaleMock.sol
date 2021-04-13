// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../DeHiveTokensale.sol";

contract DeHiveTokensaleMock is DeHiveTokensale {

    uint256 public preSaleStart;
    uint256 public preSaleEnd;
    uint256 public publicSaleStart;
    uint256 public publicSaleEnd;


    function initialize(address _DAIToken,
        address _USDTToken,
        address _NUXToken,
        address treasury,
        address dhv) public initializer
    {
        DeHiveTokensale.initialize(treasury, dhv);
        USDTToken = _USDTToken;
        DAIToken = _DAIToken;
        NUXToken = _NUXToken;


        preSaleStart =    1616594400; //Mar 24 2021 14:00:00 GMT
        preSaleEnd =      1616803140; //Mar 26 2021 23:59:00 GMT

        publicSaleStart = 1618408800; //Apr 14 2021 14:00:00 GMT
        publicSaleEnd =   1618790340; //Apr 18 2021 23:59:00 GMT

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

    function setPreSale(uint256 start, uint256 end) public {
        preSaleStart = start;
        preSaleEnd = end;
    }

    function setPublicSale(uint256 start, uint256 end) public {
        publicSaleStart = start;
        publicSaleEnd = end;
    }

    function adminSetVestingStart(uint256 _vestingStart) override external {
        vestingStart = _vestingStart;
    }

    function adminAddPurchase(address _receiver, uint256 _amount) override external {
        purchased[_receiver] = purchased[_receiver].add(_amount);
    }

    function _isPreSale() override internal view returns (bool) {
        return (block.timestamp >= preSaleStart && block.timestamp < preSaleEnd);
    }

    function _isPublicSale() override internal view returns (bool) {
        return (block.timestamp >= publicSaleStart && block.timestamp < publicSaleEnd);
    }

    function _isPublicSaleOver() override internal view returns (bool) {
        return (block.timestamp >= publicSaleEnd);
    }


}