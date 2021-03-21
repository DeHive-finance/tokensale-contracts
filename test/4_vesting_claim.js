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

describe('Claim from vesting functionality coverage', () => {
  let deployer;
  let user1, user2, treasury;
  let deHiveTokensale, testToken, dhvToken;
  let snapshotId;
  let testTokenAddress;
  let blocknum, block, time;
  before(async() => {
    [
      deployer, user1, user2, treasury
    ] = await web3.eth.getAccounts();

    testToken = await TestToken.new({ from: user1 });
    dhvToken = await DHVToken.new({ from: deployer });

    testTokenAddress = testToken.address;
    deHiveTokensale = await deployProxy(DeHiveTokensale,
      [testToken.address,
        testToken.address,
        testToken.address,
        treasury,
        dhvToken.address],
      { from: deployer });
  });

  describe('Testset', async() => {
    beforeEach(async() => {
      blocknum = await web3.eth.getBlockNumber();
      block = await web3.eth.getBlock(blocknum);
      time = block.timestamp;
      // Create a snapshot
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
      await deHiveTokensale.adminSetVestingStart(1625097600);
    });

    afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Should claim some vested tokens during vest period', async() => {
      // Buy tokens during sale stages
      await deHiveTokensale.adminSetRates(
        testTokenAddress, PRECISION, { from: deployer });
      await timeMachine.advanceTimeAndBlock(
        PUBLIC_SALE_START - time + 86400); // Get April 15

      await testToken.approve(
        deHiveTokensale.address,
        BigInt('100000000000000000'),
        { from: user1 }
      );
      await deHiveTokensale.purchaseDHVwithERC20(
        testToken.address,
        BigInt('100000000000000000'),
        { from: user1 }
      );

      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );

      //Advance time to vesting stage
      const tmp_blocknum = await web3.eth.getBlockNumber();
      const tmp_block = await web3.eth.getBlock(tmp_blocknum);
      const tmp_time = tmp_block.timestamp;

      await timeMachine.advanceTimeAndBlock(
        VESTING_START - tmp_time + 86400);

      // Claim vested tokens
      await deHiveTokensale.claim({ from: user1 });
      const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

      expect(claimedAmount).to.be.greaterThan(0);
      expect((await deHiveTokensale.claimed(user1)).toNumber())
        .to.equal(claimedAmount);
    });

    it('Cant claim before vesting period', async() => {
      // Buy tokens during sale stages
      await deHiveTokensale.adminSetRates(
        testTokenAddress, PRECISION, { from: deployer });

      await timeMachine.advanceTime(
        PUBLIC_SALE_START - time + 86400); // Get April 15

      await testToken.approve(
        deHiveTokensale.address,
        BigInt('10000000000000000000'),
        { from: user1 }
      );
      await deHiveTokensale.purchaseDHVwithERC20(
        testToken.address,
        BigInt('10000000000000000000'),
        { from: user1 }
      );

      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );

      // Try to claim
      await truffleAssert.reverts(
        deHiveTokensale.claim({ from: user1 }),
        'Not allowed to claim now'
      );
    });

    it('Cant claim tokens if non are purchased', async() => {
      // Advance time to vesting period
      await timeMachine.advanceTime(VESTING_START - time + 86400);
      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );

      //Try to claim
      await truffleAssert.reverts(
        deHiveTokensale.claim({ from: user1 }),
        'TokenVesting: no tokens are due'
      );
    });

    it('Should claim all tokens after vesting period', async() => {
      // Buy tokens during sale stages
      await deHiveTokensale.adminSetRates(
        testTokenAddress, PRECISION, { from: deployer });
      await timeMachine.advanceTime(
        PUBLIC_SALE_START - time + 86400); // Get April 15
      await testToken.approve(
        deHiveTokensale.address,
        BigInt('10000000000000000000'),
        { from: user1 }
      );
      await deHiveTokensale.purchaseDHVwithERC20(
        testToken.address,
        BigInt('1000000000000000'),
        { from: user1 }
      );

      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );

      // Advance time to the end of vesting stage
      tmp_blocknum = await web3.eth.getBlockNumber();
      tmp_block = await web3.eth.getBlock(tmp_blocknum);
      tmp_time = tmp_block.timestamp;
      await timeMachine.advanceTimeAndBlock(
        (VESTING_START + VESTING_DURATION - tmp_time) + 86400);

      // Claim vested tokens
      await deHiveTokensale.claim({ from: user1 });
      const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

      expect(claimedAmount).to.be.greaterThan(0);
      expect((await deHiveTokensale.claimed(user1)).toNumber())
        .to.equal(claimedAmount);
    });

    it('Should claim exactly 1/305 of vesting', async() => {
      // Buy tokens during sale stages
      await deHiveTokensale.adminSetRates(
        testTokenAddress, PRECISION, { from: deployer });
      await timeMachine.advanceTimeAndBlock(
        PUBLIC_SALE_START - time + 86400); // Get April 15
      await testToken.approve(
        deHiveTokensale.address,
        BigInt('10000000000000000000'),
        { from: user1 }
      );
      await deHiveTokensale.purchaseDHVwithERC20(
        testToken.address,
        BigInt('305000'),
        { from: user1 }
      );

      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );
      // Set vestingStart + one day
      const tmp_blocknum = await web3.eth.getBlockNumber();
      const tmp_block = await web3.eth.getBlock(tmp_blocknum);
      const tmp_time = tmp_block.timestamp;

      await timeMachine.advanceTimeAndBlock(
        VESTING_START - tmp_time + 86400);

      await deHiveTokensale.claim({ from: user1 });
      const claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

      expect(claimedAmount)
        .to.equal(1000); // 1000 is exact value which is vested during this time
    });

    it('Cant claim same tokens twice', async() => {
      // Buy tokens during sale stages
      await deHiveTokensale.adminSetRates(
        testTokenAddress, PRECISION, { from: deployer });
      await timeMachine.advanceTimeAndBlock(
        PUBLIC_SALE_START - time + 86400); // Get April 15
      await testToken.approve(
        deHiveTokensale.address,
        BigInt('10000000000000000000'),
        { from: user1 }
      );
      await deHiveTokensale.purchaseDHVwithERC20(
        testToken.address,
        BigInt('127000'),
        { from: user1 }
      );

      // Transfer DHV tokens to TokenSale
      await dhvToken.mint(
        deHiveTokensale.address,
        BigInt('10000000000000000000000000'),
        { from: deployer }
      );
      // Set vestingStart + one day
      const tmp_blocknum = await web3.eth.getBlockNumber();
      const tmp_block = await web3.eth.getBlock(tmp_blocknum);
      const tmp_time = tmp_block.timestamp;

      await timeMachine.advanceTimeAndBlock(
        VESTING_START - tmp_time + 86400);
      // Claim vested tokens
      await deHiveTokensale.claim({ from: user1 });
      let claimedAmount = (await dhvToken.balanceOf(user1)).toNumber();

      expect(claimedAmount)
        .to.equal((await deHiveTokensale.claimed(user1)).toNumber());

      // Try to claim one more time, but claim 0
      await truffleAssert.fails(
        deHiveTokensale.claim({ from: user1 })
      );
      expect((await deHiveTokensale.claimed(user1)).toNumber())
        .to.equal(claimedAmount);
      // Claim vesting tokens after 1 day
      await timeMachine.advanceTimeAndBlock(86400);
      console.log('Claimable: ',
        (await deHiveTokensale.claimable(user1)).toNumber());
      claimedAmount +=
                         (await deHiveTokensale.claimable(user1)).toNumber();
      await deHiveTokensale.claim({ from: user1 });

      expect((await dhvToken.balanceOf(user1)).toNumber())
        .to.equal(claimedAmount);
      expect((await deHiveTokensale.claimed(user1)).toNumber())
        .to.equal(claimedAmount);
    });
  });
});
