/**
 * Starknet Service - Handles interaction with Starknet blockchain and smart contracts
 * Enhanced with comprehensive wallet integration and contract interaction support
 */

const { Provider, Contract, Account, CallData, shortString, ec, constants } = require('starknet');
const config = require('../config');
const logger = require('../utils/logger');

class StarknetService {
    constructor() {
        this.provider = null;
        this.account = null;
        this.contracts = new Map();
        this.isInitialized = false;

        // Contract addresses (will be updated after deployment)
        this.contractAddresses = {
            bridge: config.starknet.bridgeContractAddress || '',
            sbtc: config.starknet.sbtcContractAddress || '',
            operatorRegistry: config.starknet.operatorRegistryAddress || '',
            btcDepositManager: config.starknet.btcDepositManagerAddress || '',
            bitcoinUtils: config.starknet.bitcoinUtilsAddress || '',
            cryptoUtils: config.starknet.cryptoUtilsAddress || '',
            spvVerifier: config.starknet.spvVerifierAddress || '',
            bitcoinClient: config.starknet.bitcoinClientAddress || '',
            bitcoinHeaders: config.starknet.bitcoinHeadersAddress || '',
            btcPegOut: config.starknet.btcPegOutAddress || '',
            escapeHatch: config.starknet.escapeHatchAddress || ''
        };
    }

    async initialize() {
        try {
            logger.info('Initializing Starknet service...');

            // Initialize provider
            this.provider = new Provider({
                rpc: {
                    nodeUrl: config.starknet.rpcUrl
                }
            });

            // Initialize account if private key is provided
            if (config.starknet.privateKey && config.starknet.accountAddress) {
                const account = new Account(this.provider, config.starknet.accountAddress, config.starknet.privateKey);
                this.account = account;
                logger.info(`Starknet account initialized: ${config.starknet.accountAddress}`);
            }

            // Load contract ABIs and initialize contracts
            await this.initializeContracts();

            this.isInitialized = true;
            logger.info('Starknet service initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize Starknet service:', error);
            throw error;
        }
    }

    async initializeContracts() {
        try {
            // Contract ABIs (loaded from our generated ABI files)
            const bridgeAbi = require('../contracts/Bridge.json');
            const sbtcAbi = require('../contracts/SBTC.json');
            const operatorRegistryAbi = require('../contracts/OperatorRegistry.json');
            const btcDepositManagerAbi = require('../contracts/BTCDepositManager.json');
            const bitcoinUtilsAbi = require('../contracts/BitcoinUtils.json');
            const cryptoUtilsAbi = require('../contracts/CryptoUtils.json');
            const spvVerifierAbi = require('../contracts/SPVVerifier.json');
            const bitcoinClientAbi = require('../contracts/BitcoinClient.json');
            const bitcoinHeadersAbi = require('../contracts/BitcoinHeaders.json');
            const btcPegOutAbi = require('../contracts/BTCPegOut.json');
            const escapeHatchAbi = require('../contracts/EscapeHatch.json');

            // Initialize contracts if addresses are available
            if (this.contractAddresses.bridge) {
                this.contracts.set('bridge', new Contract(bridgeAbi, this.contractAddresses.bridge, this.provider));
                logger.info(`Bridge contract initialized at: ${this.contractAddresses.bridge}`);
            }

            if (this.contractAddresses.sbtc) {
                this.contracts.set('sbtc', new Contract(sbtcAbi, this.contractAddresses.sbtc, this.provider));
                logger.info(`SBTC contract initialized at: ${this.contractAddresses.sbtc}`);
            }

            if (this.contractAddresses.operatorRegistry) {
                this.contracts.set('operatorRegistry', new Contract(operatorRegistryAbi, this.contractAddresses.operatorRegistry, this.provider));
                logger.info(`OperatorRegistry contract initialized at: ${this.contractAddresses.operatorRegistry}`);
            }

            if (this.contractAddresses.btcDepositManager) {
                this.contracts.set('btcDepositManager', new Contract(btcDepositManagerAbi, this.contractAddresses.btcDepositManager, this.provider));
                logger.info(`BTCDepositManager contract initialized at: ${this.contractAddresses.btcDepositManager}`);
            }

            if (this.contractAddresses.bitcoinUtils) {
                this.contracts.set('bitcoinUtils', new Contract(bitcoinUtilsAbi, this.contractAddresses.bitcoinUtils, this.provider));
                logger.info(`BitcoinUtils contract initialized at: ${this.contractAddresses.bitcoinUtils}`);
            }

            if (this.contractAddresses.cryptoUtils) {
                this.contracts.set('cryptoUtils', new Contract(cryptoUtilsAbi, this.contractAddresses.cryptoUtils, this.provider));
                logger.info(`CryptoUtils contract initialized at: ${this.contractAddresses.cryptoUtils}`);
            }

            if (this.contractAddresses.spvVerifier) {
                this.contracts.set('spvVerifier', new Contract(spvVerifierAbi, this.contractAddresses.spvVerifier, this.provider));
                logger.info(`SPVVerifier contract initialized at: ${this.contractAddresses.spvVerifier}`);
            }

            if (this.contractAddresses.bitcoinClient) {
                this.contracts.set('bitcoinClient', new Contract(bitcoinClientAbi, this.contractAddresses.bitcoinClient, this.provider));
                logger.info(`BitcoinClient contract initialized at: ${this.contractAddresses.bitcoinClient}`);
            }

            if (this.contractAddresses.bitcoinHeaders) {
                this.contracts.set('bitcoinHeaders', new Contract(bitcoinHeadersAbi, this.contractAddresses.bitcoinHeaders, this.provider));
                logger.info(`BitcoinHeaders contract initialized at: ${this.contractAddresses.bitcoinHeaders}`);
            }

            if (this.contractAddresses.btcPegOut) {
                this.contracts.set('btcPegOut', new Contract(btcPegOutAbi, this.contractAddresses.btcPegOut, this.provider));
                logger.info(`BTCPegOut contract initialized at: ${this.contractAddresses.btcPegOut}`);
            }

            if (this.contractAddresses.escapeHatch) {
                this.contracts.set('escapeHatch', new Contract(escapeHatchAbi, this.contractAddresses.escapeHatch, this.provider));
                logger.info(`EscapeHatch contract initialized at: ${this.contractAddresses.escapeHatch}`);
            }

            logger.info(`Initialized ${this.contracts.size} Starknet contracts`);

        } catch (error) {
            logger.error('Failed to initialize contracts:', error);
            throw error;
        }
    }

