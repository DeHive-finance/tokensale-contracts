// todo DHV address should be correct
// todo NUX address should be correct
// todo DAI address should be correct
// todo Treasury address should be set and correct
// todo investor should have DHV record according to the NUX rate after purchase
// todo investor should have DHV record according to the DAI rate after purchase
// todo investor should have DHV record according to the ETH rate after purchase
// todo investor should be able to purchase DHV with NUX only within presale period
// todo investor should not be able to purchase DHV with any ERC20 except NUX, DAI
// todo investor should not be able to purchase more DHV if there is not enough tokens in NUX pool on presale
// todo investor should not be able to purchase more DHV if there is not enough tokens in presale pool
// todo investor should not be able to purchase more DHV if there is not enough tokens in public sale pool + rest of NUX pool
// todo investor should be able to purchase DHV only within presale and sale start-end period
// todo investor should be able to release tokens after vesting start according to linear vesting
// todo investor should not be able to release tokens before vesting start
// todo investor should receive full amount of purchased tokens after vesting end (start+duration)
// todo admin should be able to set the rates for ETH, NUX, DAI
// todo admin should be able to withdraw any ERC20 token from the DeHiveTokensale contract
// todo admin should not be able to withdraw DHV token from the DeHiveTokensale contract
// todo admin should be able to withdraw ETH from the DeHiveTokensale contract
// todo admin should be able to set treasury address

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const DeHiveTokensale = artifacts.require('DeHiveTokenSaleTest');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

//const DAItoken = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const unsupportedToken = '0xc944e90c64b2c07662a292be6244bdf05cda44a7';

const PRE_SALE_START = 1616544000;
const PUBLIC_SALE_START = 1618358400;

describe('tokensale-contract testing', () => {
    let deployer;
    let user1, user2;
    let deHiveTokensale, testToken, dhvToken;
    let snapshotId;
    let testTokenAddress;
    let owner;
    const currentDate = new Date();
    before(async () => {
        [
            deployer, user1, user2
        ] = await web3.eth.getAccounts();
        
        testToken = await TestToken.new({from: deployer});
        dhvToken = await DHVToken.new({from: deployer});
       
       testTokenAddress = testToken.address;
       deHiveTokensale = await deployProxy(DeHiveTokensale, 
        [testToken.address,
        testToken.address,
        testToken.address,
        deployer,
        1625097600,
        123 * 24 * 60 * 60,
        0,
        0,
        0,
        dhvToken.address],
        {from: deployer});

        await testToken.transfer(user1, 100, {from: deployer});
        await testToken.approve(deHiveTokensale.address, 20, {from: user1});


    });

    describe('Deposit in ERC20 functionality coverage', () => {
        beforeEach(async() => {
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Sets rates', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            expect((await deHiveTokensale.rates(testTokenAddress)).toNumber())
            .to.equal(100000);
        });

        it('Should buy DHV in presale', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            // await timeMachine.advanceTime(
            //     PRE_SALE_START - currentDate.getTime() + 86400); // Get March 25

            await timeMachine.advanceTime(14*86400);

            await deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1});

            expect((await deHiveTokensale.purchased(user1)).toNumber()).to.equal(20);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber()).to.equal(20);
            expect((await testToken.balanceOf(deHiveTokensale.address)).toNumber())
                .to.equal(20);
        });

        it('Should buy DHV in public sale', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            // await timeMachine.advanceTime(
            //     PUBLIC_SALE_START - currentDate.getTime() + 86400); // Get April 15
            await timeMachine.advanceTime(36*86400);
            await deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1});
            expect((await deHiveTokensale.purchased(user1)).toNumber()).to.equal(20);
            expect((await deHiveTokensale.purchasedPublicSale()).toNumber()).to.equal(20);
            expect((await testToken.balanceOf(deHiveTokensale.address)).toNumber())
                .to.equal(20);
        });

        it('Should not let deposit with unsupported token', async () => {
            await timeMachine.advanceTime(14*86400);
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(unsupportedToken, 20, {from: user1}),
                "Token not supported"
            );
        });

        it('Should not let buy DHV when paused', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            // timeMachine.advanceTime(
            //     PRE_SALE_START - currentDate.getTime() + 86400); // Get March 25
            await timeMachine.advanceTime(14*86400);
            await deHiveTokensale.adminPause({from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Pausable: paused"
            );
        });

        it('Amount must be greater than 0', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            // timeMachine.advanceTime(
            //     PRE_SALE_START - currentDate. getTime() + 86400); // Get March 25
            await timeMachine.advanceTime(14*86400);
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 0, {from: user1}),
                "Zero amount"
            );
        });

        it('rate should be set first', async () => {
            await timeMachine.advanceTime(14*86400);
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Rates not set"
            );
        });

        it('Cant buy tokens while sale stages are over', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Sale stages are over"
            );
            
            await timeMachine.advanceTime(25*86400);

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Sale stages are over"
            );
        });

        it('Cant buy tokens during presale stage if presale poo is empty', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(14*86400);
            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress, 20, {from: user1});
            await testToken.approve(deHiveTokensale.address, 10, {from: user1});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 10, {from: user1}),
                "Not enough DHV in presale pool"
            );
        });

        it('Cant buy tokens during public stage if public pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(36*86400);
            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress, 20, {from: user1});
            await testToken.approve(deHiveTokensale.address, 10, {from: user1});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 10, {from: user1}),
                "Not enough DHV in sale pool"
            );
        });
    });
});