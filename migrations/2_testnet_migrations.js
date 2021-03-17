require('dotenv').config();

const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const DeHiveTokensale = artifacts.require("DeHiveTokensale");
const DHVToken = artifacts.require("DHVToken");

const DAIMock = artifacts.require("DAIMock");
const USDTMock = artifacts.require("USDTMock");
const NUXMock = artifacts.require("NUXMock");

module.exports = async function(deployer) {

    let DAIAddress, USDTAddress, NUXAddress, DHVAddress, TokenSaleAddress;
    const accounts = await web3.eth.getAccounts();

    console.log(accounts);

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
    await deployProxy(
        DeHiveTokensale,
        [   DAIAddress,
            USDTAddress,
            NUXAddress,
            process.env.TREASURY,
            0, 0, 0,
            DHVAddress
        ],
        {deployer}
    ).then(
        () => TokenSaleAddress = DeHiveTokensale.address
    ).then(
        () => console.log('DHVTokensale address: ', TokenSaleAddress)
    );
};


