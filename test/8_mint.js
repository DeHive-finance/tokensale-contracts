const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const DHVT = artifacts.require('DHVToken');

describe('Test set for public view functions', () => {
  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
  let deployer, user;
  let dhv;
  let snapshotId;
  before(async() => {
    [
      deployer,
      user
    ] = await web3.eth.getAccounts();
    dhv = await DHVT.new({ from: deployer });
  });
  beforeEach(async() => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];
  });
  afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));
  it('Can\'t mint on null address', async() => {
    await truffleAssert.reverts(dhv.mint(NULL_ADDRESS, 1000000, { from: deployer }), 'Zero address');
  });
  it('Can\'t mint on zero amount', async() => {
    await truffleAssert.reverts(dhv.mint(user, 0, { from: deployer }), 'Incorrect amount');
  });
  it('Won\'t cause hardcap overflow', async() => {
    let cap = await dhv.cap();
    await truffleAssert.reverts(dhv.mint(user, cap + 1n, { from: deployer }), 'Total supply exceeds cap');
  });
  it('Mint correct value', async() => {
    await dhv.mint(user, 1000000, { from: deployer });
    expect((await dhv.totalSupply()).toNumber()).to.equal(1000000);

  });
});
