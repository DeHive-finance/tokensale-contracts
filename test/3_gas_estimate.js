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
const PRE_SALE_END = 1616716800;

const PUBLIC_SALE_START = 1618358400;
const PUBLIC_SALE_END = 1618704000;

const VESTING_START = 1625097600;
const VESTING_DURATION = 123 * 24 * 60 * 60;

const addressZero = '0x0000000000000000000000000000000000000000';

describe('Gas estimate', () => {
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

    describe('Gas test', () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Call AdminSetRate and get gas estimate', async () => {
            let gasEstimate = await deHiveTokensale.adminSetRates.estimateGas(
                testTokenAddress,
                100000,
                {from: deployer}
            );
            console.log('AdminSetRate for erc20: ', gasEstimate);
            gasEstimate = await deHiveTokensale.adminSetRates.estimateGas(
                addressZero,
                100000,
                {from: deployer}
            );
            console.log('AdminSetRate for eth: ', gasEstimate);
        });

        it('Call AdminSetTreasury and get gas estimate', async () => {
            await timeMachine.advanceTime(PUBLIC_SALE_END - time + 86400);

            const gasEstimate = await deHiveTokensale.adminSetTreasury.estimateGas(
                user2,
                {from: deployer}
            );
            console.log('AdminSetTreasury: ', gasEstimate);
        });

        it('Call adminPause and unpause and get gas estimate', async () => {
            let gasEstimate = await deHiveTokensale.adminPause.estimateGas(
                {from: deployer}
            );
            console.log('AdminPause:', gasEstimate);
            await deHiveTokensale.adminPause({from: deployer});
            gasEstimate = await deHiveTokensale.adminUnpause.estimateGas(
                {from: deployer}
            );
            console.log('AdminUnPause:', gasEstimate);
        });

        it('Call PurchaseWithERC20 and get gas estimate', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await testToken.approve(deHiveTokensale.address, 2000000, {from: user1});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);

            let gasEstimate = await deHiveTokensale.purchaseDHVwithERC20.estimateGas(
                testTokenAddress,
                1000000,
                {from: user1}
            );
            console.log('purchaseDHVwithERC20 during pre-sale', gasEstimate);

            //  // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                    PUBLIC_SALE_START - tmp_time + 86400); 

            gasEstimate = await deHiveTokensale.purchaseDHVwithERC20.estimateGas(
                testTokenAddress,
                1000000,
                {from: user1}
            );
            console.log('purchaseDHVwithERC20 during public sale', gasEstimate);
        });

        it('Call purchaseDHVwithNUX() and get gas estimate', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            await testToken.approve(deHiveTokensale.address, 2000000, {from: user1});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);

            let gasEstimate = await deHiveTokensale.purchaseDHVwithERC20.estimateGas(
                testTokenAddress,
                1000000,
                {from: user1}
                );
            console.log('purchaseDHVwithNUX: ', gasEstimate);
        });

        it('Call purchaseDHVwithETH() and get gas estimate', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, 100000, {from: deployer});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);

            let gasEstimate = await deHiveTokensale.purchaseDHVwithETH.estimateGas(
                {    from: user2,
                     value: await web3.utils.toWei('1', 'ether')
                });
            console.log('purchaseDHVwithETH during pre-sale', gasEstimate);
            // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;
            await timeMachine.advanceTimeAndBlock(
                PUBLIC_SALE_START - tmp_time + 86400);
            
            gasEstimate = await deHiveTokensale.purchaseDHVwithETH.estimateGas(
                {    from: user2,
                     value: await web3.utils.toWei('1', 'ether')
                });
                console.log('purchaseDHVwithETH during public sale', gasEstimate);
        });

        it('Call adminWithdrawERC20 and adminWithdraw and get gas estimate',
             async () => {
            // Set rates
            await deHiveTokensale.adminSetRates(
                addressZero, 100000, {from: deployer});
            await deHiveTokensale.adminSetRates(
                testTokenAddress, 100000, {from: deployer});
            // Advance time to public sale
            await timeMachine.advanceTimeAndBlock(PUBLIC_SALE_START - time + 86400);

            await testToken.transfer(
                deHiveTokensale.address,
                100000,
                {from: user1}
            );
            
            await web3.eth.sendTransaction({
                from: deployer,
                to: deHiveTokensale.address,
                value: await web3.utils.toWei('1', 'ether')}
            );
            // Advance time to the end of sale stages
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;
            
            await timeMachine.advanceTimeAndBlock(PUBLIC_SALE_END - time + 86400);

            let gasEstimate = await deHiveTokensale.adminWithdrawERC20.estimateGas(
                testTokenAddress,
                {from: deployer}
            );
            console.log('adminWithdrawERC20: ', gasEstimate);

            // gasEstimate = await deHiveTokensale.adminWithdraw.estimateGas(
            //     {from: deployer}
            // );

            // console.log('adminWithdraw: ', gasEstimate);
        });

        it('Call claim and get gas estimate', async () => {
            await deHiveTokensale.adminSetVestingStart(1625097601, {from: deployer});
            // setting rate, buying dhv
            await deHiveTokensale.adminSetRates(
                addressZero, 100000, {from: deployer});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            
            await deHiveTokensale.purchaseDHVwithETH(
                {   from: user2,
                    value: await web3.utils.toWei('1', 'ether')
                });
            
            dhvToken.mint(
                deHiveTokensale.address,
                BigInt('5000000000000000000'),
                {from: deployer}
            );

            //Advance time to vesting stage
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                VESTING_START - tmp_time + 86400);
            
            // Call claim during vesting stage
            gasEstimate = await deHiveTokensale.claim.estimateGas(
                {from: user2}
            );
            console.log('Claim during vesting:', gasEstimate);

            // Advance time to the end of vesting stage
            tmp_blocknum = await web3.eth.getBlockNumber();
            tmp_block = await web3.eth.getBlock(tmp_blocknum);
            tmp_time = tmp_block.timestamp;
            await timeMachine.advanceTimeAndBlock(
                (VESTING_START + VESTING_DURATION - tmp_time) + 86400);
            
            // Call claim after vesting stage 
            gasEstimate = await deHiveTokensale.claim.estimateGas(
                {from: user2}
            );
            console.log('Claim after vesting:', gasEstimate);
        });

        it('Call adminSetVestingStart() and get gas estimate', async () => {
            let gasEstimate = await deHiveTokensale.adminSetVestingStart.estimateGas(
                VESTING_START,
                {from: deployer}
            );
            console.log('adminSetVestingStart(): ', gasEstimate);
        });

    });
});