// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

// TODO leave funds on the contract until withdraw by the owner
// TODO Change events parameters
// TODO correct rate calculation (including NUX)
// TODO Correct rate setting up
// TODO NUX token withdraw
// TODO ETH withdraw
contract DeHiveTokensale is OwnableUpgradeable, PausableUpgradeable {

    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * EVENTS
     **/
    event DHVPurchased(address indexed user, address indexed purchaseToken, uint256 dhvAmount);
    event TokensReleased(uint256 amount);

    /**
     * CONSTANTS
     **/

    // *** TOKENSALE PARAMETERS START ***

    uint256 public constant PRE_SALE_START = 1616544000;    //Mar 24 2021 00:00:00 GMT
    uint256 public constant PRE_SALE_END = 1616716800;      //Mar 26 2021 00:00:00 GMT

    uint256 public constant PUBLIC_SALE_START = 1618358400; //Apr 14 2021 00:00:00 GMT
    uint256 public constant PUBLIC_SALE_END = 1618704000;   //Apr 18 2021 00:00:00 GMT

    uint256 public constant PRE_SALE_DHV_POOL =     400000 * 10 ** 18; // 5% DHV in total in presale pool
    uint256 public constant PRE_SALE_DHV_NUX_POOL = 100000 * 10 ** 18; // 
    uint256 public constant PUBLIC_SALE_DHV_POOL = 1200000 * 10 ** 18; // 12% DHV in public sale pool
    

    // *** TOKENSALE PARAMETERS END ***

    /***
     * STORAGE
     ***/

    // *** VESTING PARAMETERS START ***

    uint256 public vestingStart = 1625097600;    //Jul 01 2021 00:00:00 GMT
    uint256 public vestingDuration = 123 * 24 * 60 * 60; //123 days - until Oct 31 2021 00:00:00 GMT

    mapping (address => uint256) private _released;

    // *** VESTING PARAMETERS END ***

    address public DHVToken;
    address internal USDTToken = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address internal DAIToken = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal NUXToken = 0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c;

    mapping (address => uint256) investorsBalances;

    uint256 public purchasedWithNUX = 0;
    uint256 public purchasedPreSale = 0;
    uint256 public purchasedPublicSale = 0;

    uint256 public ETHRate;
    uint256 public USDTRate;
    uint256 public DAIRate;
    uint256 public NUXRate;

    address private _treasury;

    /***
     * MODIFIERS
     ***/

    /**
     * @dev Throws if called with not supported token.
     */
    modifier supportedCoin(address _token) {
        require(_token == USDTToken || _token == DAIToken, "Token not supported");
        _;
    }

    /**
    * @dev Throws if called when no ongoing pre-sale or public sale.
    */
    modifier onlySale() {
        require(_isPreSale() || _isPublicSale(), "Sale stages are over");
        _;
    }

    /**
    * @dev Throws if called when no ongoing pre-sale or public sale.
    */
    modifier onlyPreSale() {
        require(_isPreSale(), "Presale stages are over");
        _;
    }

    /***
     * INITIALIZER AND SETTINGS
     ***/

    /**
     * @notice Initializes the contract with correct addresses settings
     * @param treasury Address of the DeHive protocol's treasury where investments funds go to
     * @param dhv DHVToken mainnet address
     */
    function initialize(address treasury, address dhv) virtual public initializer {
        require(treasury != address(0), "Zero address");
        require(dhv != address(0), "Zero address");

        __Ownable_init();
        __Pausable_init();

        _treasury = treasury;
        DHVToken = dhv;
    }


    /***
     * PURCHASE FUNCTIONS
     ***/

    /**
     * @notice For default ETH receiving
     */
    receive() external virtual payable {
    }

    /**
     * @notice For purchase with allowed stablecoin (USDT and DAI)
     * @param ERC20token Address of the token to be paid in
     * @param ERC20amount Amount of the token to be paid in
     */
    function purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount) external onlySale supportedCoin(ERC20token) whenNotPaused {
        uint256 purchaseAmount = _calcPurchaseAmount(ERC20token, ERC20amount);
        
        if (_isPreSale()) {
            require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
            purchasedPreSale = purchasedPreSale.add(purchaseAmount);
        } else {
            require(purchaseAmount <= publicSaleAvailableDHV(), "Not enough DHV in sale pool");
            purchasedPublicSale = purchasedPublicSale.add(purchaseAmount);
        }
            
        IERC20Upgradeable(ERC20token).safeTransferFrom(_msgSender(), _treasury, ERC20amount); // send ERC20 to Treasury
        investorsBalances[_msgSender()] = investorsBalances[_msgSender()].add(purchaseAmount);

        emit DHVPurchased(_msgSender(), ERC20token, purchaseAmount);
    }

    /**
     * @notice For purchase with NUX token only. Available only for tokensale
     * @param nuxAmount Amount of the NUX token
     */
    function purchaseDHVwithNUX(uint256 nuxAmount) external onlyPreSale whenNotPaused {
        uint256 purchaseAmount = _calcPurchaseAmount(NUXToken, nuxAmount);

        require(purchasedWithNUX.add(purchaseAmount) <= PRE_SALE_DHV_NUX_POOL, "Not enough DHV in NUX pool");
        purchasedWithNUX = purchasedWithNUX.add(purchaseAmount);

        IERC20Upgradeable(NUXToken).safeTransferFrom(_msgSender(), _treasury, nuxAmount);
        investorsBalances[_msgSender()] = investorsBalances[_msgSender()].add(purchaseAmount);

        emit DHVPurchased(_msgSender(), NUXToken, purchaseAmount);
    }

    /**
     * @notice For purchase with ETH. ETH is left on the contract until withdrawn to treasury
     */
    function purchaseDHVwithETH() external payable onlySale whenNotPaused {
        require(msg.value > 0, "No ETH sent");
        uint256 purchaseAmount = _calcEthPurchaseAmount(msg.value);

        if (_isPreSale()) {
            require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
            purchasedPreSale = purchasedPreSale.add(purchaseAmount);
        } else {
            require(purchaseAmount <= publicSaleAvailableDHV(), "Not enough DHV in sale pool");
            purchasedPublicSale = purchasedPublicSale.add(purchaseAmount);
        }

        investorsBalances[_msgSender()] = investorsBalances[_msgSender()].add(purchaseAmount);

        emit DHVPurchased(_msgSender(), address(0), purchaseAmount);
    }

    /**
     * @notice Function to get available on public sale amount of DHV
     * @notice Unsold NUX pool and pre-sale pool go to public sale
     * @return The amount of the token released.
     */
    function publicSaleAvailableDHV() public view returns(uint256) {
        return PUBLIC_SALE_DHV_POOL.sub(purchasedPublicSale) +
               PRE_SALE_DHV_POOL.sub(purchasedPreSale) +
               PRE_SALE_DHV_NUX_POOL.sub(purchasedWithNUX);
    }


    /***
     * VIEW INTERFACE
     ***/

    /**
     * @return the amount of the token released.
     */
    function released(address investor) public view returns (uint256) {
        return _released[investor];
    }

    /**
     * @notice Transfers vested tokens to investor.
     */
    function release() public {
        uint256 unreleased = _releasableAmount(_msgSender());
        require(unreleased > 0, "TokenVesting: no tokens are due");
        _released[_msgSender()] = _released[_msgSender()].add(unreleased);
        IERC20Upgradeable(DHVToken).safeTransfer(_msgSender(), unreleased);
        emit TokensReleased(unreleased);
    }

    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     * @param investorAddress address for token release
     */
    function _releasableAmount(address investorAddress) private view returns (uint256) {
        return _vestedAmount(investorAddress).sub(_released[investorAddress]);
    }

    /**
     * @dev Calculates the amount that has already vested.
     * @param investorAddress address for token release
     */
    function _vestedAmount(address investorAddress) private view returns (uint256) {
        if (block.timestamp >= vestingStart.add(vestingDuration)) {
            return investorsBalances[investorAddress];
        } else {
            return investorsBalances[investorAddress].mul(block.timestamp.sub(vestingStart)).div(vestingDuration);
        }
    }

    /**
     * @dev Sets the rates for all currencies allowed for purchases. The rate is based on smallest fraction
     */
    function adminSetRates(uint256 _ethRate, uint256 _daiRate, uint256 _nuxRate) external onlyOwner {
        ETHRate = _ethRate;
        DAIRate = _daiRate;
        NUXRate = _nuxRate;
    }

    /**
     * @dev Allows owner to withdraw any token except DHV for refunds.
     * Useful in case of accidental transfers directly to the contract
     */
    function adminWithdrawERC20(address ERC20token, uint256 ERC20amount) external onlyOwner {
        require(ERC20token != DHVToken, "DHV withdrawal is forbidden");
        IERC20Upgradeable(ERC20token).safeTransfer(_msgSender(), ERC20amount);
    }

    /**
     * @dev Allows owner to withdraw ETH for refunds. Useful in case of accidental transfers directly to the contract
     */
    function adminWithdraw(address ERC20token, uint256 ERC20amount) external onlyOwner {
        require(ERC20token != DHVToken, "DHV withdrawal is forbidden");
        _msgSender().transfer(address(this).balance);
    }

    /**
    * @dev Allows owner to change the treasury address. Treasury is the address where all invested funds go to
    */
    function adminSetTreasury(address treasury) external onlyOwner {
        _treasury = treasury;
    }

    function _isPreSale() private returns (bool) {
        return (block.timestamp >= PRE_SALE_START && block.timestamp < PRE_SALE_END);
    }

    function _isPublicSale() private returns (bool) {
        return (block.timestamp >= PUBLIC_SALE_START && block.timestamp < PUBLIC_SALE_END);
    }

    function _calcPurchaseAmount(address _token, uint256 _amount) private view returns (uint256) {
        return _amount * DAIRate; //todo correct the calculation
    }

    function _calcEthPurchaseAmount(uint256 _amount) private view returns (uint256) {
        return _amount * DAIRate; //todo correct the calculation
    }
}