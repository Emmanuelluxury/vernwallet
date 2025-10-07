// Contract addresses configuration
const CONTRACT_ADDRESSES = {
    BRIDGE: '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e',
    // Add other contract addresses as needed
};

// Network configuration
const NETWORK_CONFIG = {
    STARKNET: {
        RPC_URL: process.env.STARKNET_RPC_URL || 'https://starknet-mainnet.public.blastapi.io',
        CHAIN_ID: process.env.STARKNET_CHAIN_ID || '0x534e5f4d41494e' // SN_MAIN
    },
    BITCOIN: {
        NETWORK: process.env.BITCOIN_NETWORK || 'mainnet',
        MIN_CONFIRMATIONS: 6
    }
};

// Bridge configuration
const BRIDGE_CONFIG = {
    MIN_BTC_AMOUNT: 0.001,
    MAX_BTC_AMOUNT: 10,
    BRIDGE_FEE: 0.0005,
    NETWORK_FEE: 0.00015
};

module.exports = {
    CONTRACT_ADDRESSES,
    NETWORK_CONFIG,
    BRIDGE_CONFIG
};