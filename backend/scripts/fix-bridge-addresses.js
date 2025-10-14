#!/usr/bin/env node

/**
 * Fix Bridge Contract Addresses Script
 * Calls update_contract_addresses on the deployed Bridge contract to fix incorrect stored addresses
 */

const { Provider, Account, Contract, CallData } = require('starknet');
const config = require('../src/config');
const logger = require('../src/utils/logger');
const dotenv = require('dotenv');

// Force reload environment variables
dotenv.config({ override: true });

class BridgeAddressFixer {
    constructor() {
        // Check if we're in development mode
        this.isDevelopment = process.env.NODE_ENV !== 'production';
        this.network = process.env.STARKNET_NETWORK || 'mainnet';

        // Use appropriate RPC URL based on network
        const rpcUrls = {
            mainnet: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
            testnet: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7'
        };

        this.provider = new Provider({
            rpc: {
                nodeUrl: rpcUrls[this.network] || rpcUrls.mainnet
            }
        });

        // Use environment variables directly to avoid config caching issues
        const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;
        const privateKey = process.env.STARKNET_PRIVATE_KEY;

        // Validate account credentials
        if (!accountAddress || !privateKey) {
            console.log('⚠️  No Starknet credentials found in .env');
            console.log('🔧 For development/testing, you can:');
            console.log('   1. Set STARKNET_NETWORK=testnet in .env');
            console.log('   2. Or provide real admin credentials for mainnet');
            this.account = null; // Will handle gracefully
        } else {
            // Validate account address format
            if (!accountAddress.startsWith('0x') || accountAddress.length !== 66) {
                throw new Error(`Invalid STARKNET_ACCOUNT_ADDRESS format: ${accountAddress}`);
            }

            try {
                this.account = new Account(
                    this.provider,
                    accountAddress,
                    privateKey
                );
                console.log(`✅ Account initialized: ${accountAddress.substring(0, 10)}...`);
            } catch (error) {
                console.log(`❌ Failed to initialize account: ${error.message}`);
                this.account = null;
            }
        }

        // Bridge contract address - NEWLY DEPLOYED with multicall fixes
        this.bridgeAddress = '0x05ea098d3afed3c0f34258e25b0ccfbdf5893e24313dd4caed31d5f98faec7fe';

        // Correct contract addresses from config
        this.correctAddresses = {
            bitcoin_headers_contract: config.starknet.bitcoinHeadersAddress,
            spv_verifier_contract: config.starknet.spvVerifierAddress,
            sbtc_contract: config.starknet.sbtcContractAddress,
            deposit_manager_contract: config.starknet.btcDepositManagerAddress,
            operator_registry_contract: config.starknet.operatorRegistryAddress,
            peg_out_contract: config.starknet.btcPegOutAddress,
            escape_hatch_contract: config.starknet.escapeHatchAddress
        };

        console.log(`🔧 Bridge Address Fixer initialized:`);
        console.log(`   Network: ${this.network}`);
        console.log(`   Bridge contract: ${this.bridgeAddress}`);
        console.log(`   Has account: ${!!this.account}`);
        console.log(`   Development mode: ${this.isDevelopment}`);
    }

