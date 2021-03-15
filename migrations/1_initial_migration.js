const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const TestToken = artifacts.require("TestToken");
const DeHiveTokensaleTest = artifacts.require("DeHiveTokensaleTest");
const DHV = artifacts.require("DHVToken");
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

module.exports = async function (deployer) {
  const testToken = await deployer.deploy(TestToken);
  const dhvToken = await deployer.deploy(DHV);

  const accounts = await web3.eth.getAccounts();

  let tokenAddress, DHVTokenAddress, instanceAddress;
  //await deployer.deploy(DeHiveTokensaleTest);
  // const instance = await deployProxy(DeHiveTokensaleTest, 
  //   [testToken.address,
  //   testToken.address,
  //   testToken.address,
  //   '0x174dbe454544c3aFA09c8c44d63Cf9E7557aB3E4',
  //   1625097600,
  //   123 * 24 * 60 * 60,
  //   0,
  //   0,
  //   0,
  //   dhvToken.address],
  //   {deployer});
  //  console.log("Deployed", instance.address);
  await deployer.deploy(TestToken)
    .then(() => tokenAddress = TestToken.address);

  await deployer.deploy(DHV)
    .then(() => DHVTokenAddress = DHV.address);

  await deployProxy(DeHiveTokensaleTest, [tokenAddress,
      tokenAddress,
      tokenAddress,
      accounts[0],
      1625097600,
      123 * 24 * 60 * 60,
      0,
      0,
      0,
      DHVTokenAddress],
      {deployer})
      .then(()=> instanceAddress = DeHiveTokensaleTest.address)
      .then(() => console.log('Deployed', instanceAddress));
  };




 

