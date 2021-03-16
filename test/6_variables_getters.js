const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const DeHiveTokensale = artifacts.require('DeHiveTokenSaleTest');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

const PRE_SALE_START = 1616544000;
const PUBLIC_SALE_START = 1618358400;


const addressZero = '0x0000000000000000000000000000000000000000';

describe('Test getters for public variables', () => {
    let deployer;
    let user1, user2, treasury;
    let deHiveTokensale, testToken, dhvToken;
    let snapshotId;
    let testTokenAddress;
    let blocknum, block, time;
    before(async () => {
        [
            deployer, user1, user2, treasury
        ] = await web3.eth.getAccounts();

        testToken = await TestToken.new({from: user1});
        dhvToken = await DHVToken.new({from: deployer});
       
       testTokenAddress = testToken.address;
       deHiveTokensale = await deployProxy(DeHiveTokensale, 
        [testToken.address,
        testToken.address,
        testToken.address,
        treasury,
        0,
        0,
        0,
        dhvToken.address],
        {from: deployer});
    });

    describe('Testset', () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Should show all public constants', async () => {
            expect((await deHiveTokensale.PRECISION()).toNumber())
                .to.equal(100000);
            expect((await deHiveTokensale.PRE_SALE_START()).toNumber())
                .to.equal(1616544000);
            expect((await deHiveTokensale.PRE_SALE_END()).toNumber())
                .to.equal(1616716800);
            expect((await deHiveTokensale.PUBLIC_SALE_START()).toNumber())
                .to.equal(1618358400);
            expect(BigInt((await deHiveTokensale.PRE_SALE_DHV_POOL()).toString()))
                .to.equal(BigInt('45000000000000000000'));
            expect(BigInt((await deHiveTokensale.PRE_SALE_DHV_NUX_POOL()).toString()))
                .to.equal(BigInt('5000000000000000000'));
            expect(BigInt((await deHiveTokensale.PUBLIC_SALE_DHV_POOL()).toString()))
                .to.equal(BigInt('120000000000000000000'));
        });

        it('Should show all public variables and variables for rates', async () => {
            // variables
            expect((await deHiveTokensale.vestingStart()).toNumber())
                .to.equal(0);
            await deHiveTokensale.adminSetVestingStart(1625097600);
            expect((await deHiveTokensale.vestingStart()).toNumber())
                .to.equal(1625097600);
            expect((await deHiveTokensale.vestingDuration()).toNumber())
                .to.equal(304 * 24 * 60 * 60);
            expect((await deHiveTokensale.DHVToken()).toString())
                .to.equal(dhvToken.address);
            // ETHRate and rates(mapping)
            expect((await deHiveTokensale.ETHRate()).toNumber())
                .to.equal(0);
            await deHiveTokensale.adminSetRates(
                addressZero,
                1234567,
                {from: deployer}
            );
            expect((await deHiveTokensale.ETHRate()).toNumber())
                .to.equal(1234567);
            
            expect((await deHiveTokensale.rates(testTokenAddress)).toNumber())
            .to.equal(0);
            await deHiveTokensale.adminSetRates(
                testTokenAddress,
                7654321,
                {from: deployer}
            );
            expect((await deHiveTokensale.rates(testTokenAddress)).toNumber())
            .to.equal(7654321);
        });

        it('Should show all public mappings and purchased variables', async () => {
            expect((await deHiveTokensale.purchased(user1)).toNumber())
                .to.equal(0);
            expect((await deHiveTokensale.purchasedWithNUX()).toNumber())
                .to.equal(0);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber())
                .to.equal(0);
            expect((await deHiveTokensale.purchasedPublicSale()).toNumber())
                .to.equal(0); 
            
            // Buying during pre-sale
            // Buy with erc20 token       
            await deHiveTokensale.adminSetRates(
                testTokenAddress,
                100000,
                {from: deployer}
            );

            let purchaseAmountERC = 100000;

            await testToken.approve(
                deHiveTokensale.address,
                purchaseAmountERC,
                {from: user1}
            );

            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);

            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                purchaseAmountERC,
                {from: user1}
            );

            expect((await deHiveTokensale.purchased(user1)).toNumber())
                .to.equal(purchaseAmountERC);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber())
                .to.equal(purchaseAmountERC);
            
            // Buy with eth

            await deHiveTokensale.adminSetRates(
                addressZero,
                100000,
                {from: deployer}
            );

            let purchaseAmountETH = 100000;

            await deHiveTokensale.purchaseDHVwithETH(
                {
                    from: user2,
                    value: purchaseAmountETH
                }
            );

            expect((await deHiveTokensale.purchased(user2)).toNumber())
                .to.equal(purchaseAmountETH);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber())
                .to.equal(purchaseAmountERC + purchaseAmountETH);

            // Buy with nux
            let purchaseAmountNux = 100000;

            await testToken.approve(
                deHiveTokensale.address,
                purchaseAmountNux,
                {from: user1}
            );

            await deHiveTokensale.purchaseDHVwithNUX(
                purchaseAmountNux,
                {from: user1}
            );

            expect((await deHiveTokensale.purchased(user1)).toNumber())
                .to.equal(purchaseAmountERC + purchaseAmountNux);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber()
                   + (await deHiveTokensale.purchasedWithNUX()).toNumber())
                .to.equal(purchaseAmountERC
                         + purchaseAmountETH
                         + purchaseAmountNux);

            // Buy during public sale
            // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                    PUBLIC_SALE_START - tmp_time + 86400);
            
            // Buy with erc20
            let purchaseAmountERC20Public = 100000;

            await testToken.approve(
                deHiveTokensale.address,
                purchaseAmountERC20Public,
                {from: user1}
            );

            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                purchaseAmountERC20Public,
                {from: user1}
            );

            expect((await deHiveTokensale.purchased(user1)).toNumber())
                .to.equal(purchaseAmountERC
                         + purchaseAmountNux 
                         + purchaseAmountERC20Public);
            expect((await deHiveTokensale.purchasedPublicSale()).toNumber())
                .to.equal(purchaseAmountERC20Public);
        });

        it('Should return available tokens', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress,
                100000,
                {from: deployer}
            );
            // Advance time to pre-sale
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400)
            
            // Buy all tokens for erc20 tokens in pre-sale
            await testToken.approve(
                deHiveTokensale.address,
                BigInt('45000000000000000000'),
                {from: user1}
            );

            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                BigInt('45000000000000000000'),
                {from: user1}
            );
            // Advance time to public sale
            tmp_blocknum = await web3.eth.getBlockNumber();
            tmp_block = await web3.eth.getBlock(tmp_blocknum);
            tmp_time = tmp_block.timestamp;
            await timeMachine.advanceTimeAndBlock(
                PUBLIC_SALE_START - tmp_time + 86400);
            
            // Buy all tokens for erc20 tokens in public sale
            await testToken.approve(
                deHiveTokensale.address,
                BigInt('120000000000000000000'),
                {from: user1}
            );

            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                BigInt('120000000000000000000'),
                {from: user1}
            );

            expect((await deHiveTokensale.publicSaleAvailableDHV()).toString())
                .to.equal('5000000000000000000');
            

        });
    });
});