    async fixBridgeAddresses() {
        try {
            logger.info('Starting Bridge contract address fix...');
            logger.info('Bridge contract address:', this.bridgeAddress);

            // First, check current stored addresses
            console.log('\n🔍 Checking current stored addresses in bridge contract...');
            await this.verifyAddresses();

            // Log current vs correct addresses
            console.log('\n📋 Contract Address Comparison:');
            Object.entries(this.correctAddresses).forEach(([key, correctAddress]) => {
                console.log(`  ${key}:`);
                console.log(`    Correct: ${correctAddress}`);
            });

            // Check if we need to update (compare with what verifyAddresses found)
            const needsUpdate = await this.checkIfUpdateNeeded();
            if (!needsUpdate) {
                console.log('\n✅ Bridge contract already has correct addresses. No update needed.');
                return {
                    success: true,
                    message: 'Addresses already correct',
                    transactionHash: null
                };
            }

            console.log('\n🔧 Bridge contract has incorrect addresses. Proceeding with update...');

            // Prepare the call data for update_contract_addresses
            const callData = [
                this.correctAddresses.bitcoin_headers_contract,
                this.correctAddresses.spv_verifier_contract,
                this.correctAddresses.sbtc_contract,
                this.correctAddresses.deposit_manager_contract,
                this.correctAddresses.operator_registry_contract,
                this.correctAddresses.peg_out_contract,
                this.correctAddresses.escape_hatch_contract
            ];

            console.log('\n📝 Call data for update_contract_addresses:');
            callData.forEach((addr, i) => {
                const paramNames = [
                    'bitcoin_headers_contract',
                    'spv_verifier_contract',
                    'sbtc_contract',
                    'deposit_manager_contract',
                    'operator_registry_contract',
                    'peg_out_contract',
                    'escape_hatch_contract'
                ];
                console.log(`  ${paramNames[i]}: ${addr}`);
            });

            // Execute the transaction
            logger.info('Executing update_contract_addresses transaction...');

            const result = await this.account.execute({
                contractAddress: this.bridgeAddress,
                entrypoint: 'update_contract_addresses',
                calldata: callData
            });

            logger.info('Transaction submitted successfully!');
            logger.info('Transaction hash:', result.transaction_hash);

            // Wait for confirmation
            logger.info('Waiting for transaction confirmation...');
            const receipt = await this.provider.waitForTransaction(result.transaction_hash);

            if (receipt.status === 'ACCEPTED_ON_L2') {
                logger.info('✅ Bridge contract addresses updated successfully!');
                return {
                    success: true,
                    transactionHash: result.transaction_hash,
                    blockHash: receipt.block_hash
                };
            } else {
                throw new Error(`Transaction failed with status: ${receipt.status}`);
            }

        } catch (error) {
            logger.error('Failed to fix bridge addresses:', error);
            throw error;
        }
    }

