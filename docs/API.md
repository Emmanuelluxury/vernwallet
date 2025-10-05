# API Documentation

Comprehensive API documentation for the VernWallet Bitcoin-Starknet Bridge backend services.

## Table of Contents

- [Authentication](#authentication)
- [Bridge API](#bridge-api)
- [Staking API](#staking-api)
- [Bitcoin API](#bitcoin-api)
- [Starknet API](#starknet-api)
- [Health & Monitoring](#health--monitoring)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [WebSocket Events](#websocket-events)

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.vernwallet.com/api
```

## Authentication

Most API endpoints require authentication via API key or wallet signature.

### API Key Authentication

```bash
curl -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     https://api.vernwallet.com/api/bridge/initiate
```

### Wallet Signature Authentication

```bash
curl -H "X-Wallet-Address: 0x..." \
     -H "X-Signature: 0x..." \
     -H "Content-Type: application/json" \
     https://api.vernwallet.com/api/bridge/initiate
```

## Bridge API

### Initiate Bridge Transfer

**Endpoint**: `POST /api/bridge/initiate`

**Description**: Initiates a bridge transfer between Bitcoin and Starknet.

**Request Body**:
```json
{
  "direction": "bitcoin-to-starknet",
  "amount": "0.001",
  "fromAddress": "bc1q...",
  "toAddress": "0x...",
  "tokenAddress": "0x..." // Optional, for Starknet to Bitcoin
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": "bridge_1234567890",
  "transactionHash": "0x...",
  "estimatedTime": "15-25 minutes",
  "fees": {
    "networkFee": "0.0001",
    "bridgeFee": "0.0005",
    "totalFee": "0.0006"
  }
}
```

**Status Codes**:
- `200`: Transfer initiated successfully
- `400`: Invalid request parameters
- `401`: Authentication failed
- `429`: Rate limit exceeded
- `500`: Internal server error

### Get Bridge Status

**Endpoint**: `GET /api/bridge/status/{transactionId}`

**Description**: Retrieves the current status of a bridge transfer.

**Response**:
```json
{
  "transactionId": "bridge_1234567890",
  "status": "processing",
  "progress": 45,
  "currentStep": "bitcoin_confirmation",
  "steps": [
    {
      "name": "bitcoin_confirmation",
      "status": "completed",
      "timestamp": "2023-10-28T10:00:00Z"
    },
    {
      "name": "operator_signatures",
      "status": "processing",
      "timestamp": "2023-10-28T10:15:00Z"
    },
    {
      "name": "starknet_mint",
      "status": "pending",
      "timestamp": null
    }
  ],
  "estimatedCompletion": "2023-10-28T10:30:00Z"
}
```

### Get Bridge Statistics

**Endpoint**: `GET /api/bridge/stats`

**Description**: Retrieves bridge usage statistics and metrics.

**Query Parameters**:
- `period`: Time period (`24h`, `7d`, `30d`, `all`) - Default: `24h`
- `network`: Network filter (`bitcoin`, `starknet`, `all`) - Default: `all`

**Response**:
```json
{
  "period": "24h",
  "totalTransfers": 2847,
  "totalVolume": "125.43",
  "successRate": 99.2,
  "averageTime": "18 minutes",
  "breakdown": {
    "bitcoinToStarknet": {
      "count": 1423,
      "volume": "62.71",
      "averageAmount": "0.044"
    },
    "starknetToBitcoin": {
      "count": 1424,
      "volume": "62.72",
      "averageAmount": "0.044"
    }
  },
  "fees": {
    "totalCollected": "1.42",
    "averageFee": "0.0005"
  }
}
```

### Get Bridge Fees

**Endpoint**: `GET /api/bridge/fees`

**Description**: Retrieves current bridge fees and limits.

**Query Parameters**:
- `direction`: Transfer direction (`bitcoin-to-starknet`, `starknet-to-bitcoin`)
- `amount`: Transfer amount for fee calculation

**Response**:
```json
{
  "direction": "bitcoin-to-starknet",
  "amount": "0.001",
  "fees": {
    "networkFee": "0.0001",
    "bridgeFee": "0.0005",
    "totalFee": "0.0006"
  },
  "limits": {
    "minimumAmount": "0.0001",
    "maximumAmount": "1.0",
    "dailyLimit": "100.0",
    "dailyUsed": "23.45"
  },
  "estimatedTime": "15-25 minutes"
}
```

## Staking API

### Stake Tokens

**Endpoint**: `POST /api/staking/stake`

**Description**: Stakes tokens to earn rewards.

**Request Body**:
```json
{
  "tokenAddress": "0x...",
  "amount": "100.0",
  "lockPeriod": 30 // Optional, in days
}
```

**Response**:
```json
{
  "success": true,
  "stakingId": "staking_1234567890",
  "transactionHash": "0x...",
  "stakedAmount": "100.0",
  "lockPeriod": 30,
  "expectedRewards": "3.25",
  "unlockDate": "2023-11-27T10:00:00Z"
}
```

### Unstake Tokens

**Endpoint**: `POST /api/staking/unstake`

**Description**: Unstakes tokens and claims any pending rewards.

**Request Body**:
```json
{
  "stakingId": "staking_1234567890",
  "amount": "50.0" // Optional, unstake partial amount
}
```

**Response**:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "unstakedAmount": "50.0",
  "rewardsClaimed": "1.62",
  "penalty": "0.0",
  "remainingStake": "50.0"
}
```

### Claim Staking Rewards

**Endpoint**: `POST /api/staking/claim-rewards`

**Description**: Claims accumulated staking rewards without unstaking.

**Request Body**:
```json
{
  "stakingId": "staking_1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "rewardsClaimed": "2.15",
  "newStakingPosition": {
    "amount": "100.0",
    "rewards": "0.0",
    "lastClaimDate": "2023-10-28T10:00:00Z"
  }
}
```

### Get Staking Position

**Endpoint**: `GET /api/staking/position/{address}`

**Description**: Retrieves staking position for a specific address.

**Response**:
```json
{
  "address": "0x...",
  "totalStaked": "150.5",
  "stakingPositions": [
    {
      "stakingId": "staking_1234567890",
      "tokenAddress": "0x...",
      "amount": "100.0",
      "stakedAt": "2023-10-01T10:00:00Z",
      "lockPeriod": 30,
      "rewards": "3.25",
      "unlockDate": "2023-10-31T10:00:00Z"
    }
  ],
  "totalRewards": "5.67",
  "apy": "12.5"
}
```

### Get Staking Rewards

**Endpoint**: `GET /api/staking/rewards/{address}`

**Description**: Retrieves available staking rewards for an address.

**Response**:
```json
{
  "address": "0x...",
  "totalRewards": "5.67",
  "rewardsByToken": [
    {
      "tokenAddress": "0x...",
      "tokenSymbol": "SBTC",
      "rewards": "3.25",
      "apy": "12.5"
    }
  ],
  "nextClaimDate": "2023-10-29T10:00:00Z"
}
```

### Get Staking Configuration

**Endpoint**: `GET /api/staking/config`

**Description**: Retrieves current staking configuration and parameters.

**Response**:
```json
{
  "stakingEnabled": true,
  "supportedTokens": [
    {
      "address": "0x...",
      "symbol": "SBTC",
      "apy": "12.5",
      "minimumStake": "0.01",
      "lockPeriods": [30, 90, 180, 365]
    }
  ],
  "globalSettings": {
    "minimumStake": "0.01",
    "maximumStake": "1000.0",
    "rewardDistribution": "daily",
    "penaltyEnabled": true,
    "earlyUnstakePenalty": "5.0"
  }
}
```

## Bitcoin API

### Get Bitcoin Transaction

**Endpoint**: `GET /api/bitcoin/transaction/{txHash}`

**Description**: Retrieves Bitcoin transaction details.

**Response**:
```json
{
  "txHash": "0x...",
  "blockHash": "0x...",
  "blockHeight": 815234,
  "confirmations": 6,
  "timestamp": "2023-10-28T10:00:00Z",
  "amount": "0.001",
  "fee": "0.00001",
  "inputs": [
    {
      "address": "bc1q...",
      "amount": "0.00101"
    }
  ],
  "outputs": [
    {
      "address": "bc1q...",
      "amount": "0.001"
    }
  ]
}
```

### Get Bitcoin Address Balance

**Endpoint**: `GET /api/bitcoin/address/{address}/balance`

**Description**: Retrieves Bitcoin address balance and transaction history.

**Response**:
```json
{
  "address": "bc1q...",
  "balance": "1.2543",
  "confirmedBalance": "1.2543",
  "unconfirmedBalance": "0.0",
  "totalReceived": "5.1234",
  "totalSent": "3.8691",
  "transactionCount": 42
}
```

### Get Bitcoin Network Info

**Endpoint**: `GET /api/bitcoin/network`

**Description**: Retrieves Bitcoin network information and status.

**Response**:
```json
{
  "network": "mainnet",
  "blockHeight": 815234,
  "difficulty": "62345678901234",
  "hashrate": "425.34 EH/s",
  "mempoolSize": 15000,
  "feeRates": {
    "fastestFee": 50,
    "halfHourFee": 30,
    "hourFee": 20
  }
}
```

### Broadcast Bitcoin Transaction

**Endpoint**: `POST /api/bitcoin/broadcast`

**Description**: Broadcasts a signed Bitcoin transaction to the network.

**Request Body**:
```json
{
  "rawTransaction": "0200000001..."
}
```

**Response**:
```json
{
  "success": true,
  "txHash": "0x...",
  "accepted": true
}
```

## Starknet API

### Get Starknet Account Info

**Endpoint**: `GET /api/starknet/account/{address}`

**Description**: Retrieves Starknet account information and balances.

**Response**:
```json
{
  "address": "0x...",
  "balance": {
    "ETH": "0.1234",
    "SBTC": "0.5678",
    "STRK": "100.0"
  },
  "nonce": 42,
  "classHash": "0x...",
  "deployedAt": "2023-01-15T10:00:00Z"
}
```

### Get Starknet Transaction

**Endpoint**: `GET /api/starknet/transaction/{txHash}`

**Description**: Retrieves Starknet transaction details.

**Response**:
```json
{
  "txHash": "0x...",
  "blockHash": "0x...",
  "blockNumber": 123456,
  "status": "ACCEPTED_ON_L2",
  "timestamp": "2023-10-28T10:00:00Z",
  "gasUsed": "125000",
  "gasPrice": "100000000000",
  "fee": "0.0125"
}
```

### Get Starknet Block

**Endpoint**: `GET /api/starknet/block/{blockNumber}`

**Description**: Retrieves Starknet block information.

**Response**:
```json
{
  "blockNumber": 123456,
  "blockHash": "0x...",
  "parentHash": "0x...",
  "timestamp": "2023-10-28T10:00:00Z",
  "transactionCount": 15,
  "gasUsed": "1250000",
  "sequencerAddress": "0x..."
}
```

### Call Starknet Contract

**Endpoint**: `POST /api/starknet/call`

**Description**: Calls a Starknet contract function (read-only).

**Request Body**:
```json
{
  "contractAddress": "0x...",
  "functionName": "balance_of",
  "inputs": ["0x..."]
}
```

**Response**:
```json
{
  "success": true,
  "result": ["0x123"]
}
```

## Health & Monitoring

### Health Check

**Endpoint**: `GET /api/health`

**Description**: Comprehensive health check of all services.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2023-10-28T10:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "12ms"
    },
    "bitcoin": {
      "status": "healthy",
      "blockHeight": 815234,
      "responseTime": "45ms"
    },
    "starknet": {
      "status": "healthy",
      "blockNumber": 123456,
      "responseTime": "120ms"
    },
    "bridge": {
      "status": "healthy",
      "activeTransfers": 5,
      "queueSize": 0
    }
  },
  "uptime": "7d 14h 23m",
  "version": "2.1.4"
}
```

### Service Metrics

**Endpoint**: `GET /api/metrics`

**Description**: Retrieves service performance metrics.

**Response**:
```json
{
  "timestamp": "2023-10-28T10:00:00Z",
  "uptime": 674340000,
  "requests": {
    "total": 125000,
    "successful": 124500,
    "failed": 500,
    "rate": 12.5
  },
  "responseTimes": {
    "average": "120ms",
    "median": "95ms",
    "p95": "250ms",
    "p99": "500ms"
  },
  "errors": {
    "rate": 0.004,
    "topErrors": [
      {
        "error": "Bitcoin RPC timeout",
        "count": 250
      }
    ]
  }
}
```

### Bridge Metrics

**Endpoint**: `GET /api/bridge/metrics`

**Description**: Retrieves bridge-specific metrics and performance data.

**Response**:
```json
{
  "timestamp": "2023-10-28T10:00:00Z",
  "transfers": {
    "total": 2847,
    "successful": 2823,
    "failed": 24,
    "successRate": 99.16
  },
  "volume": {
    "total": "125.43",
    "bitcoinToStarknet": "62.71",
    "starknetToBitcoin": "62.72"
  },
  "performance": {
    "averageTime": "18 minutes",
    "medianTime": "16 minutes",
    "fastestTime": "12 minutes",
    "slowestTime": "45 minutes"
  },
  "operators": {
    "active": 7,
    "totalSignatures": 15000,
    "averageSignaturesPerTransfer": 3.2
  }
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "BRIDGE_TRANSFER_FAILED",
    "message": "Bridge transfer failed due to insufficient confirmations",
    "details": {
      "requiredConfirmations": 6,
      "currentConfirmations": 3,
      "transactionHash": "0x..."
    },
    "timestamp": "2023-10-28T10:00:00Z"
  }
}
```

### Common Error Codes

#### Bridge Errors
- `BRIDGE_INVALID_AMOUNT`: Invalid transfer amount
- `BRIDGE_INSUFFICIENT_BALANCE`: Insufficient balance for transfer
- `BRIDGE_DAILY_LIMIT_EXCEEDED`: Daily bridge limit exceeded
- `BRIDGE_INVALID_ADDRESS`: Invalid destination address
- `BRIDGE_TRANSFER_FAILED`: Transfer execution failed

#### Staking Errors
- `STAKING_INVALID_AMOUNT`: Invalid staking amount
- `STAKING_POSITION_NOT_FOUND`: Staking position not found
- `STAKING_LOCKED_PERIOD`: Tokens still in lock period
- `STAKING_INSUFFICIENT_REWARDS`: No rewards available to claim

#### Network Errors
- `BITCOIN_RPC_ERROR`: Bitcoin node communication error
- `STARKNET_RPC_ERROR`: Starknet node communication error
- `NETWORK_TIMEOUT`: Network request timeout

#### Authentication Errors
- `AUTH_INVALID_API_KEY`: Invalid API key
- `AUTH_INVALID_SIGNATURE`: Invalid wallet signature
- `AUTH_INSUFFICIENT_PERMISSIONS`: Insufficient permissions

## Rate Limiting

### Rate Limit Headers

API responses include rate limiting information:

```bash
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635417600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "retryAfter": 60
  }
}
```

## WebSocket Events

### Real-time Updates

Connect to WebSocket endpoint for real-time updates:

```javascript
const ws = new WebSocket('wss://api.vernwallet.com/ws');

