# Deployment Guide

This comprehensive guide covers the deployment of the VernWallet Bitcoin-Starknet Bridge system across different environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Contract Deployment](#contract-deployment)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment](#post-deployment)
- [Monitoring Setup](#monitoring-setup)

## Quick Start

### Prerequisites Check

Before deployment, ensure you have:

- [ ] Node.js >= 18.0.0
- [ ] Scarb (Cairo package manager)
- [ ] Starknet Foundry
- [ ] PostgreSQL database
- [ ] Bitcoin node (for mainnet)
- [ ] Starknet account with sufficient funds

### One-Command Deployment

```bash
# Clone repository
git clone https://github.com/vernwallet/bridge.git
cd bridge

# Install all dependencies
npm run setup

# Deploy smart contracts
npm run contracts:deploy

# Start all services
npm run dev
```

The bridge will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Development Deployment

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Development Configuration** (`.env`):
```bash
NODE_ENV=development
BITCOIN_NETWORK=testnet
STARKNET_NETWORK=sepolia

# Bitcoin Core (testnet)
BITCOIN_RPC_URL=http://localhost:18332
BITCOIN_RPC_USER=testnet_user
BITCOIN_RPC_PASSWORD=testnet_password

# Starknet (Sepolia testnet)
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0.7
STARKNET_ACCOUNT_ADDRESS=your_testnet_account
STARKNET_PRIVATE_KEY=your_testnet_private_key

# Database
DATABASE_URL=postgresql://dev:password@localhost:5432/bridge_dev
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb bridge_dev

# Run migrations
npm run db:migrate

# Seed test data (optional)
npm run db:seed
```

### 3. Contract Deployment

```bash
# Build Cairo contracts
npm run contracts:build

# Deploy to Starknet Sepolia
STARKNET_NETWORK=sepolia npm run contracts:deploy

# Verify deployment
npm run contracts:verify
```

### 4. Service Startup

```bash
# Start backend services
npm run backend:dev

# In another terminal, start frontend
npm run frontend:dev

# Or start both together
npm run dev
```

## Production Deployment

### 1. Production Environment Configuration

**Production Configuration** (`.env`):
```bash
NODE_ENV=production
BITCOIN_NETWORK=mainnet
STARKNET_NETWORK=mainnet

# Bitcoin Core (mainnet)
BITCOIN_RPC_URL=http://localhost:8332
BITCOIN_RPC_USER=mainnet_user
BITCOIN_RPC_PASSWORD=secure_mainnet_password

# Starknet (mainnet)
STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io/rpc/v0.7
STARKNET_ACCOUNT_ADDRESS=your_mainnet_account
STARKNET_PRIVATE_KEY=your_mainnet_private_key

# Production database
DATABASE_URL=postgresql://prod:secure_password@db-host:5432/bridge_prod

# Security settings
BRIDGE_EMERGENCY_ADMIN=secure_admin_address
RATE_LIMIT_PER_MINUTE=100
```

### 2. Production Database Setup

```bash
# Create production database
createdb bridge_prod

# Run production migrations
NODE_ENV=production npm run db:migrate

# Verify database connectivity
npm run db:health
```

### 3. Mainnet Contract Deployment

```bash
# Build contracts for mainnet
NODE_ENV=production npm run contracts:build

# Deploy to Starknet mainnet
NODE_ENV=production STARKNET_NETWORK=mainnet npm run contracts:deploy

# Verify mainnet deployment
NODE_ENV=production npm run contracts:verify
```

### 4. Production Services

#### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start backend with PM2
pm2 start backend/src/index.js --name "vernwallet-backend"

# Start frontend build
npm run frontend:build
pm2 start "npm run frontend:start" --name "vernwallet-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Using Systemd

Create systemd service files:

**`/etc/systemd/system/vernwallet-backend.service`**:
```ini
[Unit]
Description=VernWallet Bridge Backend
After=network.target postgresql.service

[Service]
Type=simple
User=bridge
WorkingDirectory=/opt/vernwallet
ExecStart=/usr/bin/node backend/src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/vernwallet-frontend.service`**:
```ini
[Unit]
Description=VernWallet Bridge Frontend
After=network.target

[Service]
Type=simple
User=bridge
WorkingDirectory=/opt/vernwallet
ExecStart=/usr/bin/npm run frontend:start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
sudo systemctl enable vernwallet-backend vernwallet-frontend
sudo systemctl start vernwallet-backend vernwallet-frontend
```

## Docker Deployment

### 1. Docker Compose Setup

**`docker-compose.yml`**:
```yaml
version: '3.8'
services:
  bridge-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://bridge:password@db:5432/bridge_prod
    depends_on:
      - db
      - redis
    ports:
      - "3001:3001"
    volumes:
      - ./logs:/app/logs

  bridge-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - bridge-backend

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: bridge_prod
      POSTGRES_USER: bridge
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. Dockerfiles

**`Dockerfile.backend`**:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --only=production

COPY . .
RUN npm run contracts:build

EXPOSE 3001
CMD ["node", "backend/src/index.js"]
```

**`Dockerfile.frontend`**:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci

COPY . .
RUN npm run frontend:build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f bridge-backend
```

## Cloud Deployment

### AWS Deployment

#### 1. Infrastructure Setup

```bash
# Create VPC and subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create security groups
aws ec2 create-security-group --group-name bridge-sg --description "Bridge security group"

# Launch EC2 instances
aws ec2 run-instances --image-id ami-12345678 --instance-type t3.large --security-group-ids sg-12345678
```

#### 2. RDS Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier bridge-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username bridge \
  --master-user-password secure_password \
  --allocated-storage 20
```

#### 3. Application Deployment

```bash
# Upload application to EC2
scp -r /local/bridge ubuntu@ec2-instance:/opt/

# Install dependencies on EC2
ssh ubuntu@ec2-instance
cd /opt/bridge
npm run setup

# Configure production environment
cp .env.production .env

# Deploy contracts
npm run contracts:deploy

# Start services with PM2
pm2 start ecosystem.config.js
```

### Google Cloud Deployment

#### 1. Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create bridge-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create bridge_prod --instance=bridge-db
```

#### 2. Compute Engine

```bash
# Create instance
gcloud compute instances create bridge-instance \
  --machine-type=e2-medium \
  --network=default \
  --maintenance-policy=MIGRATE \
  --image=cos-cloud/cos-stable \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-standard \
  --boot-disk-device-name=bridge-disk

# Install Docker and Docker Compose
gcloud compute ssh bridge-instance --command="
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker \$USER
"

# Deploy application
gcloud compute scp docker-compose.yml bridge-instance:~
gcloud compute ssh bridge-instance --command="docker-compose up -d"
```

## Contract Deployment

### Cairo Contract Deployment

#### 1. Build Contracts

```bash
# Build all Cairo contracts
scarb build

# Build with optimizations
scarb build --release
```

#### 2. Declare Contracts

```bash
# Declare each contract on Starknet
starkli contract declare target/release/Bridge.contract_class.json --keystore-path keystore.json

starkli contract declare target/release/SBTC.contract_class.json --keystore-path keystore.json

starkli contract declare target/release/OperatorRegistry.contract_class.json --keystore-path keystore.json

# ... declare other contracts
```

#### 3. Deploy Contracts

```bash
# Deploy Bridge contract with constructor arguments
starkli contract deploy \
  BRIDGE_CLASS_HASH \
  ADMIN_ADDRESS \
  EMERGENCY_ADMIN_ADDRESS \
  BTC_GENESIS_HASH \
  DAILY_LIMIT \
  --keystore-path keystore.json

# Deploy SBTC token
starkli contract deploy \
  SBTC_CLASS_HASH \
  BRIDGE_CONTRACT_ADDRESS \
  --keystore-path keystore.json
```

#### 4. Verify Deployment

```bash
# Check contract deployment status
starkli contract status CONTRACT_ADDRESS

# Verify contract functionality
npm run contracts:verify
```

### Environment-Specific Deployments

#### Sepolia Testnet

```bash
export STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0.7
export STARKNET_NETWORK=sepolia

# Deploy to Sepolia
npm run contracts:deploy:sepolia
```

#### Mainnet

```bash
export STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io/rpc/v0.7
export STARKNET_NETWORK=mainnet

# Deploy to mainnet (requires mainnet account)
npm run contracts:deploy:mainnet
```

## Environment Configuration

### Configuration Files

#### Development (`config/development.toml`)
```toml
[api]
port = 3001
host = "localhost"

[bitcoin]
network = "testnet"
rpc_timeout = 10000

[starknet]
network = "sepolia"
rpc_timeout = 10000

[bridge]
confirmations_required = 3
daily_limit = "1000000000000000000000"
```

#### Production (`config/production.toml`)
```toml
[api]
port = 8080
host = "0.0.0.0"

[bitcoin]
network = "mainnet"
rpc_timeout = 30000

[starknet]
network = "mainnet"
rpc_timeout = 30000

[bridge]
confirmations_required = 6
daily_limit = "1000000000000000000000000000000000"
```

### Environment Variables

#### Required Variables

```bash
# Network Configuration
NODE_ENV=production
BITCOIN_NETWORK=mainnet
STARKNET_NETWORK=mainnet

# Bitcoin Node
BITCOIN_RPC_URL=http://bitcoin-node:8332
BITCOIN_RPC_USER=rpc_user
BITCOIN_RPC_PASSWORD=rpc_password

# Starknet Account
STARKNET_ACCOUNT_ADDRESS=0x...
STARKNET_PRIVATE_KEY=0x...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Contract Addresses (populated after deployment)
STARKNET_BRIDGE_CONTRACT_ADDRESS=0x...
STARKNET_SBTC_CONTRACT_ADDRESS=0x...
```

#### Optional Variables

```bash
# Security
EMERGENCY_ADMIN_ADDRESS=0x...
OPERATOR_QUORUM=3

# Limits
DAILY_BRIDGE_LIMIT=1000000000000000000000000000000000
RATE_LIMIT_PER_MINUTE=100

# Staking
STAKING_ENABLED=true
REWARD_RATE=1000000000000000000
```

## Post-Deployment

### 1. Initial Setup

```bash
# Run post-deployment setup
npm run post-deploy

# Initialize database with seed data
npm run db:seed

# Set up initial operators
npm run operators:setup
```

### 2. Health Verification

```bash
# Check all services
npm run health:check

# Verify Bitcoin connectivity
npm run bitcoin:health

# Verify Starknet connectivity
npm run starknet:health

# Check bridge functionality
npm run bridge:health
```

### 3. Security Setup

```bash
# Set up SSL certificates
npm run ssl:setup

# Configure firewall
npm run firewall:setup

# Set up monitoring
npm run monitoring:setup
```

### 4. Backup Configuration

```bash
# Set up automated backups
npm run backup:setup

# Configure backup retention
npm run backup:config

# Test backup restoration
npm run backup:test
```

## Monitoring Setup

### 1. Application Monitoring

```bash
# Install monitoring dependencies
npm install -g pm2-monitoring

# Set up PM2 monitoring
pm2 install pm2-monitoring
pm2 set pm2-monitoring:port 9200

# Start monitoring dashboard
pm2 monit
```

### 2. Log Aggregation

```bash
# Set up log rotation
npm run logs:setup

# Configure log shipping to external service
npm run logs:ship
```

### 3. Alerting

```bash
# Set up alerting rules
npm run alerts:setup

# Configure notification channels
npm run alerts:channels

# Test alert system
npm run alerts:test
```

### 4. Performance Monitoring

```bash
# Set up performance monitoring
npm run performance:setup

# Configure metrics collection
npm run metrics:setup

# Set up dashboards
npm run dashboards:setup
```

## Troubleshooting

### Common Deployment Issues

#### Contract Deployment Failures

**Issue**: Contract deployment fails with "insufficient funds"

**Solution**:
```bash
# Check account balance
starkli account balance --keystore-path keystore.json

# Fund account if needed
starkli faucet --keystore-path keystore.json
```

**Issue**: Contract declaration fails

**Solution**:
```bash
# Check if contract already declared
starkli contract status CONTRACT_CLASS_HASH

# Redeclare if needed
starkli contract declare CONTRACT_FILE --keystore-path keystore.json
```

#### Service Startup Issues

**Issue**: Backend fails to start

**Solution**:
```bash
# Check database connectivity
npm run db:health

# Verify environment variables
npm run config:verify

# Check logs
pm2 logs bridge-backend
```

**Issue**: Frontend build fails

**Solution**:
```bash
# Clear build cache
npm run frontend:clean
npm run frontend:build

# Check Node.js version
node --version
```

#### Network Connectivity Issues

**Issue**: Bitcoin node connection fails

**Solution**:
```bash
# Test Bitcoin RPC connection
curl -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"getblockchaininfo","params":[]}' \
  http://localhost:8332

# Check Bitcoin node logs
tail -f /path/to/bitcoin/debug.log
```

**Issue**: Starknet RPC connection fails

**Solution**:
```bash
# Test Starknet RPC connection
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"starknet_blockNumber","params":[],"id":1}' \
  https://starknet-sepolia.public.blastapi.io/rpc/v0.7

