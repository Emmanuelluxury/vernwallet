/**
 * Bridge Integration Test Suite
 * Comprehensive testing for Bitcoin-Starknet bridge functionality
 * Tests all integration points between frontend, backend, and smart contracts
 */

const assert = require('assert');
const axios = require('axios');
const WebSocket = require('ws');

class BridgeIntegrationTester {
    constructor(config = {}) {
        this.config = {
            backendUrl: config.backendUrl || 'http://localhost:3001',
            frontendUrl: config.frontendUrl || 'http://localhost:3000',
            testTimeout: config.testTimeout || 30000,
            ...config
        };

        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };

        this.websocket = null;
        this.testWallet = {
            address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        };
    }

    // Test result tracking
    recordTest(testName, passed, error = null, duration = 0) {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }

        this.testResults.tests.push({
            name: testName,
            passed,
            error: error?.message || null,
            duration
        });

        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${testName} (${duration}ms)${!passed && error ? ` - ${error.message}` : ''}`);
    }

    // Test execution
    async runAllTests() {
        console.log('🚀 Starting Bridge Integration Tests...\n');

        const startTime = Date.now();

        try {
            // Core functionality tests
            await this.testBackendHealth();
            await this.testBridgeHealth();
            await this.testContractAddresses();
            await this.testBitcoinValidation();
            await this.testStarknetValidation();
            await this.testBridgeStats();
            await this.testWebSocketConnection();

            // Bridge operation tests
            await this.testDepositCreation();
            await this.testWithdrawalCreation();
            await this.testBridgeStatusTracking();

            // Error handling tests
            await this.testInvalidAddressHandling();
            await this.testInsufficientAmountHandling();
            await this.testNetworkErrorHandling();

            // Performance tests
            await this.testBridgePerformance();
            await this.testConcurrentOperations();

        } catch (error) {
            console.error('Test suite error:', error);
        }

        const totalTime = Date.now() - startTime;
        this.printSummary(totalTime);
    }

    // Backend Health Test
    async testBackendHealth() {
        const startTime = Date.now();

        try {
            const response = await axios.get(`${this.config.backendUrl}/health`, {
                timeout: 5000
            });

            assert(response.status === 200, 'Health endpoint should return 200');
            assert(response.data.success === true, 'Health check should be successful');
            assert(response.data.data, 'Health data should be present');

            this.recordTest('Backend Health Check', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Backend Health Check', false, error, Date.now() - startTime);
        }
    }

    // Bridge Health Test
    async testBridgeHealth() {
        const startTime = Date.now();

        try {
            const response = await axios.get(`${this.config.backendUrl}/api/bridge/health`, {
                timeout: 10000
            });

            assert(response.status === 200, 'Bridge health endpoint should return 200');

            const healthData = response.data.data;
            assert(healthData.status, 'Bridge health status should be present');
            assert(healthData.services, 'Bridge services status should be present');
            assert(healthData.timestamp, 'Bridge health timestamp should be present');

            this.recordTest('Bridge Health Check', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Bridge Health Check', false, error, Date.now() - startTime);
        }
    }

    // Contract Addresses Test
    async testContractAddresses() {
        const startTime = Date.now();

        try {
            const response = await axios.get(`${this.config.backendUrl}/api/contracts/addresses`, {
                timeout: 5000
            });

            assert(response.status === 200, 'Contract addresses endpoint should return 200');
            assert(response.data.success === true, 'Contract addresses should be successful');

            const addresses = response.data.data;
            assert(addresses.bridge, 'Bridge contract address should be present');
            assert(addresses.sbtc, 'SBTC contract address should be present');

            this.recordTest('Contract Addresses', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Contract Addresses', false, error, Date.now() - startTime);
        }
    }

    // Bitcoin Address Validation Test
    async testBitcoinValidation() {
        const startTime = Date.now();

        try {
            const validAddresses = [
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Legacy P2PKH
                '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // P2SH
                'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' // Bech32
            ];

            const invalidAddresses = [
                'invalid-address',
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfN', // Too short
                'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t45' // Too long
            ];

            for (const address of validAddresses) {
                const response = await axios.post(`${this.config.backendUrl}/api/bitcoin/validate-address`, {
                    address
                }, { timeout: 5000 });

                assert(response.data.success === true, `Address ${address} should be valid`);
            }

            for (const address of invalidAddresses) {
                const response = await axios.post(`${this.config.backendUrl}/api/bitcoin/validate-address`, {
                    address
                }, { timeout: 5000 });

                assert(response.data.success === false, `Address ${address} should be invalid`);
            }

            this.recordTest('Bitcoin Address Validation', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Bitcoin Address Validation', false, error, Date.now() - startTime);
        }
    }

    // Starknet Address Validation Test
    async testStarknetValidation() {
        const startTime = Date.now();

        try {
            const validAddress = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            const invalidAddress = '0xinvalid';

            const response = await axios.post(`${this.config.backendUrl}/api/wallet/validate-address`, {
                address: validAddress,
                network: 'starknet'
            }, { timeout: 5000 });

            assert(response.data.success === true, 'Valid Starknet address should pass validation');

            this.recordTest('Starknet Address Validation', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Starknet Address Validation', false, error, Date.now() - startTime);
        }
    }

    // Bridge Statistics Test
    async testBridgeStats() {
        const startTime = Date.now();

        try {
            const response = await axios.get(`${this.config.backendUrl}/api/bridge/stats`, {
                timeout: 5000
            });

            assert(response.status === 200, 'Bridge stats endpoint should return 200');
            assert(response.data.success === true, 'Bridge stats should be successful');

            const stats = response.data.data;
            assert(typeof stats.deposits === 'object', 'Deposit stats should be present');
            assert(typeof stats.withdrawals === 'object', 'Withdrawal stats should be present');

            this.recordTest('Bridge Statistics', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Bridge Statistics', false, error, Date.now() - startTime);
        }
    }

    // WebSocket Connection Test
    async testWebSocketConnection() {
        const startTime = Date.now();

        return new Promise((resolve) => {
            try {
                this.websocket = new WebSocket(`ws://localhost:3001/ws`);

                const timeout = setTimeout(() => {
                    this.recordTest('WebSocket Connection', false, new Error('Connection timeout'), Date.now() - startTime);
                    resolve();
                }, 5000);

                this.websocket.onopen = () => {
                    clearTimeout(timeout);
                    this.recordTest('WebSocket Connection', true, null, Date.now() - startTime);

                    // Close connection after test
                    this.websocket.close();
                    resolve();
                };

                this.websocket.onerror = (error) => {
                    clearTimeout(timeout);
                    this.recordTest('WebSocket Connection', false, error, Date.now() - startTime);
                    resolve();
                };

            } catch (error) {
                this.recordTest('WebSocket Connection', false, error, Date.now() - startTime);
                resolve();
            }
        });
    }

    // Deposit Creation Test
    async testDepositCreation() {
        const startTime = Date.now();

        try {
            const depositData = {
                btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                amount: 0.01,
                starknetRecipient: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                confirmations: 6
            };

            const response = await axios.post(`${this.config.backendUrl}/api/bridge/deposit`, depositData, {
                timeout: 10000
            });

            assert(response.status === 201, 'Deposit creation should return 201');
            assert(response.data.success === true, 'Deposit creation should be successful');
            assert(response.data.data.depositId, 'Deposit ID should be present');

            this.recordTest('Deposit Creation', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Deposit Creation', false, error, Date.now() - startTime);
        }
    }

    // Withdrawal Creation Test
    async testWithdrawalCreation() {
        const startTime = Date.now();

        try {
            const withdrawalData = {
                amount: 1.0,
                btcRecipient: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                starknetSender: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            };

            const response = await axios.post(`${this.config.backendUrl}/api/bridge/withdrawal`, withdrawalData, {
                timeout: 10000
            });

            assert(response.status === 201, 'Withdrawal creation should return 201');
            assert(response.data.success === true, 'Withdrawal creation should be successful');
            assert(response.data.data.withdrawalId, 'Withdrawal ID should be present');

            this.recordTest('Withdrawal Creation', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Withdrawal Creation', false, error, Date.now() - startTime);
        }
    }

    // Bridge Status Tracking Test
    async testBridgeStatusTracking() {
        const startTime = Date.now();

        try {
            // Create a test deposit first
            const depositData = {
                btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                amount: 0.01,
                starknetRecipient: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            };

            const createResponse = await axios.post(`${this.config.backendUrl}/api/bridge/deposit`, depositData);

            if (createResponse.data.success) {
                const depositId = createResponse.data.data.depositId;

                // Check status immediately after creation
                const statusResponse = await axios.get(`${this.config.backendUrl}/api/bridge/deposit/${depositId}`);

                assert(statusResponse.status === 200, 'Status check should return 200');
                assert(statusResponse.data.success === true, 'Status check should be successful');
                assert(statusResponse.data.data.status, 'Status should be present');

                this.recordTest('Bridge Status Tracking', true, null, Date.now() - startTime);
            } else {
                this.recordTest('Bridge Status Tracking', false, new Error('Failed to create test deposit'), Date.now() - startTime);
            }
        } catch (error) {
            this.recordTest('Bridge Status Tracking', false, error, Date.now() - startTime);
        }
    }

    // Invalid Address Handling Test
    async testInvalidAddressHandling() {
        const startTime = Date.now();

        try {
            const invalidDepositData = {
                btcTxHash: 'invalid-hash',
                amount: 0.01,
                starknetRecipient: 'invalid-address'
            };

            const response = await axios.post(`${this.config.backendUrl}/api/bridge/deposit`, invalidDepositData, {
                timeout: 5000,
                validateStatus: () => true // Don't throw on error status
            });

            assert(response.status !== 201, 'Invalid deposit should not return 201');
            assert(response.data.success === false, 'Invalid deposit should fail');

            this.recordTest('Invalid Address Handling', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Invalid Address Handling', false, error, Date.now() - startTime);
        }
    }

    // Insufficient Amount Handling Test
    async testInsufficientAmountHandling() {
        const startTime = Date.now();

        try {
            const invalidDepositData = {
                btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                amount: 0.00000001, // Too small
                starknetRecipient: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            };

            const response = await axios.post(`${this.config.backendUrl}/api/bridge/deposit`, invalidDepositData, {
                timeout: 5000,
                validateStatus: () => true
            });

            assert(response.status !== 201, 'Insufficient amount should not return 201');

            this.recordTest('Insufficient Amount Handling', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Insufficient Amount Handling', false, error, Date.now() - startTime);
        }
    }

    // Network Error Handling Test
    async testNetworkErrorHandling() {
        const startTime = Date.now();

        try {
            // Try to connect to a non-existent endpoint
            await axios.get('http://localhost:3002/non-existent-endpoint', {
                timeout: 2000,
                validateStatus: () => true
            });

            this.recordTest('Network Error Handling', false, new Error('Should have failed'), Date.now() - startTime);
        } catch (error) {
            // Expected to fail
            this.recordTest('Network Error Handling', true, null, Date.now() - startTime);
        }
    }

    // Performance Test
    async testBridgePerformance() {
        const startTime = Date.now();

        try {
            const operations = [];

            // Create multiple deposits concurrently
            for (let i = 0; i < 5; i++) {
                operations.push(
                    axios.post(`${this.config.backendUrl}/api/bridge/deposit`, {
                        btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                        amount: 0.01,
                        starknetRecipient: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                    }, { timeout: 10000 })
                );
            }

            const results = await Promise.allSettled(operations);

            // Check that most operations succeeded
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const successRate = successful / operations.length;

            assert(successRate >= 0.8, `Performance test should have at least 80% success rate, got ${Math.round(successRate * 100)}%`);

            this.recordTest('Bridge Performance', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Bridge Performance', false, error, Date.now() - startTime);
        }
    }

    // Concurrent Operations Test
    async testConcurrentOperations() {
        const startTime = Date.now();

        try {
            const operations = [];

            // Mix of deposits and withdrawals
            for (let i = 0; i < 10; i++) {
                if (i % 2 === 0) {
                    operations.push(
                        axios.post(`${this.config.backendUrl}/api/bridge/deposit`, {
                            btcTxHash: '0x' + Math.random().toString(16).substring(2, 66),
                            amount: 0.01,
                            starknetRecipient: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                        }, { timeout: 10000 })
                    );
                } else {
                    operations.push(
                        axios.post(`${this.config.backendUrl}/api/bridge/withdrawal`, {
                            amount: 1.0,
                            btcRecipient: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                            starknetSender: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
                        }, { timeout: 10000 })
                    );
                }
            }

            const results = await Promise.allSettled(operations);

            // Check that operations don't interfere with each other
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const successRate = successful / operations.length;

            assert(successRate >= 0.7, `Concurrent operations should have at least 70% success rate, got ${Math.round(successRate * 100)}%`);

            this.recordTest('Concurrent Operations', true, null, Date.now() - startTime);
        } catch (error) {
            this.recordTest('Concurrent Operations', false, error, Date.now() - startTime);
        }
    }

    // Print test summary
    printSummary(totalTime) {
        console.log('\n📊 Test Summary:');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⏱️  Total Time: ${totalTime}ms`);
        console.log(`📈 Success Rate: ${Math.round((this.testResults.passed / this.testResults.total) * 100)}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.tests
                .filter(test => !test.passed)
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }

        console.log('\n🏁 Bridge Integration Testing Complete!\n');
    }
}

// CLI execution
if (require.main === module) {
    const tester = new BridgeIntegrationTester({
        backendUrl: process.env.BRIDGE_BACKEND_URL || 'http://localhost:3001',
        testTimeout: parseInt(process.env.TEST_TIMEOUT) || 30000
    });

    tester.runAllTests().catch(console.error);
}

module.exports = BridgeIntegrationTester;