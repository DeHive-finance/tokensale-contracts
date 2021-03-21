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
    event DHVPurchased(address indexed user, address indexed purchaseToken, uint256 dhvAmount);
    event TokensClaimed(address indexed user, uint256 dhvAmount);

    /**
     * CONSTANTS
     **/

    // *** TOKENSALE PARAMETERS START ***
    uint256 public constant PRECISION = 1000000; //Up to 0.000001
    uint256 public constant PRE_SALE_START =    1616594400; //Mar 24 2021 14:00:00 GMT
    uint256 public constant PRE_SALE_END =      1616803140; //Mar 26 2021 23:59:00 GMT

    uint256 public constant PUBLIC_SALE_START = 1618408800; //Apr 14 2021 14:00:00 GMT
    uint256 public constant PUBLIC_SALE_END =   1618790340; //Apr 18 2021 23:59:00 GMT

    uint256 public constant PRE_SALE_DHV_POOL =     450000 * 10 ** 18; // 5% DHV in total in presale pool
    uint256 public constant PRE_SALE_DHV_NUX_POOL =  50000 * 10 ** 18; // 
    uint256 public constant PUBLIC_SALE_DHV_POOL = 1100000 * 10 ** 18; // 11% DHV in public sale pool
    uint256 private constant WITHDRAWAL_PERIOD = 365 * 24 * 60 * 60; //1 year
    // *** TOKENSALE PARAMETERS END ***


    /***
     * STORAGE
     ***/

    uint256 public maxTokensAmount;

    // *** VESTING PARAMETERS START ***

    uint256 public vestingStart;
    uint256 public vestingDuration; /*= 305 * 24 * 60 * 60*/ //305 days - until Apr 30 2021 00:00:00 GMT
    
    // *** VESTING PARAMETERS END ***
    address public DHVToken;
    address internal USDTToken; /*= 0xdAC17F958D2ee523a2206206994597C13D831ec7 */
    address internal DAIToken; /*= 0x6B175474E89094C44Da98b954EedeAC495271d0F*/
    address internal NUXToken; /*= 0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c*/

    mapping (address => uint256) public purchased;
    mapping (address => uint256) internal _claimed;

    uint256 public purchasedWithNUX;
    uint256 public purchasedPreSale;
    uint256 public purchasedPublicSale;
    uint256 public ETHRate;
    mapping (address => uint256) public rates;

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
        require(_isPreSale() || _isPublicSale(), "Sale stages are over or not started");
        _;
    }

    /**
    * @dev Throws if called when no ongoing pre-sale or public sale.
    */
    modifier onlyPreSale() {
        require(_isPreSale(), "Presale stages are over or not started");
        _;
    }

    /**
    * @dev Throws if sale stage is ongoing.
    */
    modifier notOnSale() {
        require(!_isPreSale(), "Presale is not over");
        require(!_isPublicSale(), "Sale is not over");
        _;
    }

    /***
     * INITIALIZER AND SETTINGS
     ***/

    /**
     * @notice Initializes the contract with correct addresses settings
     * @param treasury Address of the DeHive protocol's treasury where funds from sale go to
     * @param dhv DHVToken mainnet address
     */
    function initialize(address treasury, address dhv) public initializer {
        require(treasury != address(0), "Zero address");
        require(dhv != address(0), "Zero address");

        __Ownable_init();
        __Pausable_init();

        _treasury = treasury;
        DHVToken = dhv;

        DAIToken = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        USDTToken = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        NUXToken = 0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c;
        vestingStart = 0;
        vestingDuration = 305 * 24 * 60 * 60;
        maxTokensAmount = 49600 * (10 ** 18); // around 50 ETH 
    }

    /**
     * @notice Updates current vesting start time. Can be used once
     * @param _vestingStart New vesting start time
     */
    function adminSetVestingStart(uint256 _vestingStart) virtual external onlyOwner{
        require(vestingStart == 0, "Vesting start is already set");
        require(_vestingStart > PUBLIC_SALE_END && block.timestamp < _vestingStart, "Incorrect time provided");
        vestingStart = _vestingStart;
    }

    /**
     * @notice Sets the rate for the chosen token based on the contracts precision
     * @param _token ERC20 token address or zero address for ETH
     * @param _rate Exchange rate based on precision (e.g. _rate = PRECISION corresponds to 1:1)
     */
    function adminSetRates(address _token, uint256 _rate) external onlyOwner {
        if (_token == address(0))
            ETHRate = _rate;
        else
            rates[_token] = _rate;
    }

    /**
    * @notice Allows owner to change the treasury address. Treasury is the address where all funds from sale go to
    * @param treasury New treasury address
    */
    function adminSetTreasury(address treasury) external onlyOwner notOnSale {
        _treasury = treasury;
    }

    /**
    * @notice Allows owner to change the treasury address. Treasury is the address where all funds from sale go to
    * @param _maxDHV New max DHV amount
    */
    function adminSetMaxDHV(uint256 _maxDHV) external onlyOwner {
        maxTokensAmount = _maxDHV;
    }

    /**
    * @notice Stops purchase functions. Owner only
    */
    function adminPause() external onlyOwner {
        _pause();
    }

    /**
    * @notice Unpauses purchase functions. Owner only
    */
    function adminUnpause() external onlyOwner {
        _unpause();
    }

    /***
     * PURCHASE FUNCTIONS
     ***/

    /**
     * @notice For purchase with ETH
     */
    receive() external virtual payable onlySale whenNotPaused {
        _purchaseDHVwithETH();
    }

    /**
     * @notice For purchase with allowed stablecoin (USDT and DAI)
     * @param ERC20token Address of the token to be paid in
     * @param ERC20amount Amount of the token to be paid in
     */
    function purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount) external onlySale supportedCoin(ERC20token) whenNotPaused {
        require(ERC20amount > 0, "Zero amount");
        uint256 purchaseAmount = _calcPurchaseAmount(ERC20token, ERC20amount);
        
        if (_isPreSale()) {
            require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
            purchasedPreSale = purchasedPreSale.add(purchaseAmount);
        } else {
            require(purchaseAmount <= publicSaleAvailableDHV(), "Not enough DHV in sale pool");
            purchasedPublicSale = purchasedPublicSale.add(purchaseAmount);
        }
            
        IERC20Upgradeable(ERC20token).safeTransferFrom(_msgSender(), _treasury, ERC20amount); // send ERC20 to Treasury
        purchased[_msgSender()] = purchased[_msgSender()].add(purchaseAmount);

        emit DHVPurchased(_msgSender(), ERC20token, purchaseAmount);
    }

    /**
     * @notice For purchase with NUX token only. Available only for tokensale
     * @param nuxAmount Amount of the NUX token
     */
    function purchaseDHVwithNUX(uint256 nuxAmount) external onlyPreSale whenNotPaused {
        require(nuxAmount > 0, "Zero amount");
        uint256 purchaseAmount = _calcPurchaseAmount(NUXToken, nuxAmount);

        require(purchasedWithNUX.add(purchaseAmount) <= PRE_SALE_DHV_NUX_POOL, "Not enough DHV in NUX pool");
        purchasedWithNUX = purchasedWithNUX.add(purchaseAmount);

        IERC20Upgradeable(NUXToken).safeTransferFrom(_msgSender(), _treasury, nuxAmount);
        purchased[_msgSender()] = purchased[_msgSender()].add(purchaseAmount);

        emit DHVPurchased(_msgSender(), NUXToken, purchaseAmount);
    }

    /**
     * @notice For purchase with ETH. ETH is left on the contract until withdrawn to treasury
     */
    function purchaseDHVwithETH() external payable onlySale whenNotPaused {
        require(msg.value > 0, "No ETH sent");
        _purchaseDHVwithETH();
    }

    function _purchaseDHVwithETH() private {
        uint256 purchaseAmount = _calcEthPurchaseAmount(msg.value);

        if (_isPreSale()) {
            require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
            purchasedPreSale = purchasedPreSale.add(purchaseAmount);
        } else {
            require(purchaseAmount <= publicSaleAvailableDHV(), "Not enough DHV in sale pool");
            purchasedPublicSale = purchasedPublicSale.add(purchaseAmount);
        }

        purchased[_msgSender()] = purchased[_msgSender()].add(purchaseAmount);

        payable(_treasury).transfer(msg.value);

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


    /**
     * @notice Function for the administrator to withdraw token (except DHV)
     * @notice Withdrawals allowed only if there is no sale pending stage
     * @param ERC20token Address of ERC20 token to withdraw from the contract
     */
    function adminWithdrawERC20(address ERC20token) external onlyOwner notOnSale {
        require(ERC20token != DHVToken || _canWithdrawDHV(), "DHV withdrawal is forbidden");

        uint256 tokenBalance = IERC20Upgradeable(ERC20token).balanceOf(address(this));
        IERC20Upgradeable(ERC20token).safeTransfer(_treasury, tokenBalance);
    }

    /**
     * @notice Function for the administrator to withdraw ETH for refunds
     * @notice Withdrawals allowed only if there is no sale pending stage
     */
    function adminWithdraw() external onlyOwner notOnSale {
        require(address(this).balance > 0, "Nothing to withdraw");

        (bool success, ) = _treasury.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Returns DHV amount for 1 external token
     * @param _token External toke (DAI, USDT, NUX, 0 address for ETH)
     */
    function rateForToken(address _token) external view returns(uint256) {
        if (_token == address(0)) {
            return _calcEthPurchaseAmount(10**18);
        }
        else {
            return _calcPurchaseAmount(_token, 10**18);
        }
    }

    /***
     * VESTING INTERFACE
     ***/

    /**
     * @notice Transfers available for claim vested tokens to the user.
     */
    function claim() external {
        require(vestingStart!=0, "Vesting start is not set");
        require(_isPublicSaleOver(), "Not allowed to claim now");
        uint256 unclaimed = claimable(_msgSender());
        require(unclaimed > 0, "TokenVesting: no tokens are due");

        _claimed[_msgSender()] = _claimed[_msgSender()].add(unclaimed);
        IERC20Upgradeable(DHVToken).safeTransfer(_msgSender(), unclaimed);
        emit TokensClaimed(_msgSender(), unclaimed);
    }

    /**
     * @notice Gets the amount of tokens the user has already claimed
     * @param _user Address of the user who purchased tokens
     * @return The amount of the token claimed.
     */
    function claimed(address _user) external view returns (uint256) {
        return _claimed[_user];
    }

    /**
     * @notice Calculates the amount that has already vested but hasn't been claimed yet.
     * @param _user Address of the user who purchased tokens
     * @return The amount of the token vested and unclaimed.
     */
    function claimable(address _user) public view returns (uint256) {
        return _vestedAmount(_user).sub(_claimed[_user]);
    }

    /**
     * @dev Calculates the amount that has already vested.
     * @param _user Address of the user who purchased tokens
     * @return Amount of DHV already vested
     */
    function _vestedAmount(address _user) private view returns (uint256) {
        if (block.timestamp >= vestingStart.add(vestingDuration)) {
            return purchased[_user];
        } else {
            return purchased[_user].mul(block.timestamp.sub(vestingStart)).div(vestingDuration);
        }
    }

    /***
     * INTERNAL HELPERS
     ***/


    /**
     * @dev Checks if presale stage is on-going.
     * @return True is presale is active
     */
    function _isPreSale() virtual internal view returns (bool) {
        return (block.timestamp >= PRE_SALE_START && block.timestamp < PRE_SALE_END);
    }

    /**
     * @dev Checks if public sale stage is on-going.
     * @return True is public sale is active
     */
    function _isPublicSale() virtual internal view returns (bool) {
        return (block.timestamp >= PUBLIC_SALE_START && block.timestamp < PUBLIC_SALE_END);
    }

    /**
     * @dev Checks if public sale stage is over.
     * @return True is public sale is over
     */
    function _isPublicSaleOver() virtual internal view returns (bool) {
        return (block.timestamp >= PUBLIC_SALE_END);
    }

    /**
     * @dev Checks if public sale stage is over.
     * @return True is public sale is over
     */
    function _canWithdrawDHV() virtual internal view returns (bool) {
        return (block.timestamp >= vestingStart.add(WITHDRAWAL_PERIOD) );
    }

    /**
     * @dev Calculates DHV amount based on rate and token.
     * @param _token Supported ERC20 token
     * @param _amount Token amount to convert to DHV
     * @return DHV amount
     */
    function _calcPurchaseAmount(address _token, uint256 _amount) private view returns (uint256) {
        uint256 purchaseAmount = _amount.mul(rates[_token]).div(PRECISION);
        require(purchaseAmount > 0, "Rates not set");
        require(purchaseAmount <= maxTokensAmount, "Maximum allowed exceeded");
        return purchaseAmount;
    }

    /**
     * @dev Calculates DHV amount based on rate and ETH amount.
     * @param _amount ETH amount to convert to DHV
     * @return DHV amount
     */
    function _calcEthPurchaseAmount(uint256 _amount) private view returns (uint256) {
        uint256 purchaseAmount = _amount.mul(ETHRate).div(PRECISION);
        require(purchaseAmount > 0, "Rates not set");
        require(purchaseAmount <= maxTokensAmount, "Maximum allowed exceeded");
        return purchaseAmount;
    }


}