# Check alternative RPC endpoints
npm run starknet:rpc:health
```

### Performance Optimization

#### Database Optimization

```bash
# Analyze query performance
npm run db:analyze

# Optimize database indexes
npm run db:optimize

# Clean up old data
npm run db:cleanup
```

#### Application Optimization

```bash
# Enable caching
npm run cache:enable

# Optimize static assets
npm run assets:optimize

# Configure load balancing
npm run load-balancer:setup
```

### Security Hardening

#### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw --force enable
```

#### SSL/TLS Setup

```bash
# Install certbot
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot --nginx -d bridge.yourdomain.com

# Configure automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Support

For deployment assistance:

- **Documentation**: [Full Documentation](../README.md)
- **Issues**: [GitHub Issues](https://github.com/vernwallet/bridge/issues)
- **Discord**: [Community Support](https://discord.gg/vernwallet)
- **Email**: support@vernwallet.com

## Checklist

### Pre-Deployment
- [ ] All prerequisites installed
- [ ] Environment variables configured
- [ ] Database created and accessible
- [ ] Bitcoin node running and synced
- [ ] Starknet account funded

### During Deployment
- [ ] Contracts compile successfully
- [ ] Contract deployment transactions confirmed
- [ ] Backend services start without errors
- [ ] Frontend builds successfully
- [ ] All health checks pass

### Post-Deployment
- [ ] Bridge functionality tested
- [ ] Staking features verified
- [ ] Monitoring and alerting configured
- [ ] Backup systems tested
- [ ] Security measures implemented

### Production Readiness
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Support procedures documented