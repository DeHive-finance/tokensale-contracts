# DeHiveTokensale
**


## Table of contents:
- [Variables](#variables)
- [Functions:](#functions)
  - [`initialize(address treasury, address dhv)` (public) ](#dehivetokensale-initialize-address-address-)
  - [`adminSetVestingStart(uint256 _vestingStart)` (external) ](#dehivetokensale-adminsetvestingstart-uint256-)
  - [`adminSetRates(address _token, uint256 _rate)` (external) ](#dehivetokensale-adminsetrates-address-uint256-)
  - [`adminSetTreasury(address treasury)` (external) ](#dehivetokensale-adminsettreasury-address-)
  - [`adminSetMaxDHV(uint256 _maxDHV)` (external) ](#dehivetokensale-adminsetmaxdhv-uint256-)
  - [`adminPause()` (external) ](#dehivetokensale-adminpause--)
  - [`adminUnpause()` (external) ](#dehivetokensale-adminunpause--)
  - [`receive()` (external) ](#dehivetokensale-receive--)
  - [`purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount)` (external) ](#dehivetokensale-purchasedhvwitherc20-address-uint256-)
  - [`purchaseDHVwithNUX(uint256 nuxAmount)` (external) ](#dehivetokensale-purchasedhvwithnux-uint256-)
  - [`purchaseDHVwithETH()` (external) ](#dehivetokensale-purchasedhvwitheth--)
  - [`publicSaleAvailableDHV() → uint256` (public) ](#dehivetokensale-publicsaleavailabledhv--)
  - [`adminWithdrawERC20(address ERC20token)` (external) ](#dehivetokensale-adminwithdrawerc20-address-)
  - [`adminWithdraw()` (external) ](#dehivetokensale-adminwithdraw--)
  - [`rateForToken(address _token) → uint256` (external) ](#dehivetokensale-ratefortoken-address-)
  - [`claim()` (external) ](#dehivetokensale-claim--)
  - [`claimed(address _user) → uint256` (external) ](#dehivetokensale-claimed-address-)
  - [`claimable(address _user) → uint256` (public) ](#dehivetokensale-claimable-address-)
- [Events:](#events)

## Variables <a name="variables"></a>
- `uint256 PRECISION`
- `uint256 PRE_SALE_START`
- `uint256 PRE_SALE_END`
- `uint256 PUBLIC_SALE_START`
- `uint256 PUBLIC_SALE_END`
- `uint256 PRE_SALE_DHV_POOL`
- `uint256 PRE_SALE_DHV_NUX_POOL`
- `uint256 PUBLIC_SALE_DHV_POOL`
- `uint256 maxTokensAmount`
- `uint256 vestingStart`
- `uint256 vestingDuration`
- `address DHVToken`
- `address USDTToken`
- `address DAIToken`
- `address NUXToken`
- `mapping(address => uint256) purchased`
- `mapping(address => uint256) _claimed`
- `uint256 purchasedWithNUX`
- `uint256 purchasedPreSale`
- `uint256 purchasedPublicSale`
- `uint256 ETHRate`
- `mapping(address => uint256) rates`

## Functions <a name="functions"></a>

### `initialize(address treasury, address dhv)` (public) <a name="dehivetokensale-initialize-address-address-"></a>

*Description*: Initializes the contract with correct addresses settings


#### Params
 - `treasury`: Address of the DeHive protocol's treasury where funds from sale go to

 - `dhv`: DHVToken mainnet address

### `adminSetVestingStart(uint256 _vestingStart)` (external) <a name="dehivetokensale-adminsetvestingstart-uint256-"></a>

*Description*: Updates current vesting start time. Can be used once


#### Params
 - `_vestingStart`: New vesting start time

### `adminSetRates(address _token, uint256 _rate)` (external) <a name="dehivetokensale-adminsetrates-address-uint256-"></a>

*Description*: Sets the rate for the chosen token based on the contracts precision


#### Params
 - `_token`: ERC20 token address or zero address for ETH

 - `_rate`: Exchange rate based on precision (e.g. _rate = PRECISION corresponds to 1:1)

### `adminSetTreasury(address treasury)` (external) <a name="dehivetokensale-adminsettreasury-address-"></a>

*Description*: Allows owner to change the treasury address. Treasury is the address where all funds from sale go to


#### Params
 - `treasury`: New treasury address

### `adminSetMaxDHV(uint256 _maxDHV)` (external) <a name="dehivetokensale-adminsetmaxdhv-uint256-"></a>

*Description*: Allows owner to change the treasury address. Treasury is the address where all funds from sale go to


#### Params
 - `_maxDHV`: New max DHV amount

### `adminPause()` (external) <a name="dehivetokensale-adminpause--"></a>

*Description*: Stops purchase functions. Owner only

### `adminUnpause()` (external) <a name="dehivetokensale-adminunpause--"></a>

*Description*: Unpauses purchase functions. Owner only

### `receive()` (external) <a name="dehivetokensale-receive--"></a>

*Description*: For purchase with ETH

### `purchaseDHVwithERC20(address ERC20token, uint256 ERC20amount)` (external) <a name="dehivetokensale-purchasedhvwitherc20-address-uint256-"></a>

*Description*: For purchase with allowed stablecoin (USDT and DAI)


#### Params
 - `ERC20token`: Address of the token to be paid in

 - `ERC20amount`: Amount of the token to be paid in

### `purchaseDHVwithNUX(uint256 nuxAmount)` (external) <a name="dehivetokensale-purchasedhvwithnux-uint256-"></a>

*Description*: For purchase with NUX token only. Available only for tokensale


#### Params
 - `nuxAmount`: Amount of the NUX token

### `purchaseDHVwithETH()` (external) <a name="dehivetokensale-purchasedhvwitheth--"></a>

*Description*: For purchase with ETH. ETH is left on the contract until withdrawn to treasury

### `publicSaleAvailableDHV() → uint256` (public) <a name="dehivetokensale-publicsaleavailabledhv--"></a>

*Description*: Function to get available on public sale amount of DHV
Unsold NUX pool and pre-sale pool go to public sale

#### Returns
 - The amount of the token released.

### `adminWithdrawERC20(address ERC20token)` (external) <a name="dehivetokensale-adminwithdrawerc20-address-"></a>

*Description*: Function for the administrator to withdraw token (except DHV)
Withdrawals allowed only if there is no sale pending stage


#### Params
 - `ERC20token`: Address of ERC20 token to withdraw from the contract

### `adminWithdraw()` (external) <a name="dehivetokensale-adminwithdraw--"></a>

*Description*: Function for the administrator to withdraw ETH for refunds
Withdrawals allowed only if there is no sale pending stage

### `rateForToken(address _token) → uint256` (external) <a name="dehivetokensale-ratefortoken-address-"></a>

*Description*: Returns DHV amount for 1 external token


#### Params
 - `_token`: External toke (DAI, USDT, NUX, 0 address for ETH)

### `claim()` (external) <a name="dehivetokensale-claim--"></a>

*Description*: Transfers available for claim vested tokens to the user.

### `claimed(address _user) → uint256` (external) <a name="dehivetokensale-claimed-address-"></a>

*Description*: Gets the amount of tokens the user has already claimed


#### Params
 - `_user`: Address of the user who purchased tokens

#### Returns
 - The amount of the token claimed.

### `claimable(address _user) → uint256` (public) <a name="dehivetokensale-claimable-address-"></a>

*Description*: Calculates the amount that has already vested but hasn't been claimed yet.


#### Params
 - `_user`: Address of the user who purchased tokens

#### Returns
 - The amount of the token vested and unclaimed.

### `_isPreSale() → bool` (internal) <a name="dehivetokensale-_ispresale--"></a>

**Dev doc**: Checks if presale stage is on-going.

#### Returns
 - True is presale is active

### `_isPublicSale() → bool` (internal) <a name="dehivetokensale-_ispublicsale--"></a>

**Dev doc**: Checks if public sale stage is on-going.

#### Returns
 - True is public sale is active

### `_isPublicSaleOver() → bool` (internal) <a name="dehivetokensale-_ispublicsaleover--"></a>

**Dev doc**: Checks if public sale stage is over.

#### Returns
 - True is public sale is over

### `_canWithdrawDHV() → bool` (internal) <a name="dehivetokensale-_canwithdrawdhv--"></a>

**Dev doc**: Checks if public sale stage is over.

#### Returns
 - True is public sale is over
## Events <a name="events"></a>
### event `DHVPurchased(address user, address purchaseToken, uint256 dhvAmount)` <a name="dehivetokensale-dhvpurchased-address-address-uint256-"></a>

*Description*: EVENTS


### event `TokensClaimed(address user, uint256 dhvAmount)` <a name="dehivetokensale-tokensclaimed-address-uint256-"></a>


