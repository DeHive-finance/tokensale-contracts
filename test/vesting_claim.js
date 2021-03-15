const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const DeHiveTokensale = artifacts.require('DeHiveTokenSaleTest');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

const PRE_SALE_END = 1616716800;
const PUBLIC_SALE_START = 1618358400;
const VESTING_START = 1625097600;
const VESTING_DURATION = 123 * 24 * 60 * 60;

describe('Claim from vesting functionality coverage', () => {
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
        1625097600,
        123 * 24 * 60 * 60,
        0,
        0,
        0,
        dhvToken.address],
        {from: deployer});
    });

    describe('Testset', async () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

       it('Should claim some vested tokens during vest period', async () => {
           // Buy tokens during sale stages
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15

            await testToken.approve(
                deHiveTokensale.address,
                BigInt('100000000000000000'),
                {from: user1}
            );
            await deHiveTokensale.purchaseDHVwithERC20(
                    testToken.address,
                    BigInt('100000000000000000'),
                    {from: user1}
                );
            
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                deHiveTokensale.address,
                BigInt('10000000000000000000000000'),
                {from:deployer}
            );
            // Advance time to vest stage
            await timeMachine.advanceTime(79*86400);
            // Claim vested tokens
            await deHiveTokensale.claim({from: user1});
            const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

            expect(claimedAmount).to.be.greaterThan(0);
            expect((await deHiveTokensale.claimed(user1)).toNumber())
                .to.equal(claimedAmount);
       }); 

       it('Cant claim before vesting period', async () => {
            // Buy tokens during sale stages
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15
            await testToken.approve(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000'),
                    {from: user1}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                        testToken.address,
                        BigInt('10000000000000000000'),
                        {from: user1}
                    );
                
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000000000'),
                    {from:deployer}
                );
            
            // Try to claim
            await truffleAssert.reverts(
                deHiveTokensale.claim({from: user1}),
                "TokenVesting: no tokens are due"
            );
       });

       it('Cant claim tokens if non are purchased', async () => {
           // Advance time to vesting period
            await timeMachine.advanceTime(VESTING_START - time + 86400);
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                deHiveTokensale.address,
                BigInt('10000000000000000000000000'),
                {from:deployer}
            );

            //Try to claim
            await truffleAssert.reverts(
                deHiveTokensale.claim({from: user1}),
                "TokenVesting: no tokens are due"
            );
       });

       it('Should claim all tokens after vesting period', async () => {
             // Buy tokens during sale stages
             await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15
            await testToken.approve(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000'),
                    {from: user1}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                        testToken.address,
                        BigInt('1000000000000000'),
                        {from: user1}
                    );
                
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000000000'),
                    {from:deployer}
                );
            
            // Advance time to the finish of vesting period
            await timeMachine.advanceTime(205*86400);
            // Claim vested tokens
            await deHiveTokensale.claim({from: user1});
            const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

            expect(claimedAmount).to.be.greaterThan(0);
            expect((await deHiveTokensale.claimed(user1)).toNumber())
                .to.equal(claimedAmount);
       });

       it('Should claim exactly 1/127 of vesting', async () => {
            // Buy tokens during sale stages
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15
            await testToken.approve(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000'),
                    {from: user1}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                        testToken.address,
                        BigInt('127000'),
                        {from: user1}
                    );
                
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000000000'),
                    {from:deployer}
                );
            // Set vestingStart + one day
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let diffTime = tmp_block.timestamp; 

            await timeMachine.advanceTime(
                        VESTING_START - diffTime + 86400);
            // Check that time is correct
            // tmp_blocknum = await web3.eth.getBlockNumber();
            // tmp_block = await web3.eth.getBlock(tmp_blocknum);
            // diffTime = tmp_block.timestamp;

            // expect(diffTime).to.equal(VESTING_START + 86400);
             // Claim vested tokens
             await deHiveTokensale.claim({from: user1});
             const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();
             
            expect(claimedAmount)
            .to.equal(1032); // 1032 is exact value which is vested during this time
       });

       it('Cant claim same tokens twice', async () => {
            // Buy tokens during sale stages
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15
            await testToken.approve(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000'),
                    {from: user1}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                        testToken.address,
                        BigInt('127000'),
                        {from: user1}
                    );
                
            // Transfer DHV tokens to TokenSale
            await dhvToken.transfer(
                    deHiveTokensale.address,
                    BigInt('10000000000000000000000000'),
                    {from:deployer}
                );
            // Set vestingStart + one day
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let diffTime = tmp_block.timestamp; 
            await timeMachine.advanceTime(VESTING_START - diffTime + 86400);
            // Claim vested tokens
            await deHiveTokensale.claim({from: user1});
            let claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

            expect(claimedAmount)
            .to.equal((await deHiveTokensale.claimed(user1)).toNumber());
            
            // Try to claim one more time, but claim 0
            await truffleAssert.fails(
                deHiveTokensale.claim({from: user1})
            );
            expect((await deHiveTokensale.claimed(user1)).toNumber())
               .to.equal(claimedAmount); 
            // Claim vesting tokens after 1 day
            await timeMachine.advanceTime(86400);
            console.log('Claimable: ', 
            (await deHiveTokensale.claimable(user1)).toNumber());
            claimedAmount = claimedAmount +
                         (await deHiveTokensale.claimable(user1)).toNumber();
            await deHiveTokensale.claim({from: user1});
            
            // expect((await dhvToken.balanceOf(user1)).toNumber())
            //     .to.equal(claimedAmount);
            expect((await deHiveTokensale.claimed(user1)).toNumber())
                .to.equal(claimedAmount);           
       });
    });
});