const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');
const { default: BigNumber } = require('bignumber.js');

const DeHiveTokensaleMock = artifacts.require('DeHiveTokensaleMock');
const TestToken = artifacts.require('TestToken');
const DHVToken = artifacts.require('DHVToken');

//const DAItoken = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const unsupportedToken = '0xc944e90c64b2c07662a292be6244bdf05cda44a7';

const addressZero = '0x0000000000000000000000000000000000000000';
const PRE_SALE_START = 1616544000;
const PRE_SALE_END = 1616716800;

const PUBLIC_SALE_START = 1618358400;
const PUBLIC_SALE_END = 1618704000;

const PRECISION = 1000000


describe('Purchase DHV test coverage', () => {
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

        testToken = await TestToken.new({from: deployer});
        dhvToken = await DHVToken.new({from: deployer});
       
       testTokenAddress = testToken.address;
       deHiveTokensale = await deployProxy(DeHiveTokensaleMock, 
        [testToken.address,
        testToken.address,
        testToken.address,
        treasury,
        dhvToken.address],
        {from: deployer});

        await testToken.transfer(user1, 20, {from: deployer});
        await testToken.approve(deHiveTokensale.address, 20, {from: user1});
        await deHiveTokensale.adminSetMaxDHV(await deHiveTokensale.PUBLIC_SALE_DHV_POOL());
    });

    describe('Deposit in ERC20 functionality coverage', () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Sets rates', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            expect((await deHiveTokensale.rates(testTokenAddress)).toNumber())
            .to.equal(PRECISION);
        });

        it('Should buy DHV in presale', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);

            await deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1});

            expect((await deHiveTokensale.purchased(user1)).toNumber()).to.equal(20);
            expect((await deHiveTokensale.purchasedPreSale()).toNumber()).to.equal(20);
            expect((await testToken.balanceOf(treasury)).toNumber())
                .to.equal(20);
        });

        it('Should buy DHV in public sale', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            await timeMachine.advanceTime(
                PUBLIC_SALE_START - time + 86400); // Get April 15

            await deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1});
            expect((await deHiveTokensale.purchased(user1)).toNumber()).to.equal(20);
            expect((await deHiveTokensale.purchasedPublicSale()).toNumber()).to.equal(20);
            expect((await testToken.balanceOf(treasury)).toNumber())
                .to.equal(20);
        });

        it('Should not let deposit with unsupported token', async () => {
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);

            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(unsupportedToken, 20, {from: user1}),
                "Token not supported"
            );
        });

        it('Should not let buy DHV when paused', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});

                await timeMachine.advanceTime(
                    PRE_SALE_END - time - 40000);

            await deHiveTokensale.adminPause({from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Pausable: paused"
            );
        });

        it('Amount must be greater than 0', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});

            await timeMachine.advanceTime(
                    PRE_SALE_END - time - 40000);

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 0, {from: user1}),
                "Zero amount"
            );
        });

        it('rate should be set first', async () => {
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Rates not set"
            );
        });

        it('Cant buy tokens during presale stage if presale pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            
            // Advance time to presale stage
                await timeMachine.advanceTime(
                    PRE_SALE_END - time - 40000);
            
            let maxTokens = await deHiveTokensale.PRE_SALE_DHV_POOL();
            // Buy all tokens from presale pool
            await testToken.approve(
                 deHiveTokensale.address,
                 maxTokens + 1n,
                 {from: deployer}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                maxTokens,
                {from: deployer}
                );

            // Try tu buy more tokens
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(
                    testTokenAddress,
                     1,
                    {from: deployer}),
                "Not enough DHV in presale pool"
            );
        });

        it('Cant buy tokens while sale stages are over', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Sale stages are over"
            );
            
            await timeMachine.advanceTime(
                PRE_SALE_END - time + 86400);

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(testTokenAddress, 20, {from: user1}),
                "Sale stages are over"
            );
        });

        it('Cant buy tokens during public stage if public pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            
           // Advance time to pre-sale stage
           await timeMachine.advanceTimeAndBlock(
            PRE_SALE_START - time + 86400);

            let maxTokens = await deHiveTokensale.PRE_SALE_DHV_POOL();
            
            // Buy all tokens from presale pool
            await testToken.approve(
                deHiveTokensale.address,
                maxTokens + 1n,
                {from: deployer}
                );
            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                maxTokens,
                {from: deployer}
            );
            
            maxTokens = await deHiveTokensale.PRE_SALE_DHV_NUX_POOL();
            // Buy all token from nux presale pool
            await testToken.approve(
                deHiveTokensale.address,
                maxTokens + 1n,
                {from: deployer}
                );
            await deHiveTokensale.purchaseDHVwithNUX(
                maxTokens,
                {from: deployer}
            );

            //  // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                    PUBLIC_SALE_START - tmp_time + 86400); 

            maxTokens = await deHiveTokensale.PUBLIC_SALE_DHV_POOL();
            // Buy all tokens from public pool
            await testToken.approve(
                    deHiveTokensale.address,
                    maxTokens + 1n,
                    {from: deployer}
                    );
            await deHiveTokensale.purchaseDHVwithERC20(
                testTokenAddress,
                maxTokens,
                {from: deployer}
                );

            // Try to buy more tokens
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithERC20(
                    testTokenAddress,
                    1,
                    {from: deployer}),
                "Not enough DHV in sale pool"
            );
        });
    });

    describe('Deposit in ETH functionality coverage', () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];          
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Should buy tokens with eth in presale', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});

            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);
            
            // Save balances
            let balanceBeforeBuying = await web3.eth.getBalance(user2);
            balanceBeforeBuying = await web3.utils.fromWei(
                await balanceBeforeBuying.toString(),
                'ether'
            );

            let treasuryBalance = await web3.eth.getBalance(treasury);
            treasuryBalance = web3.utils.fromWei(treasuryBalance.toString(), 'ether');


            // Purchase for the first time
            await deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                     value: await web3.utils.toWei('1', 'ether')  
                        });

            expect(web3.utils.fromWei((await deHiveTokensale.purchased(user2))
                    .toString(), 'ether'), "Purchase balance changed")
                    .to.equal('1');
            expect(web3.utils.fromWei((await deHiveTokensale.purchasedPreSale())
                    .toString(), 'ether'), "Total purchased changed")
                    .to.equal('1');  


            let current_balance = await web3.eth.getBalance(user2);
            current_balance = (web3.utils.fromWei(current_balance.toString(), 'ether'));
            expect(Number(current_balance), "ETH not transferred from user")
                .to.be.lessThan(Number(balanceBeforeBuying));

            current_balance = await web3.eth.getBalance(treasury);
            current_balance = (web3.utils.fromWei(current_balance.toString(),'ether'));
            expect(Number(current_balance), "ETH not transferred to treasury")
                .to.equal(Number(treasuryBalance) + 1);


            // Wait for public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;
            await timeMachine.advanceTime(PUBLIC_SALE_END - tmp_time - 40000);

            // Save balances
            balanceBeforeBuying = await web3.eth.getBalance(user2);
            balanceBeforeBuying = await web3.utils.fromWei(balanceBeforeBuying.toString(), 'ether');
    
            treasuryBalance = await web3.eth.getBalance(treasury);
            treasuryBalance = web3.utils.fromWei(treasuryBalance.toString(),'ether');


            // Purchase for the second time (public)
            await deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                     value: await web3.utils.toWei('1', 'ether')  
                        });
            expect(web3.utils.fromWei((await deHiveTokensale.purchased(user2))
                        .toString(), 'ether'), "Purchase balance changed (2)")
                        .to.equal('2');
            expect(web3.utils.fromWei((await deHiveTokensale.purchasedPublicSale())
                        .toString(), 'ether'), "Total purchased changed (2)")
                        .to.equal('1');        
            
            current_balance = await web3.eth.getBalance(user2);
            current_balance = (web3.utils.fromWei(current_balance.toString(),'ether'));
            expect(Number(current_balance), "ETH not transferred from user2")
                .to.be.lessThan(Number(balanceBeforeBuying));
        
            current_balance = await web3.eth.getBalance(treasury);
            current_balance = (web3.utils.fromWei(current_balance.toString(),'ether'));
             expect(Number(current_balance), "ETH not transferred to treasury (2)")
                    .to.equal(Number(treasuryBalance) + 1);
        
        });

        it('Should sell tokens only during sale stages', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                from: user2,
                value: await web3.utils.toWei('1', 'ether')  
                }),
            "Sale stages are over"
            );
            
            await timeMachine.advanceTime(
                PRE_SALE_END - time + 86400);

             await truffleAssert.reverts(
                    deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: await web3.utils.toWei('1', 'ether')  
                    }),
                "Sale stages are over"
                );
        });

        it('Cant buy tokens when paused', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});

            await timeMachine.advanceTime(
                    PRE_SALE_END - time - 40000);
            await deHiveTokensale.adminPause({from: deployer});

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: await web3.utils.toWei('1', 'ether')  
                    }),
                    "Pausable: paused"
            );
        });

        it('Amount of eth must be greater than 0', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});
            await timeMachine.advanceTime(
                    PRE_SALE_END - time - 40000);
            
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: 0  
                    }),
                "No ETH sent"
            );
        });

        it('Rate must be set first', async () => {
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);

            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: await web3.utils.toWei('1', 'ether')  
                    }),
                "Rates not set"
            );
        });
        
        it('Cant buy tokens during presale if presale pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            
            let maxTokens = await deHiveTokensale.PRE_SALE_DHV_POOL();
            // Buy all tokens from presale pool with eth
            await deHiveTokensale.purchaseDHVwithETH({
                from: user2,
                value: maxTokens.toString()  
                });

            // Try to buy more tokens with eth
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: 1  
                    }),
                "Not enough DHV in presale pool"
            );
        });

        it('Cant buy tokens during public sale if public pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                addressZero, PRECISION, {from: deployer});
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});

            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            
            let maxTokens = await deHiveTokensale.PRE_SALE_DHV_POOL();
            // Buy all tokens tokens from presale pool with eth
            await deHiveTokensale.purchaseDHVwithETH({
                from: user1,
                value: maxTokens.toString()
                });
            
            // Buy all tokens with nux from presale pool
            maxTokens = await deHiveTokensale.PRE_SALE_DHV_NUX_POOL();
            await testToken.approve(
                deHiveTokensale.address,
                maxTokens + 1n,
                {from: deployer}
                );
            await deHiveTokensale.purchaseDHVwithNUX(
                maxTokens,
                {from: deployer}
            );

            //  // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                    PUBLIC_SALE_START - tmp_time + 86400); 
            
            /* 
                Buy All tokens from public sale pool
            */
           const user2Balance = await web3.utils.fromWei(
            await web3.eth.getBalance(user2),
            'ether'
            );
            // Add ether if amount exceeds balance
           if(await(user2Balance < 120)) {
            await web3.eth.sendTransaction(
                { to:user2,
                 from:deployer,
                 value: maxTokens});
            }

            maxTokens = await deHiveTokensale.PUBLIC_SALE_DHV_POOL();
            await deHiveTokensale.purchaseDHVwithETH({
                    from: user2,
                    value: maxTokens  
                        });
            
            // Try to buy more tokens
            await truffleAssert.reverts(
                    deHiveTokensale.purchaseDHVwithETH({
                        from: user2,
                        value: 1  
                        }),
                    "Not enough DHV in sale pool"
                );
        });
    });

    describe('Deposit in NUX functionality coverage', async () => {
        beforeEach(async() => {
            blocknum = await web3.eth.getBlockNumber();
            block = await web3.eth.getBlock(blocknum);
            time = block.timestamp;
            // Create a snapshot
            const snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
           });
    
        afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

        it('Can buy tokens with NUX only during presale stage', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            // Advance time to pre-sale stage
            await timeMachine.advanceTimeAndBlock(
                PRE_SALE_START - time + 86400);
            
            // Buy tokens with nux during presale
            await deHiveTokensale.purchaseDHVwithNUX(
                    20,
                    {from: user1}
                );

            expect((await deHiveTokensale.purchased(user1)).toNumber()).to.equal(20);
            expect((await deHiveTokensale.purchasedWithNUX()).toNumber()).to.equal(20);
            expect((await testToken.balanceOf(treasury)).toNumber())
                .to.equal(20);
            
            //  // Advance time to public sale
            let tmp_blocknum = await web3.eth.getBlockNumber();
            let tmp_block = await web3.eth.getBlock(tmp_blocknum);
            let tmp_time = tmp_block.timestamp;

            await timeMachine.advanceTimeAndBlock(
                    PUBLIC_SALE_START - tmp_time + 86400); 
            
            await testToken.approve(
                    deHiveTokensale.address,
                    10,
                    {from: user1}
                );
            // Try to buy tokens after pre-sale
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithNUX(
                    10,
                    {from: user1}),
                "Presale stages are over"
            );
        });

        it('Cant buy tokens while paused', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            // Advance time to presale stage
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);
            await deHiveTokensale.adminPause({from: deployer});
            await truffleAssert.reverts(
                    deHiveTokensale.purchaseDHVwithNUX(
                            20,
                            {from: user1}),
                "Pausable: paused"
            );
        });

        it('Amount must be greater than 0', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});
            // Advance time to presale stage
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithNUX(
                    0,
                    {from: user1}),
                    "Zero amount"
            );
        });

        it('Rate must be set first', async () => {
            // Advance time to presale stage
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);
                await truffleAssert.reverts(
                    deHiveTokensale.purchaseDHVwithNUX(
                            20,
                            {from: user1}),
                "Rates not set"
            );
        });

        it('Cant buy with nux if nux sale pool is empty', async () => {
            await deHiveTokensale.adminSetRates(
                testTokenAddress, PRECISION, {from: deployer});

            // Advance time to presale stage
            await timeMachine.advanceTime(
                PRE_SALE_END - time - 40000);

            // Buy all token from nux presale pool
            let maxTokens = await deHiveTokensale.PRE_SALE_DHV_NUX_POOL();
            await testToken.approve(
                deHiveTokensale.address,
                maxTokens + 1n,
                {from: deployer}
                );
            await deHiveTokensale.purchaseDHVwithNUX(
                maxTokens,
                {from: deployer}
            );

            // Try to buy more with nux
            await truffleAssert.reverts(
                deHiveTokensale.purchaseDHVwithNUX(
                    1,
                    {from: deployer}),
                "Not enough DHV in NUX pool"
            );
        });
    });
});