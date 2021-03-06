const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const DeHiveTokensale = artifacts.require('DeHiveTokensale');



module.exports = async function(deployer) {
  let instance;
  await deployProxy(DeHiveTokensale, [
    proccess.env.TREASURY_ADDRESS,
    process.env.DHV_TOKEN_ADDRESS], { from: deployer })
    .then(() => instance = DeHiveTokensale.address)
    .then(() => console.log(instance));
  console.log('DeHiveTokensale deployed successfully');
};
