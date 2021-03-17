const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const DHTokensale = artifacts.require("DeHiveTokensaleMock");
const DHVT=artifacts.require("DHVTestMock");
const TestERC20 = artifacts.require("TestERC20");

describe("Test set for public view functions", ()=>{
    const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
    let deployer, user;
    let treasury;
    let tokensale;
    let testToken, testaddr;
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
        

    });
    beforeEach(async() => {
        const snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
    });
    afterEach(async()=>await timeMachine.revertToSnapshot(snapshotId));
    it("Can't mint on null address", async ()=>{
        await truffleAssert.reverts(dhv.mint(NULL_ADDRESS, 1000000, {from: deployer}), "Null address provided");
    })
    it("Can't mint on zero amount", async ()=>{
        await truffleAssert.reverts(dhv.mint(user, 0, {from: deployer}), "Incorrect amount");
    })
    it("Won't cause hardcap overflow", async ()=>{
        await dhv.setHardcap(1000);
        await truffleAssert.reverts(dhv.mint(user,1000000, {from: deployer}), "Total supply exceeds hard cap");
    })
    it("Mint correct value", async ()=>{
        await dhv.mint(user, 1000000, {from: deployer});
        expect((await dhv.totalSupply()).toNumber()).to.equal(1000000);

    });
});