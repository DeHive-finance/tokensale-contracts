# DHVToken
*DHV - token for DeHive protocol.*

*Description*: Initial hard cap for 10M tokens.

## Table of contents:
- [Variables](#variables)
- [Functions:](#functions)
  - [`constructor()` (public) ](#dhvtoken-constructor--)
  - [`mint(address _receiver, uint256 _amount)` (external) ](#dhvtoken-mint-address-uint256-)

## Variables <a name="variables"></a>
- `uint256 cap`

## Functions <a name="functions"></a>

### `constructor()` (public) <a name="dhvtoken-constructor--"></a>

*Description*: Contract's constructor

**Dev doc**: Mints 10M tokens for the deployer

### `mint(address _receiver, uint256 _amount)` (external) <a name="dhvtoken-mint-address-uint256-"></a>

*Description*: Mint method for the exceptional cases


#### Params
 - `_amount`: Amount of DHV tokens (with decimals) to be minted for the caller
