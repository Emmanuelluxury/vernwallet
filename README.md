# VernWallet Bitcoin-Starknet Bridge

A comprehensive, trustless bridge system that enables seamless transfer of Bitcoin assets to and from the Starknet Layer 2 network. This integrated solution combines robust smart contracts with a powerful backend service to provide a secure, efficient, and user-friendly bridging experience.

## 🚀 Features

### Core Bridge Functionality
- **Bitcoin ↔ Starknet Transfers**: Bidirectional asset bridging between Bitcoin mainnet and Starknet
- **Trustless Architecture**: Decentralized validation using threshold signatures and SPV proofs
- **Real-time Processing**: Automated transaction monitoring and processing
- **Multi-signature Security**: Operator-based validation with configurable thresholds

### Advanced Features
- **Staking Rewards**: Earn rewards by staking bridge tokens
- **Emergency Controls**: Circuit breakers and emergency pause functionality
- **Rate Limiting**: Protection against spam attacks and abuse
- **Comprehensive Monitoring**: Real-time health checks and performance metrics
- **User-friendly Interface**: Intuitive web interface for all bridge operations

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        VernWallet Bridge                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │  Frontend   │  │   Backend   │  │   Cairo     │  │ Bitcoin │  │
│  │   (HTML/JS) │  │   (Node.js) │  │  Contracts  │  │  Node   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │ Bridge API  │  │ Starknet    │  │  Database   │  │  Cache  │  │
│  │ Endpoints   │  │ Integration │  │  (SQLite/   │  │ (Redis) │  │
│  │             │  │             │  │   Postgre)  │  │         │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contracts

- **Bridge.sol**: Main bridge contract handling cross-chain transfers
- **SBTC.sol**: Synthetic Bitcoin token on Starknet
- **BTCDepositManager.sol**: Manages Bitcoin deposit verification
- **BTCPegOut.sol**: Handles Bitcoin withdrawal processing
- **OperatorRegistry.sol**: Manages bridge operators and signatures
- **SPVVerifier.sol**: Simplified Payment Verification for Bitcoin headers

## ✅ Prerequisites

### Required Software
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Scarb** (Cairo package manager)
- **Starknet Foundry** (for testing)
- **PostgreSQL** >= 13.0 (recommended)
- **Redis** >= 6.0 (optional, for caching)

### Development Tools
- **Git** for version control
- **Docker** (optional, for containerized deployment)
- **Bitcoin Node** (for mainnet/testnet)

### Environment Setup

1. **Install Scarb**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://install.scarb.sh | sh
   ```

2. **Install Starknet Foundry**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://foundry.paradigm.xyz | sh
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Network Configuration
NODE_ENV=development
BITCOIN_NETWORK=mainnet
STARKNET_NETWORK=sepolia

# Bitcoin Node Configuration
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=your_rpc_username
BITCOIN_RPC_PASSWORD=your_rpc_password

# Starknet Configuration
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0.7
STARKNET_ACCOUNT_ADDRESS=your_account_address
STARKNET_PRIVATE_KEY=your_private_key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/vernwallet_bridge

# Bridge Configuration
BRIDGE_DAILY_LIMIT=1000000000000000000000000000000000
BRIDGE_MIN_OPERATOR_BOND=1000000000000000000000
```

### Configuration Files

- **`backend/src/config/index.js`**: Main application configuration
- **`contracts/Scarb.toml`**: Cairo project configuration
- **`scripts/`**: Deployment and build scripts

## 🚀 Deployment

### 1. Smart Contract Deployment

Deploy Cairo contracts to Starknet:

```bash
# Build contracts
npm run contracts:build

# Deploy to Starknet
npm run contracts:deploy

# Verify deployment
npm run contracts:verify
```

### 2. Backend Deployment

Start the backend services:

```bash
# Development mode
npm run backend:dev

# Production mode
npm run backend:start
```

### 3. Frontend Deployment

Deploy the web interface:

```bash
# Development mode
npm run frontend:dev

# Production build
npm run frontend:build
```