// Bridge transfer updates
ws.send(JSON.stringify({
  "type": "subscribe",
  "channel": "bridge_transfers",
  "transactionId": "bridge_1234567890"
}));

// Staking updates
ws.send(JSON.stringify({
  "type": "subscribe",
  "channel": "staking_rewards",
  "address": "0x..."
}));
```

### Event Types

#### Bridge Events
```json
{
  "type": "bridge_update",
  "transactionId": "bridge_1234567890",
  "status": "processing",
  "progress": 60,
  "step": "operator_signatures",
  "timestamp": "2023-10-28T10:15:00Z"
}
```

#### Staking Events
```json
{
  "type": "staking_reward",
  "address": "0x...",
  "amount": "0.25",
  "tokenAddress": "0x...",
  "timestamp": "2023-10-28T10:00:00Z"
}
```

## SDK and Libraries

### JavaScript SDK

```bash
npm install @vernwallet/bridge-sdk
```

```javascript
import { VernWalletBridge } from '@vernwallet/bridge-sdk';

const bridge = new VernWalletBridge({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// Initiate transfer
const result = await bridge.transfer({
  direction: 'bitcoin-to-starknet',
  amount: '0.001',
  toAddress: '0x...'
});

console.log('Transfer initiated:', result.transactionId);
```

### Python SDK

```bash
pip install vernwallet-bridge
```

```python
from vernwallet_bridge import Bridge

bridge = Bridge(api_key='your-api-key', network='mainnet')

# Initiate transfer
result = bridge.initiate_transfer(
    direction='bitcoin-to-starknet',
    amount=0.001,
    to_address='0x...'
)

print(f"Transfer ID: {result['transactionId']}")
```

### REST API Examples

#### cURL Examples

```bash
# Health check
curl https://api.vernwallet.com/api/health

# Initiate bridge transfer
curl -X POST https://api.vernwallet.com/api/bridge/initiate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "direction": "bitcoin-to-starknet",
    "amount": "0.001",
    "toAddress": "0x..."
  }'

# Get bridge status
curl https://api.vernwallet.com/api/bridge/status/bridge_1234567890

# Stake tokens
curl -X POST https://api.vernwallet.com/api/staking/stake \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "tokenAddress": "0x...",
    "amount": "100.0"
  }'
```

#### JavaScript Examples

```javascript
// Bridge transfer
const response = await fetch('/api/bridge/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    direction: 'bitcoin-to-starknet',
    amount: '0.001',
    toAddress: '0x...'
  })
});

const result = await response.json();

// Staking operations
const stakingResponse = await fetch('/api/staking/stake', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    tokenAddress: '0x...',
    amount: '100.0'
  })
});
```

## Support

For API support and questions:

- **Documentation**: [Full Documentation](../README.md)
- **API Issues**: [GitHub Issues](https://github.com/vernwallet/bridge/issues)
- **Discord**: [Developer Community](https://discord.gg/vernwallet)
- **Email**: developers@vernwallet.com

## Changelog

### API v2.1.4
- Added staking rewards endpoints
- Enhanced bridge status tracking
- Improved error handling and validation
- Added real-time WebSocket events

### API v2.1.3
- Added comprehensive metrics endpoints
- Enhanced security with improved authentication
- Added rate limiting headers
- Improved error response format