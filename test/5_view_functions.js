const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const DHTokensale = artifacts.require("DeHiveTokensaleMock");
const DHVT=artifacts.require("DHVToken");
const TestERC20 = artifacts.require("TestERC20");

describe("Test set for public view functions", ()=>{
    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
    let deployer, user;
    let treasury;
    let tokensale;
    let testToken, testaddr;
    let amount, precision, ethrate, calc;
    let calc_returned;
    let time, blocknum, block;
    let prestart, preend, vstart, vdur, pubstart;
    let claimed, claimable;
    before(async() => {
        [
          deployer,
          treasury,
          user
        ] = await web3.eth.getAccounts();
        dhv=await DHVT.new({from:deployer});
        testToken = await TestERC20.new({from:deployer});
        testaddr=testToken.address;
        tokensale = await deployProxy(DHTokensale, [testaddr, testaddr, testaddr, 
            treasury,
            0, 0, 0, 
            dhv.address], {from:deployer});
        precision=await tokensale.PRECISION.call();
        amount=await Math.pow(10,18);
        pubstart = await tokensale.PUBLIC_SALE_START.call();
        prestart =await tokensale.PRE_SALE_START.call();
        preend = await tokensale.PRE_SALE_END.call();
        vdur = await tokensale.vestingDuration.call()
        

    });
    beforeEach(async() => {
        const snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
    });
    afterEach(async()=>await timeMachine.revertToSnapshot(snapshotId));

    it("rateForToken() zero address provided", async ()=>{
        await tokensale.adminSetRates(NULL_ADDRESS, 100, {from: deployer});
        ethrate =await tokensale.ETHRate.call();
        calc = amount*ethrate/precision;
        calc_returned = await tokensale.rateForToken(NULL_ADDRESS);
        expect(await calc_returned.toNumber()).to.equal(calc);
    });

    it("rateForToken() non zero provided", async ()=>{
        await tokensale.adminSetRates(testaddr, 150, {from: deployer});
        ethrate =await tokensale.rates(testaddr);
        calc = amount*ethrate/precision;
        calc_returned = await tokensale.rateForToken(testaddr);
        expect(await calc_returned.toNumber()).to.equal(calc);
    });

    it("claimed()/claimable() return correct value", async ()=>{
        await tokensale.adminSetVestingStart(1625097600);
        vstart = await tokensale.vestingStart.call();
        await tokensale.adminSetRates(NULL_ADDRESS, 10000, {from: deployer});
        blocknum = await web3.eth.getBlockNumber();
        block = await web3.eth.getBlock(blocknum);
        time = block.timestamp;
        await timeMachine.advanceTimeAndBlock(pubstart - time + 86400);
        await tokensale.purchaseDHVwithETH({from: user, value: 10000000});
        blocknum = await web3.eth.getBlockNumber();
        block = await web3.eth.getBlock(blocknum);
        time=block.timestamp;
        await timeMachine.advanceTimeAndBlock(vstart - time + 86400);
        await console.log("Advanced time: ", time);
        calc_returned = await tokensale.claimable(user);
        expect(await calc_returned).to.not.equal(0);
        await dhv.transfer(tokensale.address, 10000, {from: deployer});
        await tokensale.claim({from: user});
        expect((await dhv.balanceOf(user)).toNumber()).to.equal(await (calc_returned).toNumber());
        claimed = await tokensale.claimed(user)
        claimable = await tokensale.claimable(user)
        expect(await claimed.toNumber()-calc_returned.toNumber()).to.equal(0);
    });
});