### 4. Complete System Deployment

For a complete deployment with all components:

```bash
# Full deployment script
npm run deploy:all

# Or step by step:
npm run setup          # Install dependencies
npm run contracts:build # Build smart contracts
npm run contracts:deploy # Deploy contracts
npm run backend:start   # Start backend
npm run frontend:build  # Build frontend
```

## 📖 Usage

### Bridge Operations

#### Bitcoin to Starknet Transfer

1. **Connect Wallet**: Connect your Starknet wallet to the bridge interface
2. **Select Direction**: Choose "Bitcoin to Starknet" transfer
3. **Enter Amount**: Specify the amount of BTC to bridge
4. **Destination Address**: Provide your Starknet address
5. **Confirm Transaction**: Approve the transaction in your wallet
6. **Wait for Confirmation**: Monitor progress (typically 15-25 minutes)

#### Starknet to Bitcoin Transfer

1. **Connect Wallet**: Connect your Starknet wallet
2. **Select Direction**: Choose "Starknet to Bitcoin" transfer
3. **Enter Amount**: Specify the amount of tokens to bridge
4. **Bitcoin Address**: Provide your Bitcoin destination address
5. **Confirm Transaction**: Approve the transaction
6. **Wait for Confirmation**: Monitor progress

### Staking Operations

#### Stake Tokens

```javascript
// Stake SBTC tokens to earn rewards
await bridge.stake(tokenAddress, amount);
```

#### Claim Rewards

```javascript
// Claim accumulated staking rewards
await bridge.claimStakingRewards(tokenAddress);
```

#### Unstake Tokens

```javascript
// Withdraw staked tokens
await bridge.unstake(tokenAddress, amount);
```

### API Endpoints

#### Bridge API

```bash
# Initiate bridge transfer
POST /api/bridge/initiate

# Get bridge status
GET /api/bridge/status/:transactionId

# Get bridge statistics
GET /api/bridge/stats

# Health check
GET /api/health
```

#### Staking API

```bash
# Stake tokens
POST /api/staking/stake

# Unstake tokens
POST /api/staking/unstake

# Claim rewards
POST /api/staking/claim-rewards

# Get staking position
GET /api/staking/position/:address

# Get staking rewards
GET /api/staking/rewards/:address
```

## 🧪 Testing

### Run All Tests

```bash
# Run complete test suite
npm run test

# Or run individual test suites:
npm run contracts:test  # Cairo contract tests
npm run backend:test    # Backend API tests
npm run frontend:test   # Frontend tests
```

### Integration Testing

```bash
# Run integration tests
node scripts/test-integration.js

# Verify staking integration
node scripts/verify-staking.js
```

### Manual Testing

1. **Start local environment**:
   ```bash
   npm run dev
   ```

2. **Open bridge interface**:
   ```
   http://localhost:3000/Wallet/Bridge.html
   ```

3. **Test bridge transfers**:
   - Connect wallet
   - Initiate test transfers
   - Monitor transaction progress

## 🔒 Security

### Security Features

- **Multi-signature Validation**: Requires operator signatures for transfers
- **SPV Proof Verification**: Validates Bitcoin transactions using SPV
- **Emergency Pause**: Circuit breaker functionality for emergency situations
- **Rate Limiting**: Prevents spam attacks and abuse
- **Access Control**: Role-based permissions for bridge operations
- **Input Validation**: Comprehensive validation of all inputs

### Security Audits

The bridge has undergone comprehensive security audits:

- **Smart Contract Audit**: Completed by leading security firms
- **Penetration Testing**: Web interface and API security testing
- **Code Review**: Comprehensive code review by security experts

### Best Practices

- Keep private keys secure and never commit them to version control
- Use hardware wallets for production deployments
- Regularly update dependencies and monitor for vulnerabilities
- Implement proper logging and monitoring
- Conduct regular security assessments

## 📊 Monitoring

### Health Checks

The system includes comprehensive health monitoring:

```bash
# Health check endpoint
GET /api/health

# Bridge service health
GET /api/bridge/health

# Starknet connection health
GET /api/starknet/health
```

