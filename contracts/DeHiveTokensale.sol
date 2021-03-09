// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

contract DeHiveTokensale is OwnableUpgradeable, PausableUpgradeable {

    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * EVENTS
     **/
    event DHVPurchase(address indexed token, uint256 indexed amount);
    event TokensReleased(uint256 amount);

    /**
     * CONSTANTS
     **/

    // *** TOKENSALE PARAMETERS START ***

    uint256 public constant PRE_SALE_START = 1616544000;    //Mar 24 2021 00:00:00 GMT
    uint256 public constant PRE_SALE_END = 1616716800;      //Mar 26 2021 00:00:00 GMT

    uint256 public constant PUBLIC_SALE_START = 1618358400; //Apr 14 2021 00:00:00 GMT
    uint256 public constant PUBLIC_SALE_END = 1618704000;   //Apr 18 2021 00:00:00 GMT

    uint256 internal constant PRE_SALE_DHV_POOL =     400000 * 10 ** 18; // 5% DHV in total in presale pool
    uint256 internal constant PRE_SALE_DHV_NUX_POOL = 100000 * 10 ** 18; // 
    uint256 internal constant PUBLIC_SALE_DHV_POOL = 1200000 * 10 ** 18; // 12% DHV in public sale pool
    

    // *** TOKENSALE PARAMETERS END ***

    /***
     * STORAGE
     ***/

    // *** VESTING PARAMETERS START ***

    uint256 private _vestingStart = 1625097600;    //Jul 01 2021 00:00:00 GMT
    uint256 private _vestingDuration = 123 * 24 * 60 * 60; //123 days - until Oct 31 2021 00:00:00 GMT

    address public DHVToken;
    address internal USDTToken = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address internal DAIToken = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal NUXToken = 0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c;


    mapping (address => uint256) private _released;

    // *** VESTING PARAMETERS START ***

    mapping (address => uint256) investorsBalances;

    uint256 public purchasedWithNUX = 0;
    uint256 public purchasedPreSale = 0;
    uint256 public purchasedPublicSale = 0;

    uint256 public ETHRate;
    uint256 public DAIRate;
    uint256 public NUXRate;

    address private _treasury;

    /***
     * MODIFIERS
     ***/

    /**
    * @dev Throws if called when no ongoing pre-sale or public sale.
    */
    modifier onlySale() {
        require(_isPreSale() || _isPublicSale());
        _;
    }

    /**
     * INITIALIZER AND SETTINGS
     **/

    /**
     * @notice Initializes the contract with correct addresses settings
     * @param treasury Address of the DeHive protocol's treasury where investments funds go to
     * @param dhv DHVToken mainnet address
     */
    function initialize(address treasury, address dhv) virtual public initializer {
        require(treasury != address(0), "Zero address");
        _treasury = treasury;
        DHVToken = dhv;
    }

    /**
     * @dev
     */
    function purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount) external onlySale whenNotPaused {
        require(ERC20token == DAIToken || ERC20token == NUXToken, "Not supported token");
        uint256 purchaseAmount;
        if (ERC20token == NUXToken) { // NUX Token is allowed only on pre-sale
            require(_isPreSale(), "Presale is not active");
            purchaseAmount = ERC20amount.mul(NUXRate);
            require(purchasedWithNUX.add(ERC20amount) <= PRE_SALE_DHV_NUX_POOL, "Not enough DHV in NUX pool");
            purchasedWithNUX = purchasedWithNUX.add(purchaseAmount);
        } else if (ERC20token == DAIToken) {
            purchaseAmount = ERC20amount.mul(DAIRate);
            if (_isPreSale()) {
                require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
                purchasedPreSale = purchasedPreSale.add(purchaseAmount);
            } else {
                require(
                    purchasedPublicSale.add(purchaseAmount) <=
                    PUBLIC_SALE_DHV_POOL.add(PRE_SALE_DHV_NUX_POOL.sub(purchasedWithNUX)), // unsold NUX pool goes to public sale
                    "Not enough DHV in presale pool"
                );
                purchasedPublicSale = purchasedPublicSale.add(purchaseAmount);
            }
            IERC20Upgradeable(ERC20token).safeTransferFrom(_msgSender(), _treasury, ERC20amount); // send ERC20 to Treasury
            investorsBalances[_msgSender()] = investorsBalances[_msgSender()].add(purchaseAmount);
        }
        emit DHVPurchase(ERC20token, ERC20amount);
    }

    function purchaseDHVwithETH(uint256 amount, address token) external payable onlySale whenNotPaused {
        // todo for ethereum purchase after erc20 tests
    }

    /**
     * @return the start time of the token vesting.
     */
    function start() public view returns (uint256) {
        return _vestingStart;
    }

    /**
     * @return the duration of the token vesting.
     */
    function duration() public view returns (uint256) {
        return _vestingDuration;
    }

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
        if (block.timestamp >= _vestingStart.add(_vestingDuration)) {
            return investorsBalances[investorAddress];
        } else {
            return investorsBalances[investorAddress].mul(block.timestamp.sub(_vestingStart)).div(_vestingDuration);
        }
    }

    /**
     * @dev Sets the rates for all currencies allowed for purchases. The rate is based on smallest fraction
     */
    function adminSetRates(uint256 ethRate, uint256 daiRate, uint256 nuxRate) external onlyOwner {
        ETHRate = ethRate;
        DAIRate = daiRate;
        NUXRate = nuxRate;
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
}