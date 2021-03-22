require('dotenv').config();

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const DeHiveTokensaleMock = artifacts.require('DeHiveTokensaleMock');
const DHVToken = artifacts.require('DHVToken');

const DAIMock = artifacts.require('DAIMock');
const USDTMock = artifacts.require('USDTMock');
const NUXMock = artifacts.require('NUXMock');

module.exports = async function(deployer) {
  let DAIAddress, USDTAddress, NUXAddress, DHVAddress, TokenSaleAddress;
  // Deploy DAIMock
  await deployer.deploy(DAIMock).then(
    () => DAIAddress = DAIMock.address
  ).then(
    () => console.log('DAIMock address: ', DAIAddress)
  );
  // Deploy USDTMock
  await deployer.deploy(USDTMock).then(
    () => USDTAddress = USDTMock.address
  ).then(
    () => console.log('USDTMock address: ', USDTAddress)
  );
  // Deploy NuxMock
  await deployer.deploy(NUXMock).then(
    () => NUXAddress = NUXMock.address
  ).then(
    () => console.log('NUXMock address: ', NUXAddress)
  );
  // Deploy DHVToken
  await deployer.deploy(DHVToken).then(
    () => DHVAddress = DHVToken.address
  ).then(
    () => console.log('DHV address: ', DHVAddress)
  );
  // Deploy DHVTokenSale
  console.log(process.env.RINKEBY_TREASURY_ADDRESS)
  let args =     [DAIAddress, USDTAddress, NUXAddress, process.env.RINKEBY_TREASURY_ADDRESS, DHVAddress]
  await deployProxy(DeHiveTokensaleMock, args, { deployer }
  ).then(
    () => TokenSaleAddress = DeHiveTokensaleMock.address
  ).then(
    () => console.log('DHVTokensale address: ', TokenSaleAddress)
  );
};


