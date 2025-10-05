/**
 * Configuration Management for VernWallet Bridge Backend
 * Loads and validates configuration from environment variables and config files
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Determine environment
const env = process.env.NODE_ENV || 'development';

// Load configuration from TOML files
function loadConfigFile(filename) {
    try {
        const toml = require('toml');
        const configPath = path.join(__dirname, '../../config', filename);
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            return toml.parse(configContent);
        }
    } catch (error) {
        console.warn(`Warning: Could not load config file ${filename}:`, error.message);
    }
    return {};
}

// Load base configuration
const baseConfig = loadConfigFile('default.toml');
const envConfig = loadConfigFile(`${env}.toml`);

// Merge configurations (environment config overrides base config)
const config = {
    ...baseConfig,
    ...envConfig
};

// Environment-specific overrides
const envOverrides = {
    development: {
        api: {
            port: 3001,
            host: 'localhost',
            corsOrigins: ['http://localhost:3000', 'http://localhost:3001']
        },
        logging: {
            level: 'debug'
        }
    },
    production: {
        api: {
            port: process.env.PORT || 8080,
            host: process.env.HOST || '0.0.0.0',
            corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []
        },
        logging: {
            level: 'info'
        }
    },
    test: {
        api: {
            port: 3002,
            host: 'localhost',
            corsOrigins: ['http://localhost:3000']
        },
        logging: {
            level: 'error'
        }
    }
};

// Apply environment overrides
const finalConfig = {
    ...config,
    ...envOverrides[env],
    env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test'
};

// Validate required configuration
function validateConfig(config) {
    const required = [
        'bridge.network',
        'bitcoin.network',
        'starknet.network'
    ];

    const missing = [];

    for (const path of required) {
        const keys = path.split('.');
        let value = config;

        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) {
                missing.push(path);
                break;
            }
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
}

// Validate configuration
try {
    validateConfig(finalConfig);
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
}

// Set default values for optional configuration
const defaults = {
    api: {
        port: 8080,
        host: '0.0.0.0',
        corsOrigins: ['http://localhost:3000'],
        rateLimitPerMinute: 1000,
        requestTimeout: 30000
    },
    bridge: {
        confirmationsRequired: 6,
        maxDepositAmount: '100000000000000000000000000000000', // 100 BTC in sats
        minDepositAmount: '100000000', // 1 BTC in sats
        depositTimeout: 86400, // 24 hours
        withdrawalTimeout: 259200, // 72 hours
        // Operator configuration
        minOperatorBond: '1000000000000000000000', // 1000 ETH in wei (example)
        maxOperators: 100,
        operatorQuorum: 3, // Minimum operators needed for signatures
        // Staking configuration
        stakingEnabled: true,
        rewardRate: '1000000000000000000', // 1 token per second (example)
        stakingRewardsEnabled: true,
        // Security configuration
        emergencyPauseEnabled: true,
        dailyBridgeLimit: '1000000000000000000000000000000000', // 1000 BTC daily limit
        rateLimitPerMinute: 10, // Maximum operations per minute
        // Fee configuration
        depositFee: '10000', // 0.0001 BTC fee
        withdrawalFee: '20000', // 0.0002 BTC fee
        stakingFee: '5000' // 0.00005 BTC fee
    },
    bitcoin: {
        confirmations: 6,
        dustThreshold: 546,
        rpcTimeout: 10000,
        // Network configuration
        network: process.env.BITCOIN_NETWORK || 'mainnet',
        rpcUrl: process.env.BITCOIN_RPC_URL || 'http://localhost:8332',
        rpcUser: process.env.BITCOIN_RPC_USER || '',
        rpcPassword: process.env.BITCOIN_RPC_PASSWORD || '',
        // Genesis hash for mainnet/testnet
        genesisHash: process.env.BITCOIN_GENESIS_HASH || '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        networkMagic: process.env.BITCOIN_NETWORK_MAGIC || 'f9beb4d9'
    },
    starknet: {
        rpcTimeout: 10000,
        maxRetries: 3,
        // Contract addresses - using deployed contract addresses from contract-addresses.json
        bridgeContractAddress: process.env.STARKNET_BRIDGE_CONTRACT_ADDRESS || '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e',
        sbtcContractAddress: process.env.STARKNET_SBTC_CONTRACT_ADDRESS || '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c',
        operatorRegistryAddress: process.env.STARKNET_OPERATORREGISTRY_ADDRESS || '0x077d8d9f403eb1c8384acc3e7e7983d50ae9ffb64b7934d682cb2a6f83a94f13',
        btcDepositManagerAddress: process.env.STARKNET_BTCDEPOSITMANAGER_ADDRESS || '0x01cb8f799219ff2aa63dc6b06e35a944fdb347993c102b3e7a83d8c6373f39c9',
        btcPegOutAddress: process.env.STARKNET_BTCPEGOUT_ADDRESS || '0x06592114e225312fbd2c8068baeb2e65b743516ef5c0829ddc45766040658e2c',
        escapeHatchAddress: process.env.STARKNET_ESCAPEHATCH_ADDRESS || '0x07e01eec5443158d9ae9c36c5df009b8b2c5e20dab34489a79a25718a409a187',
        bitcoinUtilsAddress: process.env.STARKNET_BITCOINUTILS_ADDRESS || '0x03661680d36818231f7144274dcbd673d787bddea40ac11d81299da81ec824cf',
        cryptoUtilsAddress: process.env.STARKNET_CRYPTOUTILS_ADDRESS || '0x015d202687c81a2c138f3b764ead3f396c361e049119287738b223fdff7d7f77',
        spvVerifierAddress: process.env.STARKNET_SPVVERIFIER_ADDRESS || '0x05bf5f33d548b49b8a2f2d94f2da78ea358f6e0d4eb2a9fe741d9be4db801fe4',
        bitcoinClientAddress: process.env.STARKNET_BITCOINCLIENT_ADDRESS || '0x048a96be5ca623256df3a0eea2f903103f9859844f2163b827fbc12b017b0299',
        bitcoinHeadersAddress: process.env.STARKNET_BITCOINHEADERS_ADDRESS || '0x05062ab53aea2baa96b31fe73a40e2cabc6871449a5666f949c3c92a51d6b833',
        // Account configuration
        accountAddress: process.env.STARKNET_ACCOUNT_ADDRESS || '',
        privateKey: process.env.STARKNET_PRIVATE_KEY || '',
        emergencyAdminAddress: process.env.STARKNET_EMERGENCY_ADMIN_ADDRESS || '',
        // Network configuration
        network: process.env.STARKNET_NETWORK || 'mainnet',
        chainId: process.env.STARKNET_CHAIN_ID || 'SN_MAIN'
    },
    database: {
        maxConnections: 20,
        connectionTimeout: 30,
        acquireTimeout: 60000
    },
    logging: {
        level: 'info',
        maxSize: '20m',
        maxFiles: '14d'
    },
    monitoring: {
        healthCheckInterval: 30,
        metricsEnabled: true
    }
};

// Apply defaults recursively
function applyDefaults(obj, defaults) {
    for (const [key, value] of Object.entries(defaults)) {
        if (!(key in obj)) {
            obj[key] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            applyDefaults(obj[key], value);
        }
    }
}

applyDefaults(finalConfig, defaults);

// Export configuration
module.exports = finalConfig;