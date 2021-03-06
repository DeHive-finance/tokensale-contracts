// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract DeHiveTokensale is Ownable, Pausable {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 internal constant DHVToken = address(0); //todo set correct address
    IERC20 internal constant DAIToken = address(0); //todo set correct address
    IERC20 internal constant NUXToken = address(0); //todo set correct address

    uint256 internal constant PRE_SALE_START = 1615063797; //todo set correct time
    uint256 internal constant PRE_SALE_END = 1615063797; //todo set correct time

    uint256 internal constant PUBLIC_SALE_START = 1615063797; //todo set correct time
    uint256 internal constant PUBLIC_SALE_END = 1615063797; //todo set correct time

    uint256 internal constant VESTING_START = 1615063797; //todo set correct time
    uint256 internal constant VESTING_DURATION = 1615063797; //todo set correct time

    uint256 internal constant PRE_SALE_DHV_POOL = 400000 * 10 ** 18; // 20% DHV in presale pool
    uint256 internal constant PUBLIC_SALE_DHV_POOL = 1200000 * 10 ** 18; // 20% DHV in presale pool
    uint256 internal constant NUX_PRESALE_POOL = 100000 * 10 ** 18; // 20% DHV in presale pool

    mapping (address => uint256) investorsBalances;

    uint256 public purchasedWithNUX = 0;
    uint256 public purchasedPreSale = 0;
    uint256 public purchasedPublicSale = 0;

    uint256 public ETHRate;
    uint256 public DAIRate;
    uint256 public NUXRate;

    address private _treasury;

    event DHVPurchase(address indexed token, address indexed investor);

    /**
     * @dev Initializes the contract setting the treasury where investments funds go to
     */
    constructor (address treasury) {
        require(treasury != address(0), "0 address");
        _treasury = treasury;
    }

    /**
    * @dev Throws if called when no ongoing pre-sale or public sale.
    */
    modifier onlySale() {
        require(_isPreSale() || _isSale());
        _;
    }

    /**
     * @dev
     */
    function purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount) external onlySale whenNotPaused {
        require(ERC20token == address(DAIToken) || ERC20token == address(NUXToken), "Not supported token");
        uint256 purchaseAmount;
        if (ERC20token == address(DAIToken)) {
            purchaseAmount = ERC20amount.mul(DAIRate);
        }
        if (ERC20token == address(NUXToken)) {
            require(_isPreSale(), "Presale is not active");
            purchaseAmount = ERC20amount.mul(NUXRate);
            require(purchasedWithNUX.add(ERC20amount) <= NUX_PRESALE_POOL, "Not enough DHV in NUX pool");
        }
        if (_isPreSale()) {
            require(purchasedPreSale.add(purchaseAmount) <= PRE_SALE_DHV_POOL, "Not enough DHV in presale pool");
        } else {
            require(
                purchasedPublicSale.add(purchaseAmount) <=
                PUBLIC_SALE_DHV_POOL.add(NUX_PRESALE_POOL.sub(purchasedWithNUX)), // unsold NUX pool goes to public sale
                "Not enough DHV in presale pool"
            );
        }
        IERC20(ERC20token).safeTransferFrom(msg.sender, _treasury, ERC20amount); // send ERC20 to Treasury
        investorsBalances[msg.sender] = investorsBalances[msg.sender].add(purchaseAmount);
        emit DHVPurchase(ERC20token, ERC20amount);
    }

    function purchaseDHVwithETH(uint256 amount, address token) external payable whenNotPaused {
        // todo for ethereum purchase after erc20 tests
        //require supported token
        //add investorsBalances
        //emit event
    }

    // todo put vesting logic here

    // todo releaseTokens() (vesting)

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
        require(address(ERC20token) != DHVToken, "DHV withdrawal is forbidden");
        IERC20(ERC20token).safeTransfer(msg.sender, ERC20amount);
    }

    /**
     * @dev Allows owner to withdraw ETH for refunds. Useful in case of accidental transfers directly to the contract
     */
    function adminWithdraw(uint256 ERC20amount) external onlyOwner {
        require(address(ERC20token) != DHVToken, "DHV withdrawal is forbidden");
        address(this).transfer(address(this).balance);
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