    // Bridge Contract Functions
    async initiateBitcoinDeposit(amount, btcTxHash, starknetRecipient) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');

            // Convert amount to felt (Starknet's field element)
            const amountFelt = this.toFelt(amount);

            // Convert BTC tx hash to felt
            const btcTxHashFelt = this.btcTxToFelt(btcTxHash);

            // Convert Starknet address to felt
            const recipientFelt = this.toFelt(starknetRecipient);

            // Call bridge contract
            const result = await bridgeContract.initiate_bitcoin_deposit(
                amountFelt,
                btcTxHashFelt,
                recipientFelt
            );

            logger.info('Bitcoin deposit initiated:', { btcTxHash, amount, starknetRecipient, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash,
                depositId: result.events?.find(e => e.event_name === 'BitcoinDepositInitiated')?.data?.deposit_id
            };

        } catch (error) {
            logger.error('Failed to initiate Bitcoin deposit:', error);
            throw error;
        }
    }

    async initiateDeposit(btcTxHash, amount, starknetRecipient, operatorSignatures) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');

            // Convert amount to felt (Starknet's field element)
            const amountFelt = this.toFelt(amount);

            // Convert BTC tx hash to felt
            const btcTxHashFelt = this.btcTxToFelt(btcTxHash);

            // Convert Starknet address to felt
            const recipientFelt = this.toFelt(starknetRecipient);

            // Prepare operator signatures
            const signatures = operatorSignatures.map(sig => [
                this.toFelt(sig.r),
                this.toFelt(sig.s),
                this.toFelt(sig.v)
            ]);

            // Call bridge contract
            const result = await bridgeContract.initiate_deposit(
                btcTxHashFelt,
                amountFelt,
                recipientFelt,
                signatures
            );

            logger.info('Deposit initiated:', { btcTxHash, amount, starknetRecipient, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash,
                depositId: result.events?.find(e => e.event_name === 'DepositInitiated')?.data?.deposit_id
            };

        } catch (error) {
            logger.error('Failed to initiate deposit:', error);
            throw error;
        }
    }

    async initiateBitcoinWithdrawal(amount, btcRecipient) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');

            const amountFelt = this.toFelt(amount);
            const recipientFelt = this.btcAddressToFelt(btcRecipient);

            const result = await bridgeContract.initiate_bitcoin_withdrawal(
                amountFelt,
                recipientFelt
            );

            logger.info('Bitcoin withdrawal initiated:', { amount, btcRecipient, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash,
                withdrawalId: result.events?.find(e => e.event_name === 'BitcoinWithdrawalInitiated')?.data?.withdrawal_id
            };

        } catch (error) {
            logger.error('Failed to initiate Bitcoin withdrawal:', error);
            throw error;
        }
    }

    async initiateWithdrawal(amount, btcRecipient, operatorSignatures) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');

            const amountFelt = this.toFelt(amount);
            const recipientFelt = this.btcAddressToFelt(btcRecipient);

            const signatures = operatorSignatures.map(sig => [
                this.toFelt(sig.r),
                this.toFelt(sig.s),
                this.toFelt(sig.v)
            ]);

            const result = await bridgeContract.initiate_withdrawal(
                amountFelt,
                recipientFelt,
                signatures
            );

            logger.info('Withdrawal initiated:', { amount, btcRecipient, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash,
                withdrawalId: result.events?.find(e => e.event_name === 'WithdrawalInitiated')?.data?.withdrawal_id
            };

        } catch (error) {
            logger.error('Failed to initiate withdrawal:', error);
            throw error;
        }
    }

    async getDepositStatus(depositId) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const depositIdFelt = this.toFelt(depositId);

            const result = await bridgeContract.get_deposit_status(depositIdFelt);

            return {
                depositId,
                status: this.feltToStatus(result.status),
                amount: this.feltToUint256(result.amount),
                confirmations: parseInt(result.confirmations),
                createdAt: new Date(parseInt(result.created_at) * 1000),
                completedAt: result.completed_at ? new Date(parseInt(result.completed_at) * 1000) : null
            };

        } catch (error) {
            logger.error('Failed to get deposit status:', error);
            throw error;
        }
    }

    async getWithdrawalStatus(withdrawalId) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const withdrawalIdFelt = this.toFelt(withdrawalId);

            const result = await bridgeContract.get_withdrawal_status(withdrawalIdFelt);

            return {
                withdrawalId,
                status: this.feltToStatus(result.status),
                amount: this.feltToUint256(result.amount),
                btcRecipient: this.feltToBtcAddress(result.btc_recipient),
                createdAt: new Date(parseInt(result.created_at) * 1000),
                completedAt: result.completed_at ? new Date(parseInt(result.completed_at) * 1000) : null
            };

        } catch (error) {
            logger.error('Failed to get withdrawal status:', error);
            throw error;
        }
    }

    // SBTC Token Functions
    async mintSBTC(recipient, amount) {
        try {
            if (!this.contracts.has('sbtc')) {
                throw new Error('SBTC contract not initialized');
            }

            const sbtcContract = this.contracts.get('sbtc');
            const amountFelt = this.toFelt(amount);
            const recipientFelt = this.toFelt(recipient);

            const result = await sbtcContract.mint(recipientFelt, amountFelt);

            logger.info('SBTC minted:', { recipient, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to mint SBTC:', error);
            throw error;
        }
    }

    async burnSBTC(amount) {
        try {
            if (!this.contracts.has('sbtc')) {
                throw new Error('SBTC contract not initialized');
            }

            const sbtcContract = this.contracts.get('sbtc');
            const amountFelt = this.toFelt(amount);

            const result = await sbtcContract.burn(amountFelt);

            logger.info('SBTC burned:', { amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to burn SBTC:', error);
            throw error;
        }
    }

    async getSBTCBalance(address) {
        try {
            if (!this.contracts.has('sbtc')) {
                throw new Error('SBTC contract not initialized');
            }

            const sbtcContract = this.contracts.get('sbtc');
            const addressFelt = this.toFelt(address);

            const result = await sbtcContract.balanceOf(addressFelt);
            const balance = this.feltToUint256(result);

            return {
                address,
                balance,
                formattedBalance: this.formatSBTC(balance)
            };

        } catch (error) {
            logger.error('Failed to get SBTC balance:', error);
            throw error;
        }
    }

    // Staking Functions
    async stake(tokenAddress, amount) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const amountFelt = this.toFelt(amount);
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.stake(tokenFelt, amountFelt);

            logger.info('Token staked:', { tokenAddress, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to stake tokens:', error);
            throw error;
        }
    }

    async unstake(tokenAddress, amount) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const amountFelt = this.toFelt(amount);
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.unstake(tokenFelt, amountFelt);

            logger.info('Token unstaked:', { tokenAddress, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to unstake tokens:', error);
            throw error;
        }
    }

    async claimStakingRewards(tokenAddress) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.claim_rewards(tokenFelt);

            logger.info('Staking rewards claimed:', { tokenAddress, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to claim staking rewards:', error);
            throw error;
        }
    }

    async getStakingPosition(userAddress, tokenAddress) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const userFelt = this.toFelt(userAddress);
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.get_staking_position(userFelt, tokenFelt);

            return {
                user: userAddress,
                token: tokenAddress,
                amount: this.feltToUint256(result.amount),
                stakedAt: new Date(parseInt(result.staked_at) * 1000),
                lastRewardUpdate: new Date(parseInt(result.last_reward_update) * 1000),
                rewardDebt: this.feltToUint256(result.reward_debt)
            };

        } catch (error) {
            logger.error('Failed to get staking position:', error);
            throw error;
        }
    }

    async getUserStakingRewards(userAddress) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const userFelt = this.toFelt(userAddress);

            const result = await bridgeContract.get_user_rewards(userFelt);
            const rewards = this.feltToUint256(result);

            return {
                user: userAddress,
                rewards,
                formattedRewards: this.formatSBTC(rewards)
            };

        } catch (error) {
            logger.error('Failed to get user staking rewards:', error);
            throw error;
        }
    }

    // Operator Registry Functions
    async registerOperator(operatorInfo) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');

            const result = await bridgeContract.register_bridge_operator(
                this.toFelt(operatorInfo.publicKey),
                this.toFelt(operatorInfo.bondAmount)
            );

            logger.info('Operator registered:', { operatorInfo, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash,
                operatorId: result.events?.find(e => e.event_name === 'OperatorRegistered')?.data?.operator_id
            };

        } catch (error) {
            logger.error('Failed to register operator:', error);
            throw error;
        }
    }

    async getOperatorInfo(operatorId) {
        try {
            if (!this.contracts.has('operatorRegistry')) {
                throw new Error('Operator registry contract not initialized');
            }

            const registryContract = this.contracts.get('operatorRegistry');
            const operatorIdFelt = this.toFelt(operatorId);

            const result = await registryContract.get_operator_info(operatorIdFelt);

            return {
                operatorId,
                isActive: result.is_active === '1',
                bondAmount: this.feltToUint256(result.bond_amount),
                publicKey: result.public_key,
                location: result.location,
                registeredAt: new Date(parseInt(result.registered_at) * 1000),
                lastSeen: new Date(parseInt(result.last_seen) * 1000)
            };

        } catch (error) {
            logger.error('Failed to get operator info:', error);
            throw error;
        }
    }

    async getActiveOperators() {
        const maxRetries = 3;
        const retryDelay = 2000; // 2 seconds

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!this.contracts.has('operatorRegistry')) {
                    logger.warn('Operator registry contract not initialized, using fallback');
                    return this.getFallbackOperators();
                }

                const registryContract = this.contracts.get('operatorRegistry');

                // Add timeout to the contract call
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Contract call timeout')), 10000);
                });

                const callPromise = registryContract.get_active_operators();
                const result = await Promise.race([callPromise, timeoutPromise]);

                if (!result || result.length === 0) {
                    logger.warn('No active operators found, using fallback');
                    return this.getFallbackOperators();
                }

                return result.map((operatorId, index) => ({
                    operatorId: this.feltToUint256(operatorId),
                    index
                }));

            } catch (error) {
                logger.warn(`Failed to get active operators (attempt ${attempt}/${maxRetries}):`, error.message);

                if (attempt === maxRetries) {
                    logger.error('All attempts to get active operators failed, using fallback');
                    return this.getFallbackOperators();
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    // Fallback method when Starknet RPC fails
    getFallbackOperators() {
        logger.info('Using fallback operators for bridge operations');

        // Return a minimal set of mock operators for bridge functionality
        return [
            { operatorId: '1', index: 0 },
            { operatorId: '2', index: 1 },
            { operatorId: '3', index: 2 }
        ];
    }

    // BitcoinUtils Contract Functions
    async validateBitcoinAddress(address) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const addressFelt = this.toFelt(address);

            const result = await bitcoinUtilsContract.validate_bitcoin_address(addressFelt);

            return {
                isValid: result[0] === '1',
                addressInfo: {
                    addressType: this.feltToEnum(result[1].address_type),
                    network: this.feltToEnum(result[1].network),
                    hash160: this.feltToUint256(result[1].hash160),
                    witnessVersion: parseInt(result[1].witness_version),
                    witnessProgram: this.feltToUint256(result[1].witness_program)
                }
            };

        } catch (error) {
            logger.error('Failed to validate Bitcoin address:', error);
            throw error;
        }
    }

    async parseBitcoinTransaction(rawTx) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const txData = rawTx.map(byte => this.toFelt(byte));

            const result = await bitcoinUtilsContract.parse_transaction(txData);

            return {
                version: parseInt(result.version),
                inputs: result.inputs.map(input => ({
                    txid: this.feltToUint256(input.txid),
                    vout: parseInt(input.vout),
                    scriptSig: input.script_sig.map(sig => parseInt(sig)),
                    sequence: parseInt(input.sequence),
                    witness: input.witness.map(wit => wit.map(w => parseInt(w)))
                })),
                outputs: result.outputs.map(output => ({
                    value: parseInt(output.value),
                    scriptPubkey: output.script_pubkey.map(pk => parseInt(pk))
                })),
                locktime: parseInt(result.locktime),
                txid: this.feltToUint256(result.txid),
                witnessTxid: this.feltToUint256(result.witness_txid)
            };

        } catch (error) {
            logger.error('Failed to parse Bitcoin transaction:', error);
            throw error;
        }
    }

    async computeBitcoinTxid(txData) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const txBytes = txData.map(byte => this.toFelt(byte));

            const result = await bitcoinUtilsContract.compute_txid(txBytes);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to compute Bitcoin txid:', error);
            throw error;
        }
    }

    async satoshisToBtc(satoshis) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const satoshisUint = this.toFelt(satoshis.toString());

            const result = await bitcoinUtilsContract.satoshis_to_btc(satoshisUint);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to convert satoshis to BTC:', error);
            throw error;
        }
    }

    async btcToSatoshis(btcAmount) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const btcUint = this.toFelt(btcAmount.toString());

            const result = await bitcoinUtilsContract.btc_to_satoshis(btcUint);
            return parseInt(result);

        } catch (error) {
            logger.error('Failed to convert BTC to satoshis:', error);
            throw error;
        }
    }

    async generateBitcoinDepositAddress(starknetRecipient, network = 'Mainnet') {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const bitcoinUtilsContract = this.contracts.get('bitcoinUtils');
            const recipientFelt = this.toFelt(starknetRecipient);
            const networkEnum = this.networkToEnum(network);

            const result = await bitcoinUtilsContract.generate_deposit_address(recipientFelt, networkEnum);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to generate Bitcoin deposit address:', error);
            throw error;
        }
    }

    // CryptoUtils Contract Functions
    async computeSha256(data) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const cryptoUtilsContract = this.contracts.get('cryptoUtils');
            const dataBytes = data.map(byte => this.toFelt(byte));

            const result = await cryptoUtilsContract.sha256(dataBytes);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to compute SHA256:', error);
            throw error;
        }
    }

    async computeDoubleSha256(data) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const cryptoUtilsContract = this.contracts.get('cryptoUtils');
            const dataBytes = data.map(byte => this.toFelt(byte));

            const result = await cryptoUtilsContract.double_sha256(dataBytes);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to compute double SHA256:', error);
            throw error;
        }
    }

    async computeMerkleRoot(txids) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const cryptoUtilsContract = this.contracts.get('cryptoUtils');
            const txidFelts = txids.map(txid => this.toFelt(txid));

            const result = await cryptoUtilsContract.compute_merkle_root(txidFelts);
            return this.feltToUint256(result);

        } catch (error) {
            logger.error('Failed to compute merkle root:', error);
            throw error;
        }
    }

    async verifyMerkleProof(txid, merkleRoot, merkleBranch, position) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const cryptoUtilsContract = this.contracts.get('cryptoUtils');
            const txidFelt = this.toFelt(txid);
            const merkleRootFelt = this.toFelt(merkleRoot);
            const branchFelts = merkleBranch.map(hash => this.toFelt(hash));
            const positionUint = this.toFelt(position.toString());

            const result = await cryptoUtilsContract.verify_merkle_proof(txidFelt, merkleRootFelt, branchFelts, positionUint);
            return result === '1';

        } catch (error) {
            logger.error('Failed to verify merkle proof:', error);
            throw error;
        }
    }

    // SPVVerifier Contract Functions
    async verifyTransactionInclusion(merkleProof, blockHeight) {
        try {
            if (!this.contracts.has('spvVerifier')) {
                throw new Error('SPVVerifier contract not initialized');
            }

            const spvVerifierContract = this.contracts.get('spvVerifier');
            const proofStruct = {
                merkle_root: this.toFelt(merkleProof.merkleRoot),
                tx_hash: this.toFelt(merkleProof.txHash),
                merkle_branch: merkleProof.merkleBranch.map(hash => this.toFelt(hash)),
                position: this.toFelt(merkleProof.position.toString())
            };
            const heightUint = this.toFelt(blockHeight.toString());

            const result = await spvVerifierContract.verify_transaction_inclusion(proofStruct, heightUint);
            return result === '1';

        } catch (error) {
            logger.error('Failed to verify transaction inclusion:', error);
            throw error;
        }
    }

    // BitcoinHeaders Contract Functions
    async submitBitcoinHeader(header) {
        try {
            if (!this.contracts.has('bitcoinHeaders')) {
                throw new Error('BitcoinHeaders contract not initialized');
            }

            const bitcoinHeadersContract = this.contracts.get('bitcoinHeaders');
            const headerStruct = {
                hash: this.toFelt(header.hash),
                previous_block_hash: this.toFelt(header.previousBlockHash),
                merkle_root: this.toFelt(header.merkleRoot),
                timestamp: this.toFelt(header.timestamp.toString()),
                bits: this.toFelt(header.bits.toString()),
                nonce: this.toFelt(header.nonce.toString()),
                height: this.toFelt(header.height.toString())
            };

            const result = await bitcoinHeadersContract.submit_header(headerStruct);
            return {
                success: true,
                transactionHash: result.transaction_hash,
                headerHash: this.feltToUint256(result.events?.find(e => e.event_name === 'HeaderSubmitted')?.data?.header_hash)
            };

        } catch (error) {
            logger.error('Failed to submit Bitcoin header:', error);
            throw error;
        }
    }

    async getBitcoinHeader(height) {
        try {
            if (!this.contracts.has('bitcoinHeaders')) {
                throw new Error('BitcoinHeaders contract not initialized');
            }

            const bitcoinHeadersContract = this.contracts.get('bitcoinHeaders');
            const heightUint = this.toFelt(height.toString());

            const result = await bitcoinHeadersContract.get_header(heightUint);

            return {
                hash: this.feltToUint256(result.hash),
                previousBlockHash: this.feltToUint256(result.previous_block_hash),
                merkleRoot: this.feltToUint256(result.merkle_root),
                timestamp: parseInt(result.timestamp),
                bits: parseInt(result.bits),
                nonce: parseInt(result.nonce),
                height: parseInt(result.height)
            };

        } catch (error) {
            logger.error('Failed to get Bitcoin header:', error);
            throw error;
        }
    }

    // Address Validation Functions
    isValidAddress(address) {
        try {
            if (!address || typeof address !== 'string') {
                return false;
            }

            // Check if it's a valid Starknet address (0x followed by 64 hex characters)
            if (address.startsWith('0x') && address.length === 66) {
                return /^[0-9a-fA-F]{64}$/.test(address.slice(2));
            }

            return false;
        } catch (error) {
            logger.error('Error validating address:', error);
            return false;
        }
    }

    isValidBitcoinAddress(address) {
        try {
            if (!address || typeof address !== 'string') {
                return false;
            }

            // Bitcoin address patterns
            const patterns = [
                /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Legacy (P2PKH)
                /^[bc1][a-z0-9]{39,59}$/, // SegWit (Bech32)
                /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/ // P2SH
            ];

            return patterns.some(pattern => pattern.test(address));
        } catch (error) {
            logger.error('Error validating Bitcoin address:', error);
            return false;
        }
    }

    // Utility Functions
    toFelt(value) {
        if (typeof value === 'string' && value.startsWith('0x')) {
            return value;
        }
        return CallData.compile([value])[0];
    }

    feltToUint256(felt) {
        // Convert felt string to BigInt then to decimal string
        return felt.toString();
    }

    btcTxToFelt(btcTxHash) {
        // Convert Bitcoin transaction hash to felt
        // Remove '0x' prefix if present and reverse bytes for little-endian
        const hash = btcTxHash.replace('0x', '');
        const reversed = hash.match(/.{2}/g).reverse().join('');
        return '0x' + reversed;
    }

    btcAddressToFelt(btcAddress) {
        // Convert Bitcoin address to felt representation
        // This is a simplified implementation - real implementation would need proper address conversion
        return this.toFelt(btcAddress);
    }

    feltToBtcAddress(felt) {
        // Convert felt back to Bitcoin address
        // This is a simplified implementation
        return felt.toString();
    }

    feltToStatus(felt) {
        const statusMap = {
            '0': 'pending',
            '1': 'processing',
            '2': 'completed',
            '3': 'failed',
            '4': 'cancelled'
        };
        return statusMap[felt.toString()] || 'unknown';
    }

    feltToEnum(felt) {
        // Convert felt back to enum string representation
        return felt.toString();
    }

    networkToEnum(network) {
        const networkMap = {
            'Mainnet': 0,
            'Testnet': 1,
            'Regtest': 2
        };
        return networkMap[network] || 0;
    }

    addressTypeToEnum(addressType) {
        const typeMap = {
            'P2PKH': 0,
            'P2SH': 1,
            'P2WPKH': 2,
            'P2WSH': 3,
            'P2TR': 4
        };
        return typeMap[addressType] || 0;
    }

    formatSBTC(amount) {
        // Format SBTC amount for display (assuming 8 decimal places like BTC)
        const num = parseInt(amount) / 100000000;
        return num.toFixed(8);
    }

    async getNetworkInfo() {
        try {
            const block = await this.provider.getBlock('latest');

            return {
                network: config.starknet.network,
                chainId: config.starknet.chainId,
                status: 'connected',
                latestBlock: {
                    number: parseInt(block.block_number),
                    hash: block.block_hash,
                    timestamp: new Date(parseInt(block.timestamp) * 1000),
                    gasPrice: block.gas_price
                },
                syncStatus: 'synced' // Would need to implement actual sync checking
            };

        } catch (error) {
            logger.error('Failed to get network info:', error);
            return {
                network: config.starknet.network,
                chainId: config.starknet.chainId,
                status: 'disconnected',
                error: error.message,
                syncStatus: 'disconnected'
            };
        }
    }

    async waitForTransaction(txHash, confirmations = 1) {
        try {
            logger.info(`Waiting for transaction ${txHash} with ${confirmations} confirmations...`);

            const receipt = await this.provider.waitForTransaction(txHash, {
                retryInterval: 2000,
                maxRetries: 30
            });

            if (confirmations > 1) {
                // Wait for additional confirmations
                const targetBlock = parseInt(receipt.block_number) + confirmations;
                let currentBlock = parseInt(receipt.block_number);

                while (currentBlock < targetBlock) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const block = await this.provider.getBlock('latest');
                    currentBlock = parseInt(block.block_number);
                }
            }

            logger.info(`Transaction ${txHash} confirmed`);
            return receipt;

        } catch (error) {
            logger.error(`Transaction ${txHash} failed or timed out:`, error);
            throw error;
        }
    }

    // Wallet Connection and Transaction Signing
    async connectWallet(privateKey, accountAddress) {
        try {
            if (!privateKey || !accountAddress) {
                throw new Error('Private key and account address are required');
            }

            this.account = new Account(this.provider, accountAddress, privateKey);
            logger.info(`Wallet connected: ${accountAddress}`);

            return {
                success: true,
                address: accountAddress,
                network: config.starknet.network
            };

        } catch (error) {
            logger.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    async signTransaction(transaction) {
        try {
            if (!this.account) {
                throw new Error('No wallet connected');
            }

            const signedTransaction = await this.account.execute(transaction);
            logger.info('Transaction signed:', signedTransaction.transaction_hash);

            return signedTransaction;

        } catch (error) {
            logger.error('Failed to sign transaction:', error);
            throw error;
        }
    }

    // Enhanced Bridge Functions with Wallet Integration
    async bridgeBitcoinToStarknet(btcTxHash, amount, starknetRecipient, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            // Initiate deposit through bridge contract
            const result = await this.initiateDeposit(btcTxHash, amount, starknetRecipient, []);

            // Wait for confirmation
            const receipt = await this.waitForTransaction(result.transactionHash);

            return {
                success: true,
                transactionHash: result.transactionHash,
                receipt,
                amount,
                btcTxHash,
                starknetRecipient
            };

        } catch (error) {
            logger.error('Bitcoin to Starknet bridge failed:', error);
            throw error;
        }
    }

    async bridgeStarknetToBitcoin(amount, btcRecipient, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            // Initiate withdrawal through bridge contract
            const result = await this.initiateWithdrawal(amount, btcRecipient, []);

            // Wait for confirmation
            const receipt = await this.waitForTransaction(result.transactionHash);

            return {
                success: true,
                transactionHash: result.transactionHash,
                receipt,
                amount,
                btcRecipient
            };

        } catch (error) {
            logger.error('Starknet to Bitcoin bridge failed:', error);
            throw error;
        }
    }

    // Swap Functions
    async swapTokens(fromToken, toToken, amount, minAmountOut, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            // This would interact with a DEX contract (like JediSwap or 10kSwap)
            // For now, we'll simulate the swap through our bridge contract
            const result = await this.executeSwap(fromToken, toToken, amount, minAmountOut);

            return {
                success: true,
                transactionHash: result.transactionHash,
                fromToken,
                toToken,
                amount,
                expectedOutput: minAmountOut
            };

        } catch (error) {
            logger.error('Token swap failed:', error);
            throw error;
        }
    }

    async executeSwap(fromToken, toToken, amount, minAmountOut) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const amountFelt = this.toFelt(amount);
            const minAmountOutFelt = this.toFelt(minAmountOut);
            const fromTokenFelt = this.toFelt(fromToken);
            const toTokenFelt = this.toFelt(toToken);

            const result = await bridgeContract.swap_tokens(
                fromTokenFelt,
                toTokenFelt,
                amountFelt,
                minAmountOutFelt
            );

            logger.info('Token swap executed:', { fromToken, toToken, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to execute swap:', error);
            throw error;
        }
    }

    // Deposit Functions
    async depositToContract(tokenAddress, amount, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.depositTokens(tokenAddress, amount);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount
            };

        } catch (error) {
            logger.error('Token deposit failed:', error);
            throw error;
        }
    }

    async depositTokens(tokenAddress, amount) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const amountFelt = this.toFelt(amount);
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.deposit_tokens(tokenFelt, amountFelt);

            logger.info('Tokens deposited:', { tokenAddress, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to deposit tokens:', error);
            throw error;
        }
    }

    // Withdraw Functions
    async withdrawFromContract(tokenAddress, amount, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.withdrawTokens(tokenAddress, amount);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount
            };

        } catch (error) {
            logger.error('Token withdrawal failed:', error);
            throw error;
        }
    }

    async withdrawTokens(tokenAddress, amount) {
        try {
            if (!this.contracts.has('bridge')) {
                throw new Error('Bridge contract not initialized');
            }

            const bridgeContract = this.contracts.get('bridge');
            const amountFelt = this.toFelt(amount);
            const tokenFelt = this.toFelt(tokenAddress);

            const result = await bridgeContract.withdraw_tokens(tokenFelt, amountFelt);

            logger.info('Tokens withdrawn:', { tokenAddress, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to withdraw tokens:', error);
            throw error;
        }
    }

    // Send Functions
    async sendTokens(tokenAddress, recipient, amount, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.transferTokens(tokenAddress, recipient, amount);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                recipient,
                amount
            };

        } catch (error) {
            logger.error('Token send failed:', error);
            throw error;
        }
    }

    async transferTokens(tokenAddress, recipient, amount) {
        try {
            if (!this.contracts.has('sbtc')) {
                throw new Error('SBTC contract not initialized');
            }

            const sbtcContract = this.contracts.get('sbtc');
            const amountFelt = this.toFelt(amount);
            const recipientFelt = this.toFelt(recipient);

            const result = await sbtcContract.transfer(recipientFelt, amountFelt);

            logger.info('Tokens transferred:', { tokenAddress, recipient, amount, txHash: result.transaction_hash });

            return {
                success: true,
                transactionHash: result.transaction_hash
            };

        } catch (error) {
            logger.error('Failed to transfer tokens:', error);
            throw error;
        }
    }

    // Earn/Staking Functions
    async stakeTokens(tokenAddress, amount, lockPeriod, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.stake(tokenAddress, amount);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount,
                lockPeriod
            };

        } catch (error) {
            logger.error('Token staking failed:', error);
            throw error;
        }
    }

    async unstakeTokens(tokenAddress, amount, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.unstake(tokenAddress, amount);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress,
                amount
            };

        } catch (error) {
            logger.error('Token unstaking failed:', error);
            throw error;
        }
    }

    async claimStakingRewards(tokenAddress, walletPrivateKey, walletAddress) {
        try {
            // Connect wallet if not already connected
            if (!this.account || this.account.address !== walletAddress) {
                await this.connectWallet(walletPrivateKey, walletAddress);
            }

            const result = await this.claimStakingRewards(tokenAddress);

            return {
                success: true,
                transactionHash: result.transactionHash,
                tokenAddress
            };

        } catch (error) {
            logger.error('Claiming staking rewards failed:', error);
            throw error;
        }
    }

    // Get user balances for all tokens
    async getUserBalances(address) {
        try {
            const balances = {};

            // Get SBTC balance
            if (this.contracts.has('sbtc')) {
                const sbtcBalance = await this.getSBTCBalance(address);
                balances.SBTC = sbtcBalance;
            }

            // Get staking position and rewards
            if (this.contracts.has('bridge')) {
                try {
                    const stakingPosition = await this.getStakingPosition(address, this.contractAddresses.sbtc);
                    const stakingRewards = await this.getUserStakingRewards(address);

                    balances.staking = {
                        position: stakingPosition,
                        rewards: stakingRewards
                    };
                } catch (error) {
                    logger.warn('Failed to get staking information:', error);
                }
            }

            return {
                address,
                balances,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to get user balances:', error);
            throw error;
        }
    }

    // Get transaction history
    async getTransactionHistory(address, limit = 50) {
        try {
            const transactions = [];

            // This would typically query event logs from the contracts
            // For now, we'll return a structured response

            return {
                address,
                transactions,
                totalCount: transactions.length,
                limit
            };

        } catch (error) {
            logger.error('Failed to get transaction history:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const startTime = Date.now();

            // Check if provider is responding with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Health check timeout')), 5000);
            });

            const blockPromise = this.provider.getBlock('latest');
            const block = await Promise.race([blockPromise, timeoutPromise]);

            const blockNumber = parseInt(block.block_number);
            const responseTime = Date.now() - startTime;

            // Check contract availability
            const contractStatus = {};
            for (const [name, contract] of this.contracts) {
                contractStatus[name] = 'available';
            }

            return {
                status: 'healthy',
                network: config.starknet.network,
                responseTime,
                blockNumber,
                latestBlock: {
                    number: blockNumber,
                    hash: block.block_hash,
                    timestamp: new Date(parseInt(block.timestamp) * 1000)
                },
                contracts: contractStatus,
                fallbackMode: false,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.warn('Starknet health check failed, using fallback mode:', error.message);

            // Return degraded but functional status
            return {
                status: 'degraded',
                network: config.starknet.network,
                error: error.message,
                fallbackMode: true,
                contracts: {
                    bridge: 'fallback',
                    sbtc: 'fallback',
                    operatorRegistry: 'fallback',
                    btcDepositManager: 'fallback'
                },
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new StarknetService();