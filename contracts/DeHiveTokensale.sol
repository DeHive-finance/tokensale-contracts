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
    uint256 public constant PRECISION = 100000; //Up to 0.00001
    uint256 public constant PRE_SALE_START = 1616544000;    //Mar 24 2021 00:00:00 GMT
    uint256 public constant PRE_SALE_END = 1616716800;      //Mar 26 2021 00:00:00 GMT

    uint256 public constant PUBLIC_SALE_START = 1618358400; //Apr 14 2021 00:00:00 GMT
    uint256 public constant PUBLIC_SALE_END = 1618704000;   //Apr 18 2021 00:00:00 GMT

    uint256 public constant PRE_SALE_DHV_POOL =     45/*0000*/ * 10 ** 18; // 5% DHV in total in presale pool
    uint256 public constant PRE_SALE_DHV_NUX_POOL =  5/*0000*/ * 10 ** 18; // 
    uint256 public constant PUBLIC_SALE_DHV_POOL = 120/*0000*/ * 10 ** 18; // 12% DHV in public sale pool
    // *** TOKENSALE PARAMETERS END ***


    /***
     * STORAGE
     ***/

    // *** VESTING PARAMETERS START ***

    uint256 public vestingStart /*= 1625097600*/;    //Jul 01 2021 00:00:00 GMT
    uint256 public vestingDuration /*= 123 * 24 * 60 * 60*/; //123 days - until Oct 31 2021 00:00:00 GMT
    
    // *** VESTING PARAMETERS END ***
    address public DHVToken;
    address internal USDTToken /*= 0xdAC17F958D2ee523a2206206994597C13D831ec7 */;
    address internal DAIToken /*= 0x6B175474E89094C44Da98b954EedeAC495271d0F*/;
    address internal NUXToken /*= 0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c*/;

    mapping (address => uint256) public purchased;
    mapping (address => uint256) internal _claimed;

    uint256 public purchasedWithNUX /*= 0*/;
    uint256 public purchasedPreSale /*= 0*/;
    uint256 public purchasedPublicSale /*= 0*/;

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

    /**
    * @dev Throws if sale stage is ongoing.
    */
    modifier notOnSale() {
        require(block.timestamp >= PRE_SALE_END, "Presale is not over");
        require(block.timestamp < PUBLIC_SALE_START || block.timestamp >= PUBLIC_SALE_END, "Withdraw is not permitted");
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
    function initialize(address _DAIToken,
        address _USDTToken,
        address _NUXToken,
        address treasury,
        uint _vestingStart,
        uint _vestingDuration,
        uint _purchasedWithNUX,
        uint _purchasedPreSale,
        uint _purchasedPublicSale,
        address dhv) virtual public initializer {
        require(treasury != address(0), "Zero address");
        require(dhv != address(0), "Zero address");

        __Ownable_init();
        __Pausable_init();

        _treasury = treasury;
        DHVToken = dhv;

        DAIToken = _DAIToken;
        USDTToken = _USDTToken;
        NUXToken = _NUXToken;
        vestingStart = _vestingStart;
        vestingDuration = _vestingDuration;
        purchasedWithNUX = _purchasedWithNUX;
        purchasedPreSale = _purchasedPreSale;
        purchasedPublicSale = _purchasedPublicSale;
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
        require(ERC20amount > 0, "Zero amount");
        uint256 purchaseAmount = _calcPurchaseAmount(ERC20token, ERC20amount);
        require(purchaseAmount > 0, "Rates not set");
        
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
        require(purchaseAmount > 0, "Rates not set");

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
        uint256 purchaseAmount = _calcEthPurchaseAmount(msg.value);
        require(purchaseAmount > 0, "Rates not set");

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
        require(ERC20token != DHVToken, "DHV withdrawal is forbidden");

        uint256 tokenBalance = IERC20Upgradeable(USDTToken).balanceOf(address(this));
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
    function rateForToken(address _token) public view returns(uint256) {
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
    function claimed(address _user) public view returns (uint256) {
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
    function _isPreSale() private view returns (bool) {
        return (block.timestamp >= PRE_SALE_START && block.timestamp < PRE_SALE_END);
    }

    /**
     * @dev Checks if public sale stage is on-going.
     * @return True is public sale is active
     */
    function _isPublicSale() private view returns (bool) {
        return (block.timestamp >= PUBLIC_SALE_START && block.timestamp < PUBLIC_SALE_END);
    }

    /**
     * @dev Calculates DHV amount based on rate and token.
     * @param _token Supported ERC20 token
     * @param _amount Token amount to convert to DHV
     * @return DHV amount
     */
    function _calcPurchaseAmount(address _token, uint256 _amount) private view returns (uint256) {
        return _amount.mul(rates[_token]).div(PRECISION);
    }

    /**
     * @dev Calculates DHV amount based on rate and ETH amount.
     * @param _amount ETH amount to convert to DHV
     * @return DHV amount
     */
    function _calcEthPurchaseAmount(uint256 _amount) private view returns (uint256) {
        return _amount.mul(ETHRate).div(PRECISION);
    }


}