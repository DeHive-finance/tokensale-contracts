pragma solidity ^0.6.12;

import "../DeHiveTokensale.sol";

contract DeHiveTokensaleTest is DeHiveTokensale {
address private _treasury;

    // uint256 public constant PRE_SALE_START = now + 2 days;    //Mar 24 2021 00:00:00 GMT
    // uint256 public constant PRE_SALE_END = now + 5 days;      //Mar 26 2021 00:00:00 GMT

    // uint256 public constant PUBLIC_SALE_START = now + 10 days; //Apr 14 2021 00:00:00 GMT
    // uint256 public constant PUBLIC_SALE_END = now + 15 days;

    // uint256  override public constant PRE_SALE_DHV_POOL =    20; 
    // uint256  override public constant PRE_SALE_DHV_NUX_POOL = 20;  
    // uint256  override public constant PUBLIC_SALE_DHV_POOL =  20;

    function initialize(address _DAIToken,
        address _USDTToken,
        address _NUXToken,
        address treasury,
        uint _purchasedWithNUX,
        uint _purchasedPreSale,
        uint _purchasedPublicSale,
        address dhv) override public initializer {
        super.initialize(_DAIToken,
            _USDTToken,
            _NUXToken,
             treasury,
            _purchasedWithNUX,
            _purchasedPreSale,
            _purchasedPublicSale,
            dhv);
    }
}