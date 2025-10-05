/**
 * API Documentation routes
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api-docs
 * Serve API documentation
 */
router.get('/', (req, res) => {
    res.json({
        title: 'VernWallet Bridge API Documentation',
        version: '2.1.4',
        description: 'Comprehensive API for Bitcoin-Starknet bridge operations',
        baseUrl: '/api',
        endpoints: {
            bridge: {
                deposit: 'POST /api/bridge/deposit',
                withdrawal: 'POST /api/bridge/withdrawal',
                status: 'GET /api/bridge/deposit/:txHash',
                stats: 'GET /api/bridge/stats',
                health: 'GET /api/bridge/health'
            },
            staking: {
                stake: 'POST /api/staking/stake',
                unstake: 'POST /api/staking/unstake',
                claimRewards: 'POST /api/staking/claim-rewards',
                position: 'GET /api/staking/position/:address',
                config: 'GET /api/staking/config'
            },
            bitcoin: {
                transaction: 'GET /api/bitcoin/transaction/:txHash',
                balance: 'GET /api/bitcoin/address/:address/balance',
                network: 'GET /api/bitcoin/network'
            },
            starknet: {
                info: 'GET /api/starknet/info',
                account: 'GET /api/starknet/account/:address',
                call: 'POST /api/starknet/call'
            },
            health: {
                all: 'GET /health',
                bridge: 'GET /health/bridge',
                bitcoin: 'GET /health/bitcoin',
                starknet: 'GET /health/starknet'
            }
        },
        authentication: {
            type: 'API Key or Wallet Signature',
            apiKeyHeader: 'X-API-Key',
            walletHeaders: ['X-Wallet-Address', 'X-Signature']
        },
        websockets: {
            endpoint: '/ws',
            events: [
                'bridge_update',
                'staking_reward',
                'transaction_confirmed',
                'system_alert'
            ]
        },
        documentation: {
            full: '/docs/API.md',
            deployment: '/docs/DEPLOYMENT.md',
            github: 'https://github.com/vernwallet/bridge'
        }
    });
});

module.exports = router;