    async checkIfUpdateNeeded() {
        try {
            // First check if the bridge contract itself exists
            const testCall = await this.provider.callContract({
                contractAddress: this.bridgeAddress,
                entrypoint: 'get_admin', // Simple view function that should exist
                calldata: []
            });

            console.log('✅ Bridge contract is deployed and responding');

            const checks = [
                { name: 'Bitcoin Headers', getter: 'get_bitcoin_headers_contract', expected: this.correctAddresses.bitcoin_headers_contract },
                { name: 'SPV Verifier', getter: 'get_spv_verifier_contract', expected: this.correctAddresses.spv_verifier_contract },
                { name: 'SBTC', getter: 'get_sbtc_contract', expected: this.correctAddresses.sbtc_contract },
                { name: 'Deposit Manager', getter: 'get_deposit_manager_contract', expected: this.correctAddresses.deposit_manager_contract },
                { name: 'Operator Registry', getter: 'get_operator_registry_contract', expected: this.correctAddresses.operator_registry_contract },
                { name: 'Peg Out', getter: 'get_peg_out_contract', expected: this.correctAddresses.peg_out_contract },
                { name: 'Escape Hatch', getter: 'get_escape_hatch_contract', expected: this.correctAddresses.escape_hatch_contract }
            ];

            let needsUpdate = false;

            for (const check of checks) {
                try {
                    const result = await this.provider.callContract({
                        contractAddress: this.bridgeAddress,
                        entrypoint: check.getter,
                        calldata: []
                    });

                    const storedAddress = '0x' + result.result[0].toString(16).padStart(64, '0');
                    const expectedAddress = check.expected;

                    if (storedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
                        console.log(`❌ ${check.name} address mismatch:`);
                        console.log(`   Stored: ${storedAddress}`);
                        console.log(`   Expected: ${expectedAddress}`);
                        needsUpdate = true;
                    } else {
                        console.log(`✅ ${check.name} address is correct`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not check ${check.name}: ${error.message}`);
                    // If we can't check specific addresses, assume update is needed
                    needsUpdate = true;
                }
            }

            return needsUpdate;

        } catch (error) {
            if (error.message.includes('Contract not found')) {
                console.log('❌ Bridge contract is not deployed on this network');
                console.log('📋 This appears to be a development environment');
                console.log('🔧 To fix this issue:');
                console.log('   1. Deploy the Bridge contract to Starknet mainnet');
                console.log('   2. Update contract-addresses.json with the deployed address');
                console.log('   3. Run this script again with admin credentials');
                console.log('   4. Or switch to testnet for development');
                return false; // Don't proceed with update since contract doesn't exist
            }
            console.log(`⚠️ Error checking contract status: ${error.message}`);
            return true; // Assume update needed if we can't verify
        }
    }

    async verifyAddresses() {
        try {
            logger.info('Verifying current contract addresses...');

            // Check each contract address using direct provider calls
            const checks = [
                { name: 'Bitcoin Headers', getter: 'get_bitcoin_headers_contract', expectedKey: 'bitcoin_headers_contract' },
                { name: 'SPV Verifier', getter: 'get_spv_verifier_contract', expectedKey: 'spv_verifier_contract' },
                { name: 'SBTC', getter: 'get_sbtc_contract', expectedKey: 'sbtc_contract' },
                { name: 'Deposit Manager', getter: 'get_deposit_manager_contract', expectedKey: 'deposit_manager_contract' },
                { name: 'Operator Registry', getter: 'get_operator_registry_contract', expectedKey: 'operator_registry_contract' },
                { name: 'Peg Out', getter: 'get_peg_out_contract', expectedKey: 'peg_out_contract' },
                { name: 'Escape Hatch', getter: 'get_escape_hatch_contract', expectedKey: 'escape_hatch_contract' }
            ];

            console.log('\n🔍 Current Stored Addresses in Bridge Contract:');

            for (const check of checks) {
                try {
                    const result = await this.provider.callContract({
                        contractAddress: this.bridgeAddress,
                        entrypoint: check.getter,
                        calldata: []
                    });

                    const storedAddress = '0x' + result.result[0].toString(16).padStart(64, '0');
                    const expectedAddress = this.correctAddresses[check.expectedKey];

                    const status = storedAddress.toLowerCase() === expectedAddress.toLowerCase() ? '✅' : '❌';
                    console.log(`${status} ${check.name}:`);
                    console.log(`    Stored: ${storedAddress}`);
                    console.log(`    Expected: ${expectedAddress}`);

                    if (storedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
                        console.log(`    ⚠️  MISMATCH!`);
                    }

                } catch (error) {
                    console.log(`❌ ${check.name}: Failed to check - ${error.message}`);
                }
            }

        } catch (error) {
            logger.error('Failed to verify addresses:', error);
            throw error;
        }
    }
}

// Main function
async function main() {
    try {
        console.log('🔧 Starting Bridge Address Fix Script');

        const fixer = new BridgeAddressFixer();

        // Check if we have the necessary credentials
        if (!fixer.account) {
            console.log('\n❌ No valid Starknet account available');
            console.log('\n🔧 Solutions:');
            console.log('  For Development/Testing:');
            console.log('    1. Set STARKNET_NETWORK=testnet in .env');
            console.log('    2. Get testnet account credentials');
            console.log('    3. Or deploy contracts to testnet first');
            console.log('');
            console.log('  For Production/Mainnet:');
            console.log('    1. Set real admin account credentials in .env');
            console.log('    2. Ensure account has admin access to bridge contract');
            console.log('    3. Deploy contracts to mainnet first');
            console.log('');
            console.log('  Current config:');
            console.log(`    Network: ${fixer.network}`);
            console.log(`    Bridge contract: ${fixer.bridgeAddress}`);
            console.log(`    Has account: ${!!fixer.account}`);

            process.exit(1);
        }

        // Check if bridge contract exists
        const needsUpdate = await fixer.checkIfUpdateNeeded();
        if (!needsUpdate) {
            console.log('\n✅ No update needed - bridge addresses are already correct');
            process.exit(0);
        }

        // Fix the addresses
        const result = await fixer.fixBridgeAddresses();

        // Verify the fix
        await fixer.verifyAddresses();

        console.log('\n🎉 Bridge address fix completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  Transaction Hash:', result.transactionHash);
        console.log('  Block Hash:', result.blockHash);
        console.log('  Status: ✅ SUCCESS');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Bridge address fix failed:', error.message);

        // Provide helpful error context
        if (error.message.includes('Contract not found')) {
            console.log('\n💡 The bridge contract is not deployed on this network.');
            console.log('   Make sure contracts are deployed before running this script.');
        } else if (error.message.includes('felt overflow')) {
            console.log('\n💡 Account address format issue.');
            console.log('   Check STARKNET_ACCOUNT_ADDRESS in .env file.');
        } else if (error.message.includes('rejected') || error.message.includes('denied')) {
            console.log('\n💡 Transaction rejected by wallet/account.');
            console.log('   Make sure the account has admin access to the bridge contract.');
        }

        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch((error) => {
        console.error('Script execution failed:', error);
        process.exit(1);
    });
}

module.exports = BridgeAddressFixer;