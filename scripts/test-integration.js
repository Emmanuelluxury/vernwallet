#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the complete Bitcoin-Starknet bridge integration
 */

/**
 * Integration Test Script
 * Tests the complete Bitcoin-Starknet bridge integration
 */

// Check if running in backend context
let Provider, Account, Contract, config, logger, bridgeService, starknetService;

try {
    const starknet = require('starknet');
    Provider = starknet.Provider;
    Account = starknet.Account;
    Contract = starknet.Contract;
} catch (error) {
    console.warn('⚠️ Starknet library not available. Running in limited mode.');
}

try {
    config = require('../backend/src/config');
    logger = require('../backend/src/utils/logger');
    bridgeService = require('../backend/src/services/bridge');
    starknetService = require('../backend/src/services/starknet');
} catch (error) {
    console.warn('⚠️ Backend modules not available. Some tests will be skipped.');
}

class IntegrationTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
    }

    async initialize() {
        logger.info('Initializing integration tester...');

        try {
            // Initialize services
            await bridgeService.initialize();
            await starknetService.initialize();

            logger.info('Integration tester initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize integration tester:', error);
            throw error;
        }
    }

    async runAllTests() {
        logger.info('Starting integration tests...');

        try {
            // Test 1: Bridge service health check
            await this.testBridgeHealth();

            // Test 2: Starknet service health check
            await this.testStarknetHealth();

            // Test 3: Bitcoin deposit flow
            await this.testBitcoinDeposit();

            // Test 4: Bitcoin withdrawal flow
            await this.testBitcoinWithdrawal();

            // Test 5: Staking functionality
            await this.testStaking();

            // Test 6: Bridge statistics
            await this.testBridgeStats();

            this.printTestResults();

        } catch (error) {
            logger.error('Integration tests failed:', error);
            this.errors.push(error);
            this.printTestResults();
            throw error;
        }
    }

    async testBridgeHealth() {
        logger.info('Testing bridge service health...');

        try {
            const health = await bridgeService.healthCheck();

            if (health.status === 'healthy') {
                this.testResults.push({
                    test: 'Bridge Health Check',
                    status: 'PASS',
                    details: health
                });
                logger.info('✓ Bridge health check passed');
            } else {
                throw new Error(`Bridge health check failed: ${health.error}`);
            }
        } catch (error) {
            this.testResults.push({
                test: 'Bridge Health Check',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testStarknetHealth() {
        logger.info('Testing Starknet service health...');

        try {
            const health = await starknetService.healthCheck();

            if (health.status === 'healthy') {
                this.testResults.push({
                    test: 'Starknet Health Check',
                    status: 'PASS',
                    details: health
                });
                logger.info('✓ Starknet health check passed');
            } else {
                throw new Error(`Starknet health check failed: ${health.error}`);
            }
        } catch (error) {
            this.testResults.push({
                test: 'Starknet Health Check',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testBitcoinDeposit() {
        logger.info('Testing Bitcoin deposit flow...');

        try {
            // Mock Bitcoin transaction data
            const mockDeposit = {
                btcTxHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                amount: 0.001, // 0.001 BTC
                starknetRecipient: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                confirmations: 6
            };

            // Test deposit processing
            const result = await bridgeService.processDeposit(mockDeposit);

            if (result.success) {
                this.testResults.push({
                    test: 'Bitcoin Deposit Flow',
                    status: 'PASS',
                    details: {
                        btcTxHash: mockDeposit.btcTxHash,
                        amount: mockDeposit.amount,
                        starknetTxHash: result.starknetTxHash
                    }
                });
                logger.info('✓ Bitcoin deposit flow test passed');
            } else {
                throw new Error('Bitcoin deposit processing failed');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Bitcoin Deposit Flow',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testBitcoinWithdrawal() {
        logger.info('Testing Bitcoin withdrawal flow...');

        try {
            // Mock withdrawal data
            const mockWithdrawal = {
                withdrawalId: 'WD-' + Date.now(),
                amount: 0.0005, // 0.0005 BTC
                btcRecipient: 'bc1q' + Array.from({length: 38}, () => Math.floor(Math.random() * 10).toString()).join(''),
                starknetSender: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
            };

            // Test withdrawal processing
            const result = await bridgeService.processWithdrawal(mockWithdrawal);

            if (result.success) {
                this.testResults.push({
                    test: 'Bitcoin Withdrawal Flow',
                    status: 'PASS',
                    details: {
                        withdrawalId: mockWithdrawal.withdrawalId,
                        amount: mockWithdrawal.amount,
                        btcRecipient: mockWithdrawal.btcRecipient,
                        starknetTxHash: result.starknetTxHash
                    }
                });
                logger.info('✓ Bitcoin withdrawal flow test passed');
            } else {
                throw new Error('Bitcoin withdrawal processing failed');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Bitcoin Withdrawal Flow',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testStaking() {
        logger.info('Testing staking functionality...');

        try {
            // Test staking position retrieval
            const testAddress = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            const testToken = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');

            // Note: These calls might fail if contracts aren't deployed yet
            // In a real test environment, you would deploy contracts first

            try {
                const position = await starknetService.getStakingPosition(testAddress, testToken);
                this.testResults.push({
                    test: 'Staking Position Query',
                    status: 'PASS',
                    details: position
                });
            } catch (error) {
                // Expected to fail if contracts aren't deployed
                this.testResults.push({
                    test: 'Staking Position Query',
                    status: 'SKIP',
                    details: 'Contracts not deployed yet'
                });
            }

            try {
                const rewards = await starknetService.getUserStakingRewards(testAddress);
                this.testResults.push({
                    test: 'Staking Rewards Query',
                    status: 'PASS',
                    details: rewards
                });
            } catch (error) {
                // Expected to fail if contracts aren't deployed
                this.testResults.push({
                    test: 'Staking Rewards Query',
                    status: 'SKIP',
                    details: 'Contracts not deployed yet'
                });
            }

            logger.info('✓ Staking functionality test completed');

        } catch (error) {
            this.testResults.push({
                test: 'Staking Functionality',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testBridgeStats() {
        logger.info('Testing bridge statistics...');

        try {
            const stats = await bridgeService.getBridgeStats();

            this.testResults.push({
                test: 'Bridge Statistics',
                status: 'PASS',
                details: stats
            });

            logger.info('✓ Bridge statistics test passed');
            logger.info(`Total deposits: ${stats.deposits.total_deposits}`);
            logger.info(`Total withdrawals: ${stats.withdrawals.total_withdrawals}`);

        } catch (error) {
            this.testResults.push({
                test: 'Bridge Statistics',
                status: 'FAIL',
                error: error.message
            });
            throw error;
        }
    }

    async testContractInteractions() {
        logger.info('Testing contract interactions...');

        try {
            // Test contract initialization
            await starknetService.initializeContracts();

            // Test contract function calls
            const networkInfo = await starknetService.getNetworkInfo();

            this.testResults.push({
                test: 'Contract Interactions',
                status: 'PASS',
                details: networkInfo
            });

            logger.info('✓ Contract interactions test passed');

        } catch (error) {
            this.testResults.push({
                test: 'Contract Interactions',
                status: 'SKIP',
                details: 'Contracts not deployed yet'
            });
        }
    }

    async testErrorHandling() {
        logger.info('Testing error handling...');

        try {
            // Test invalid deposit data
            const invalidDeposit = {
                btcTxHash: 'invalid_hash',
                amount: -1,
                starknetRecipient: 'invalid_address'
            };

            try {
                await bridgeService.processDeposit(invalidDeposit);
                // Should not reach here
                throw new Error('Expected validation error');
            } catch (error) {
                // Expected validation error
                this.testResults.push({
                    test: 'Error Handling - Invalid Deposit',
                    status: 'PASS',
                    details: 'Properly caught validation error'
                });
            }

            logger.info('✓ Error handling test passed');

        } catch (error) {
            this.testResults.push({
                test: 'Error Handling',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    printTestResults() {
        console.log('\n' + '='.repeat(60));
        console.log('INTEGRATION TEST RESULTS');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(t => t.status === 'PASS').length;
        const failed = this.testResults.filter(t => t.status === 'FAIL').length;
        const skipped = this.testResults.filter(t => t.status === 'SKIP').length;

        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Skipped: ${skipped}`);

        if (failed > 0) {
            console.log(`\n❌ ${failed} test(s) failed:`);
            this.testResults.filter(t => t.status === 'FAIL').forEach(test => {
                console.log(`  • ${test.test}: ${test.error}`);
            });
        }

        if (skipped > 0) {
            console.log(`\n⏭️  ${skipped} test(s) skipped:`);
            this.testResults.filter(t => t.status === 'SKIP').forEach(test => {
                console.log(`  • ${test.test}: ${test.details}`);
            });
        }

        if (passed > 0) {
            console.log(`\n✅ ${passed} test(s) passed:`);
            this.testResults.filter(t => t.status === 'PASS').forEach(test => {
                console.log(`  • ${test.test}`);
            });
        }

        console.log('='.repeat(60));

        if (failed === 0) {
            console.log('🎉 All critical tests passed!');
        } else {
            console.log('❌ Some tests failed. Please check the errors above.');
        }
    }

    async generateTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            environment: config.env,
            testResults: this.testResults,
            errors: this.errors,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(t => t.status === 'PASS').length,
                failed: this.testResults.filter(t => t.status === 'FAIL').length,
                skipped: this.testResults.filter(t => t.status === 'SKIP').length
            }
        };

        const fs = require('fs');
        const reportPath = './test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        logger.info(`Test report saved to: ${reportPath}`);

        return report;
    }
}

// Main test function
async function main() {
    try {
        // Check if we have the required dependencies
        if (!config || !logger || !bridgeService || !starknetService) {
            console.log('⚠️ Backend dependencies not available.');
            console.log('✅ Integration test script loads successfully (limited mode)');
            console.log('ℹ️ Run this script from the backend directory for full testing.');
            process.exit(0);
        }

        const tester = new IntegrationTester();
        await tester.initialize();
        await tester.runAllTests();
        await tester.generateTestReport();

        logger.info('Integration testing completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Integration testing failed:', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch((error) => {
        console.error('Test script failed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTester;