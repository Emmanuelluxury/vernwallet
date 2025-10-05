#!/usr/bin/env node

/**
 * VernWallet Bridge Integration Example
 * Demonstrates how to use the integrated Bitcoin-Starknet bridge system
 */

const VernWalletBridge = require('../backend/src/integration/frontend-bridge');

class IntegrationExample {
    constructor() {
        this.contractAddresses = {
                bitcoinUtils: '0x03661680d36818231f7144274dcbd673d787bddea40ac11d81299da81ec824cf',
                cryptoUtils: '0x015d202687c81a2c138f3b764ead3f396c361e049119287738b223fdff7d7f77',
                spvVerifier: '0x05bf5f33d548b49b8a2f2d94f2da78ea358f6e0d4eb2a9fe741d9be4db801fe4',
                bitcoinClient: '0x048a96be5ca623256df3a0eea2f903103f9859844f2163b827fbc12b017b0299',
                bitcoinHeaders: '0x05062ab53aea2baa96b31fe73a40e2cabc6871449a5666f949c3c92a51d6b833',
                btcDepositManager: '0x01cb8f799219ff2aa63dc6b06e35a944fdb347993c102b3e7a83d8c6373f39c9',
                btcPegOut: '0x06592114e225312fbd2c8068baeb2e65b743516ef5c0829ddc45766040658e2c',
                bridge: '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e',
                escapeHatch: '0x07e01eec5443158d9ae9c36c5df009b8b2c5e20dab34489a79a25718a409a187',
                sbtc: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c',
                operatorRegistry: '0x077d8d9f403eb1c8384acc3e7e7983d50ae9ffb64b7934d682cb2a6f83a94f13'
        };
        // Initialize bridge connection
        this.bridge = new VernWalletBridge({
            apiUrl: 'http://localhost:3001',
            websocketUrl: 'ws://localhost:3001/ws',
            refreshInterval: 30000
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Bridge connection events
        this.bridge.on('connected', () => {
            console.log('🟢 Connected to VernWallet Bridge');
            this.runExample();
        });

        this.bridge.on('disconnected', () => {
            console.log('🔴 Disconnected from VernWallet Bridge');
        });

        // Bridge operation events
        this.bridge.on('depositInitiated', (data) => {
            console.log('📥 Deposit initiated:', data);
        });

        this.bridge.on('withdrawalInitiated', (data) => {
            console.log('📤 Withdrawal initiated:', data);
        });

        this.bridge.on('statsUpdated', (stats) => {
            console.log('📊 Bridge stats updated:', stats);
        });

        // Error handling
        this.bridge.on('error', (error) => {
            console.error('❌ Bridge error:', error);
        });
    }

    async runExample() {
        try {
            console.log('\n🚀 Starting VernWallet Bridge Integration Example...\n');

            // 1. Check bridge health
            console.log('1️⃣ Checking bridge health...');
            const health = await this.bridge.healthCheck();
            console.log('Bridge status:', health.status);

            // 2. Get network status
            console.log('\n2️⃣ Getting network status...');
            const networks = await this.bridge.getNetworkStatus();
            console.log('Bitcoin height:', networks.bitcoin.latestBlock?.number);
            console.log('Starknet height:', networks.starknet.latestBlock?.number);

            // 3. Get bridge statistics
            console.log('\n3️⃣ Getting bridge statistics...');
            const stats = await this.bridge.getBridgeStats();
            console.log('Total deposits:', stats.deposits.total_deposits);
            console.log('Total withdrawals:', stats.withdrawals.total_withdrawals);

            // 4. Example deposit (this would normally be triggered by user action)
            console.log('\n4️⃣ Example deposit operation...');
            try {
                const depositResult = await this.bridge.initiateDeposit(
                    '0x' + Math.random().toString(16).substring(2, 66), // Mock BTC tx hash
                    0.01, // Amount in BTC
                    '0x' + Math.random().toString(16).substring(2, 66), // Mock Starknet address
                    6 // Confirmations required
                );
                console.log('Deposit result:', depositResult);
            } catch (error) {
                console.log('Deposit example (expected to fail without real transaction):', error.message);
            }

            // 5. Subscribe to real-time updates
            console.log('\n5️⃣ Subscribing to real-time updates...');
            this.bridge.subscribe('bridge_updates');
            this.bridge.subscribe('network_status');

            // 6. Monitor for a short period
            console.log('\n6️⃣ Monitoring for updates (30 seconds)...');
            await this.sleep(30000);

            // 7. Clean up subscriptions
            console.log('\n7️⃣ Cleaning up...');
            this.bridge.unsubscribe('bridge_updates');
            this.bridge.unsubscribe('network_status');

            console.log('\n✅ Integration example completed successfully!');

        } catch (error) {
            console.error('❌ Integration example failed:', error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// WebSocket message handler for real-time updates
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'broadcast':
            if (message.channel === 'bridge_updates') {
                console.log('📡 Bridge update:', message.data);
            } else if (message.channel === 'network_status') {
                console.log('🌐 Network status:', message.data);
            }
            break;

        case 'pong':
            console.log('🏓 WebSocket ping/pong');
            break;

        default:
            console.log('📨 WebSocket message:', message);
    }
}

// Run example if called directly
async function main() {
    console.log('🔗 VernWallet Bridge Integration Example');
    console.log('=====================================\n');

    const example = new IntegrationExample();

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down example...');
        process.exit(0);
    });

    // Keep the process alive
    process.stdin.resume();
}

// Export for use in other modules
module.exports = { IntegrationExample, handleWebSocketMessage };

if (require.main === module) {
    main().catch(console.error);
}