const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const DHTokensale = artifacts.require("DeHiveTokensaleMock");
const DHVT=artifacts.require("DHVToken");
const TestERC20 = artifacts.require("TestERC20");


describe("Test set for token properties", ()=>{
    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
    let deployer;
    let treasury;
    let tokensale;
    let oldtoken;
    let user;
    let oldTreasury;
    let testToken;
    let testaddr;
    let time;
    let blocknum;
    let block;
    let isNotOver;
    let prestart;
    let preend;
    before(async() => {
        [
          deployer,
          treasury,
          user, 
          oldDhv, oldTreasury,
          oldtoken
        ] = await web3.eth.getAccounts();
        dhv=await DHVT.new({from:deployer});
        testToken = await TestERC20.new({from:deployer});
        tokensale = await deployProxy(DHTokensale, [oldTreasury,oldDhv, oldtoken, oldtoken, oldtoken], {from: deployer});
        prestart =await tokensale.PRE_SALE_START.call();
        preend = await tokensale.PRE_SALE_END.call();
        testaddr=testToken.address;
    });

    describe("DHTokensale creation", ()=>{
        it("Right token addresses", async()=>{
            expect(await tokensale.DHVToken()).to.equal(oldDhv);
            expect(await tokensale.getUSDTToken()).to.equal(oldtoken);
            expect(await tokensale.getDAIToken()).to.equal(oldtoken);
            expect(await tokensale.getNUXToken()).to.equal(oldtoken);
        });
        it("Upgrades correctly, saves previous values", async()=>{
            tokensale = await deployProxy(DHTokensale, [treasury, dhv.address, testaddr, testaddr, testaddr]);
            expect(await tokensale.DHVToken()).to.equal(dhv.address);
            expect(await tokensale.getUSDTToken()).to.equal(testaddr);
            expect(await tokensale.getDAIToken()).to.equal(testaddr);
            expect(await tokensale.getNUXToken()).to.equal(testaddr);
        });
    });
    describe("Tokensale admin methods", ()=>{
        beforeEach(async() => {
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
        });
        afterEach(async()=>await timeMachine.revertToSnapshot(snapshotId));

        it("adminSetRates() zero address provided", async()=>{
            await tokensale.adminSetRates(NULL_ADDRESS, 100, {from: deployer});
            expect((await tokensale.ETHRate()).toNumber()).to.equal(100);
        });

        it("adminSetRates() non-zero address provided", async () =>{
            await tokensale.adminSetRates(testToken.address, 100000, {from: deployer});
            expect((await tokensale.rates(testToken.address)).toNumber()).to.equal(100000);
        });

        it("adminWithdraw() works", async ()=>{
            let current_balance = await web3.eth.getBalance(tokensale.address);
            let treasury_balance = await web3.eth.getBalance(treasury);
            expect(await Number(current_balance)).to.equal(0);
            await web3.eth.sendTransaction({
                from: user,
                to: tokensale.address,
                value: web3.utils.toWei('0.000000001', 'ether'),
              });
            current_balance = await web3.eth.getBalance(tokensale.address);
            expect(await Number(current_balance)).to.equal(1000000000);
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            isNotOver = await (time<preend);
            if(isNotOver){
                await console.log("Advanced time: ",time+(preend-time+1));
                await timeMachine.advanceTime(time+(preend-time+1));
             }
            await console.log("Advanced time: ",block.timestamp)
            await tokensale.adminWithdraw({from: deployer});
            current_balance = await web3.eth.getBalance(tokensale.address);
            expect(await Number(current_balance)).to.equal(0);
            let balance = await  web3.eth.getBalance(treasury);
            expect(Number(balance)).to.equal(Number(treasury_balance)+1000000000);
        });

        it("adminWithdrawERC20() works", async ()=>{
            expect((await testToken.balanceOf(tokensale.address)).toNumber()).to.equal(0);
            expect((await testToken.balanceOf(treasury)).toNumber()).to.equal(0);
            await testToken.transfer(tokensale.address, 10000, {from: deployer});
            expect((await testToken.balanceOf(tokensale.address)).toNumber()).to.equal(10000);
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            isNotOver = await (time<preend);
            if(isNotOver){
                await console.log("Advanced time: ",time+(preend-time+1));
                await timeMachine.advanceTime(time+(preend-time+1));
             }
            await tokensale.adminWithdrawERC20(testToken.address, {from: deployer});

            expect((await testToken.balanceOf(tokensale.address)).toNumber()).to.equal(0);
            expect((await testToken.balanceOf(treasury)).toNumber()).to.equal(10000);
        });

        it("adminPause() works", async()=>{
            await tokensale.adminSetRates(testToken.address, 100000, {from: deployer});
            await tokensale.adminPause({from: deployer});
            expect(await tokensale.paused()).to.be.true;
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            isNotOver = await  (time>prestart);
            if(!isNotOver){
               await console.log("Advanced time: ", time+(prestart-time+1));
               await timeMachine.advanceTime(prestart-time+1);
            }
            await truffleAssert.reverts(tokensale.purchaseDHVwithERC20(testToken.address, 10000, {from: user}),
                "Pausable: paused"
            );
            await tokensale.adminUnpause({from: deployer});
        });

        it("adminUnpause() works", async()=>{
            if(!isNotOver){
                await console.log("Advanced time: ", time+(prestart-time+1));
                await timeMachine.advanceTime(prestart-time+1);
             }
            await tokensale.adminPause({from: deployer});
            expect(await tokensale.paused()).to.be.true;
            await tokensale.adminUnpause({from: deployer});
            expect(await tokensale.paused()).to.be.false;
            await truffleAssert.reverts(tokensale.purchaseDHVwithERC20(testToken.address, 0, {from: user}),
                "Zero amount"
            );
        });
    });
})