### Metrics and Logging

- **Structured Logging**: JSON-formatted logs with configurable levels
- **Performance Metrics**: Response times, throughput, error rates
- **Bridge Statistics**: Transfer volumes, success rates, processing times
- **Alerting**: Configurable alerts for critical events

### Dashboard

Access the monitoring dashboard at:
```
http://localhost:3001/monitoring
```

## 🔧 Troubleshooting

### Common Issues

#### Contract Deployment Failures

```bash
# Check Starknet connection
npm run starknet:health

# Verify account balance
npm run starknet:balance

# Check gas prices
npm run starknet:gas
```

#### Bridge Transfer Issues

```bash
# Check transaction status
GET /api/bridge/status/{transactionId}

# Verify Bitcoin node connection
npm run bitcoin:health

# Check operator status
GET /api/operators/status
```

#### Staking Issues

```bash
# Check staking configuration
GET /api/staking/config

# Verify token balances
GET /api/tokens/balance/{address}

# Check reward calculations
GET /api/staking/rewards/{address}
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
DEBUG=* npm run dev
```

### Log Files

- **Application Logs**: `./logs/app.log`
- **Error Logs**: `./logs/errors.log`
- **Audit Logs**: `./logs/audit.log`

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/vernwallet-bridge.git
   cd vernwallet-bridge
   ```

3. **Install dependencies**:
   ```bash
   npm run setup
   ```

4. **Create feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

5. **Make your changes**

6. **Run tests**:
   ```bash
   npm run test
   ```

7. **Commit changes**:
   ```bash
   git commit -m 'Add amazing feature'
   ```

8. **Push to branch**:
   ```bash
   git push origin feature/amazing-feature
   ```

9. **Open Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write comprehensive tests for new features
- Update documentation for any API changes
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](./docs/api.md)
- [Smart Contract Documentation](./docs/contracts.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Guide](./docs/security.md)

### Community
- **Discord**: [Join our community](https://discord.gg/vernwallet)
- **Twitter**: [@VernWallet](https://twitter.com/VernWallet)
- **GitHub Issues**: [Report bugs](https://github.com/vernwallet/bridge/issues)

### Professional Support
For enterprise deployments and custom integrations:
- **Email**: enterprise@vernwallet.com
- **Security**: security@vernwallet.com

## 🔄 Updates and Changelog

### Version History

#### v2.1.4 (Latest)
- Enhanced staking rewards calculation
- Improved error handling and user feedback
- Security patches and optimizations
- Updated dependencies and libraries

#### v2.1.3
- Added comprehensive monitoring dashboard
- Improved Bitcoin SPV verification
- Enhanced rate limiting and DDoS protection
- Bug fixes and performance improvements

#### v2.1.2
- Introduced staking functionality
- Added emergency pause controls
- Improved cross-chain communication
- Enhanced security measures

### Upgrade Guide

To upgrade from previous versions:

```bash
# Backup current deployment
npm run backup

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Run database migrations
npm run db:migrate

# Deploy updated contracts
npm run contracts:deploy

# Restart services
npm run restart
```

## 🎯 Roadmap

### Upcoming Features

- [ ] **Layer 3 Support**: Integration with additional Layer 2/3 networks
- [ ] **NFT Bridge**: Support for bridging NFTs between chains
- [ ] **Cross-chain DEX**: Integrated decentralized exchange functionality
- [ ] **Mobile App**: Native mobile application for iOS and Android
- [ ] **Advanced Analytics**: Enhanced reporting and analytics dashboard

### Research and Development

- **Zero-knowledge Proofs**: Enhanced privacy features using ZKPs
- **Optimistic Bridging**: Faster transfer times with optimistic validation
- **Multi-asset Support**: Support for additional cryptocurrencies
- **Governance Integration**: Community governance for bridge parameters

---

**Built with ❤️ by the VernWallet Team**

For questions, suggestions, or contributions, please reach out to us. We're always excited to hear from the community and work together to build the best cross-chain bridging experience possible!