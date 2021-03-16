const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const DeHiveTokensale = artifacts.require('DeHiveTokensaleTest');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

const PRE_SALE_START = 1616544000;
const PRE_SALE_END = 1616716800;

const PUBLIC_SALE_START = 1618358400;
const PUBLIC_SALE_END = 1618704000;

const VESTING_START = 1625097600;
const VESTING_DURATION = 123 * 24 * 60 * 60;

const addressZero = '0x0000000000000000000000000000000000000000';

describe('Test receive() and purchaseDHVwithERC20()', () => {
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
        VESTING_START,
        VESTING_DURATION,
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

        it('Purchase DHV with ETH', async () => {
        // Set rate
        await deHiveTokensale.adminSetRates(
            addressZero, 100000, {from: deployer});
        // Advance time to pre-sale stage
        await timeMachine.advanceTimeAndBlock(
            PRE_SALE_START - time + 86400);
        // Buy for eth
        const ethValue = await web3.utils.toWei('0.00000000001', 'ether');
        let userBalance = await web3.eth.getBalance(user1);
        userBalance = await web3.utils.fromWei(
            userBalance.toString(),
             'ether'
        );

        let treasuryBalance = await web3.eth.getBalance(treasury);
        treasuryBalance = await web3.utils.fromWei(
            treasuryBalance.toString(),
             'ether'
        );

        await deHiveTokensale.purchaseDHVwithETH(
            {
                from: user1,
                value: ethValue
            });

        expect((await deHiveTokensale.purchasedPreSale()).toNumber())
            .to.equal(Number(ethValue));

        let currUserBalance = await web3.eth.getBalance(user1);
        currUserBalance = await web3.utils.fromWei(
            currUserBalance.toString(),
             'ether'
        );
        let currTreasuryBalance = await web3.eth.getBalance(treasury);
        currTreasuryBalance = await web3.utils.fromWei(
            currTreasuryBalance.toString(),
             'ether'
        );

        console.log('User balance before buying: ', userBalance);
        console.log('User balance after buying: ', currUserBalance);
        expect(Number(userBalance)).to.be.greaterThan(Number(currUserBalance));

        console.log('Treasury balance before buying: ', treasuryBalance);
        console.log('treasury balance after buying: ', currTreasuryBalance);
        });

        it('Send eth to contract address and buy DHV', async () => {
        // Set rate
        await deHiveTokensale.adminSetRates(
            addressZero, 100000, {from: deployer});
        // Advance time to pre-sale stage
        await timeMachine.advanceTimeAndBlock(
            PRE_SALE_START - time + 86400);
        // Send eth to contract address
        const ethValue = await web3.utils.toWei('0.00000000001', 'ether');
        let userBalance = await web3.eth.getBalance(user1);
        userBalance = await web3.utils.fromWei(
            userBalance.toString(),
             'ether'
        );

        let treasuryBalance = await web3.eth.getBalance(treasury);
        treasuryBalance = await web3.utils.fromWei(
            treasuryBalance.toString(),
             'ether'
        );
        
        await web3.eth.sendTransaction(
            {
                from: user1,
                to: deHiveTokensale.address,
                value: ethValue
            });

        expect((await deHiveTokensale.purchasedPreSale()).toNumber())
        .to.equal(Number(ethValue));

        let currUserBalance = await web3.eth.getBalance(user1);
        currUserBalance = await web3.utils.fromWei(
            currUserBalance.toString(),
            'ether'
        );
        let currTreasuryBalance = await web3.eth.getBalance(treasury);
        currTreasuryBalance = await web3.utils.fromWei(
            currTreasuryBalance.toString(),
            'ether'
        );

        console.log('User balance before buying: ', userBalance);
        console.log('User balance after buying: ', currUserBalance);
        expect(Number(userBalance)).to.be.greaterThan(Number(currUserBalance));

        console.log('Treasury balance before buying: ', treasuryBalance);
        console.log('treasury balance after buying: ', currTreasuryBalance);
        });

        it('Should not send 0 eth', async () => {
            // Set rate
        await deHiveTokensale.adminSetRates(
            addressZero, 100000, {from: deployer});
        // Advance time to pre-sale stage
        await timeMachine.advanceTimeAndBlock(
            PRE_SALE_START - time + 86400);
        // Send 0 eth
        await truffleAssert.fails(
            web3.eth.sendTransaction(
                {
                    from: user1,
                    to: deHiveTokensale.address,
                    value: 0
                })
        );
        });

        it('Cant send eth if sale stages are over', async () => {
        // Set rate
        await deHiveTokensale.adminSetRates(
            addressZero, 100000, {from: deployer});
        // Try to send eth
        const ethValue = await web3.utils.toWei('0.00000000001', 'ether');
        await truffleAssert.reverts(
             web3.eth.sendTransaction(
                {
                    from: user1,
                    to: deHiveTokensale.address,
                    value: ethValue
                }),
                "Sale stages are over"
        );
        // Advance time to the end of pre-sale
        await timeMachine.advanceBlock(
            PRE_SALE_END - time + 86400);      
        
        // Try to send eth
        await truffleAssert.reverts(
            web3.eth.sendTransaction(
                {
                    from: user1,
                    to: deHiveTokensale.address,
                    value: ethValue
                }),
            "Sale stages are over"
        );
    });
  });
});