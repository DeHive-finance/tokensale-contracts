const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const DeHiveTokensale = artifacts.require('DeHiveTokensaleMock');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

const PRE_SALE_START = 1616544000;
const PRE_SALE_END = 1616716800;

const PUBLIC_SALE_START = 1618358400;
const PUBLIC_SALE_END = 1618704000;

const VESTING_START = 1625097600;
const VESTING_DURATION = 123 * 24 * 60 * 60;
const PRECISION = 1000000;

const addressZero = '0x0000000000000000000000000000000000000000';

describe('Test maxTokenAmount', () => {
    let deployer;
    let user1, user2, treasury;
    let deHiveTokensale, testToken, dhvToken;
    let snapshotId;
    let blocknum, block, time;
    before(async() => {
      [
        deployer, user1, user2, treasury
      ] = await web3.eth.getAccounts();
  
      testToken = await TestToken.new({ from: user1 });
      dhvToken = await DHVToken.new({ from: deployer });
      deHiveTokensale = await deployProxy(DeHiveTokensale,
        [testToken.address,
          testToken.address,
          testToken.address,
          treasury,
          dhvToken.address],
        { from: deployer });
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

          it('Should buy amount of DHV less than maxAmount', async () => {
                // Set rate
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, { from: deployer });
            await deHiveTokensale.adminSetRates(
                testToken.address, PRECISION, { from: deployer });
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            // Buy amount less than max(with ETH)
            let ethAmount = await deHiveTokensale.maxTokensAmount();
            await deHiveTokensale.purchaseDHVwithETH({
                from: user2,
                value: ethAmount
            });
            // Buy amount less than max(with erc)
            let ercAmount = await deHiveTokensale.maxTokensAmount();
            await testToken.approve(
                deHiveTokensale.address,
                ercAmount,
                {from: user1}
            );
            await deHiveTokensale.purchaseDHVwithERC20(
                testToken.address,
                 ercAmount,
                  {from: user1}
            );
        });

        it('Should not buy dhv more than maxAmount', async () => {
             // Set rate
             await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, { from: deployer });
            await deHiveTokensale.adminSetRates(
                testToken.address, PRECISION, { from: deployer });
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            // Try to buy more than Amount max(with ETH)
            let ethAmount = (await deHiveTokensale.maxTokensAmount());
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: ethAmount + 1n
                }),
                "Maximum allowed exceeded"
            );
            // Try to buy more than Amount max(with erc)
            let ercAmount = (await deHiveTokensale.maxTokensAmount());
            await testToken.approve(
                deHiveTokensale.address,
                ercAmount + 1n,
                {from: user1}
            );
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(
                    testToken.address,
                     ercAmount + 1n,
                      {from: user1}
                ),
                "Maximum allowed exceeded"
            );
        });

        it('Should not let buy dhv more than maxAmount in second tx', async () => {
            // Set rate
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, { from: deployer });
            await deHiveTokensale.adminSetRates(
                testToken.address, PRECISION, { from: deployer });
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            // Buy with etn first time
            let ethAmount = await deHiveTokensale.maxTokensAmount();
            await deHiveTokensale.purchaseDHVwithETH({
                from: user2,
                value: ethAmount
            });
            // Try to buy more
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: 1
                }),
                "Maximum allowed exceeded"
            );
            // Buy with erc first time
            let ercAmount = await deHiveTokensale.maxTokensAmount();
            await testToken.approve(
                deHiveTokensale.address,
                ercAmount + 1n,
                {from: user1}
            );
            deHiveTokensale.purchaseDHVwithERC20(
                testToken.address,
                 ercAmount,
                  {from: user1}
            );
            // Try to buy more
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(
                    testToken.address,
                    1,
                    {from: user1}
                ),
                "Maximum allowed exceeded"
            ); 
        });
    });
});