const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const DeHiveTokensale=artifacts.require("DeHiveTokensale");
const DHVToken = artifacts.require("DHVToken");
const TestERC20 = artifacts.require("TestERC20")
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

let USDTToken = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
let DAIToken = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
let NUXToken = "0x89bD2E7e388fAB44AE88BEf4e1AD12b4F1E0911c";

module.exports = async function (deployer) {
  let token;
  let instance;
  const accounts = await web3.eth.getAccounts();
  console.log(accounts)
  await deployer.deploy(DHVToken)
    .then(()=>token=DHVToken.address)
    .then(()=>console.log(token));
  console.log("DHVToken deployed successfully");
  await deployProxy(DeHiveTokensale,[accounts[0],token, USDTToken, DAIToken, NUXToken],{from: deployer})
    .then(()=>instance=DeHiveTokensale.address)
    .then(()=>console.log(instance));
  console.log("DeHiveTokensale deployed successfully");
};
