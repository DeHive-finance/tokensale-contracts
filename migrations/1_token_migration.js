const DHVToken = artifacts.require("DHVToken");


module.exports = async function (deployer) {
  let token;
  await deployer.deploy(DHVToken)
    .then(()=>token=DHVToken.address)
    .then(()=>console.log(token));
  console.log("DHVToken deployed successfully");
  process.env.DHV_TOKEN_ADDRESS=token.toString();
};