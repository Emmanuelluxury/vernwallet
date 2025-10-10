// Contract addresses configuration
const CONTRACT_ADDRESSES = {
    BRIDGE: '0x043fc7f2dfb8207e9a666a35e951a2df10039701ca8fff04c1713609df80f941', // Updated to match deployed contract
    SBTC: '0x07b10d8e5e60b2c9c5a5b12a4e1e5c4b3d2e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    BITCOIN_HEADERS: '0x05062ab53aea2baa96b31fe73a40e2cabc6871449a5666f949c3c92a51d6b833',
    SPV_VERIFIER: '0x05bf5f33d548b49b8a2f2d94f2da78ea358f6e0d4eb2a9fe741d9be4db801fe4',
    DEPOSIT_MANAGER: '0x01cb8f799219ff2aa63dc6b06e35a944fdb347993c102b3e7a83d8c6373f39c9',
    OPERATOR_REGISTRY: '0x077d8d9f403eb1c8384acc3e7e7983d50ae9ffb64b7934d682cb2a6f83a94f13',
    PEG_OUT: '0x06592114e225312fbd2c8068baeb2e65b743516ef5c0829ddc45766040658e2c',
    ESCAPE_HATCH: '0x07e01eec5443158d9ae9c36c5df009b8b2c5e20dab34489a79a25718a409a187'
};

// Network configuration with multiple RPC endpoints for reliability
const NETWORK_CONFIG = {
    STARKNET: {
        RPC_URLS: process.env.STARKNET_RPC_URLS ?
            process.env.STARKNET_RPC_URLS.split(',') :
            [
                'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
                'https://starknet-mainnet.g.alchemy.com/v2/demo',
                'https://rpc.starknet.lava.build',
                'https://starknet.public.blastapi.io'
            ],
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