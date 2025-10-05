/**
 * Contract Interaction Utilities for VernWallet Bridge
 * Provides direct contract interaction capabilities for frontend applications
 */

class ContractUtils {
    constructor(config = {}) {
        this.config = {
            starknetRpcUrl: config.starknetRpcUrl || 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
            contractAddresses: config.contractAddresses || {},
            ...config
        };

        this.provider = null;
        this.contracts = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Initialize Starknet provider
            const { Provider } = window.starknet || await import('starknet');
            this.provider = new Provider({
                rpc: {
                    nodeUrl: this.config.starknetRpcUrl
                }
            });

            // Initialize contract instances
            await this.initializeContracts();

            this.isInitialized = true;
            console.log('🔗 Contract utilities initialized successfully');

        } catch (error) {
            console.error('Failed to initialize contract utilities:', error);
            throw error;
        }
    }

    async initializeContracts() {
        try {
            // Contract ABIs (these would typically be loaded from files)
            const contractAbis = {
                bitcoinUtils: await this.loadContractABI('BitcoinUtils'),
                cryptoUtils: await this.loadContractABI('CryptoUtils'),
                spvVerifier: await this.loadContractABI('SPVVerifier'),
                bitcoinClient: await this.loadContractABI('BitcoinClient'),
                bitcoinHeaders: await this.loadContractABI('BitcoinHeaders'),
                btcDepositManager: await this.loadContractABI('BTCDepositManager'),
                btcPegOut: await this.loadContractABI('BTCPegOut'),
                escapeHatch: await this.loadContractABI('EscapeHatch'),
                operatorRegistry: await this.loadContractABI('OperatorRegistry'),
                sbtc: await this.loadContractABI('SBTC'),
                bridge: await this.loadContractABI('Bridge')
            };

            // Initialize contract instances
            for (const [name, abi] of Object.entries(contractAbis)) {
                const address = this.config.contractAddresses[name];
                if (address && abi) {
                    const { Contract } = window.starknet || await import('starknet');
                    this.contracts.set(name, new Contract(abi, address, this.provider));
                    console.log(`📄 ${name} contract initialized at: ${address}`);
                }
            }

        } catch (error) {
            console.error('Failed to initialize contracts:', error);
            throw error;
        }
    }

    async loadContractABI(contractName) {
        try {
            // In a real implementation, these would be loaded from ABI files
            // For now, we'll use the ABIs that are already available in the backend
            const response = await fetch(`/backend/src/contracts/${contractName}.json`);
            if (response.ok) {
                return await response.json();
            }

            // Fallback to mock ABI for development
            return this.getMockABI(contractName);

        } catch (error) {
            console.warn(`Failed to load ${contractName} ABI, using mock:`, error);
            return this.getMockABI(contractName);
        }
    }

    getMockABI(contractName) {
        // Return a basic mock ABI for development
        return [
            {
                type: "function",
                name: "get_admin",
                inputs: [],
                outputs: [{ type: "core::starknet::contract_address::ContractAddress" }],
                state_mutability: "view"
            },
            {
                type: "function",
                name: "set_admin",
                inputs: [{ name: "new_admin", type: "core::starknet::contract_address::ContractAddress" }],
                outputs: [],
                state_mutability: "external"
            }
        ];
    }

    // BitcoinUtils Contract Methods
    async validateBitcoinAddress(address) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const contract = this.contracts.get('bitcoinUtils');
            const addressFelt = this.addressToFelt(address);

            const result = await contract.validate_bitcoin_address(addressFelt);

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
            console.error('Bitcoin address validation failed:', error);
            throw error;
        }
    }

    async parseBitcoinTransaction(rawTxBytes) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const contract = this.contracts.get('bitcoinUtils');
            const txData = rawTxBytes.map(byte => this.toFelt(byte.toString()));

            const result = await contract.parse_transaction(txData);

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
            console.error('Bitcoin transaction parsing failed:', error);
            throw error;
        }
    }

    async computeBitcoinTxid(txData) {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const contract = this.contracts.get('bitcoinUtils');
            const txBytes = txData.map(byte => this.toFelt(byte.toString()));

            const result = await contract.compute_txid(txBytes);
            return this.feltToUint256(result);

        } catch (error) {
            console.error('Bitcoin txid computation failed:', error);
            throw error;
        }
    }

    async generateBitcoinDepositAddress(starknetRecipient, network = 'Mainnet') {
        try {
            if (!this.contracts.has('bitcoinUtils')) {
                throw new Error('BitcoinUtils contract not initialized');
            }

            const contract = this.contracts.get('bitcoinUtils');
            const recipientFelt = this.addressToFelt(starknetRecipient);
            const networkEnum = this.networkToEnum(network);

            const result = await contract.generate_deposit_address(recipientFelt, networkEnum);
            return this.feltToUint256(result);

        } catch (error) {
            console.error('Bitcoin deposit address generation failed:', error);
            throw error;
        }
    }

    // CryptoUtils Contract Methods
    async computeSha256(data) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const contract = this.contracts.get('cryptoUtils');
            const dataBytes = data.map(byte => this.toFelt(byte.toString()));

            const result = await contract.sha256(dataBytes);
            return this.feltToUint256(result);

        } catch (error) {
            console.error('SHA256 computation failed:', error);
            throw error;
        }
    }

    async computeMerkleRoot(txids) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const contract = this.contracts.get('cryptoUtils');
            const txidFelts = txids.map(txid => this.toFelt(txid));

            const result = await contract.compute_merkle_root(txidFelts);
            return this.feltToUint256(result);

        } catch (error) {
            console.error('Merkle root computation failed:', error);
            throw error;
        }
    }

    async verifyMerkleProof(txid, merkleRoot, merkleBranch, position) {
        try {
            if (!this.contracts.has('cryptoUtils')) {
                throw new Error('CryptoUtils contract not initialized');
            }

            const contract = this.contracts.get('cryptoUtils');
            const txidFelt = this.toFelt(txid);
            const merkleRootFelt = this.toFelt(merkleRoot);
            const branchFelts = merkleBranch.map(hash => this.toFelt(hash));
            const positionUint = this.toFelt(position.toString());

            const result = await contract.verify_merkle_proof(txidFelt, merkleRootFelt, branchFelts, positionUint);
            return result === '1';

        } catch (error) {
            console.error('Merkle proof verification failed:', error);
            throw error;
        }
    }

    // SPVVerifier Contract Methods
    async verifyTransactionInclusion(merkleProof, blockHeight) {
        try {
            if (!this.contracts.has('spvVerifier')) {
                throw new Error('SPVVerifier contract not initialized');
            }

            const contract = this.contracts.get('spvVerifier');
            const proofStruct = {
                merkle_root: this.toFelt(merkleProof.merkleRoot),
                tx_hash: this.toFelt(merkleProof.txHash),
                merkle_branch: merkleProof.merkleBranch.map(hash => this.toFelt(hash)),
                position: this.toFelt(merkleProof.position.toString())
            };
            const heightUint = this.toFelt(blockHeight.toString());

            const result = await contract.verify_transaction_inclusion(proofStruct, heightUint);
            return result === '1';

        } catch (error) {
            console.error('Transaction inclusion verification failed:', error);
            throw error;
        }
    }

    // BitcoinHeaders Contract Methods
    async submitBitcoinHeader(header) {
        try {
            if (!this.contracts.has('bitcoinHeaders')) {
                throw new Error('BitcoinHeaders contract not initialized');
            }

            const contract = this.contracts.get('bitcoinHeaders');
            const headerStruct = {
                hash: this.toFelt(header.hash),
                previous_block_hash: this.toFelt(header.previousBlockHash),
                merkle_root: this.toFelt(header.merkleRoot),
                timestamp: this.toFelt(header.timestamp.toString()),
                bits: this.toFelt(header.bits.toString()),
                nonce: this.toFelt(header.nonce.toString()),
                height: this.toFelt(header.height.toString())
            };

            const result = await contract.submit_header(headerStruct);
            return {
                success: true,
                transactionHash: result.transaction_hash,
                headerHash: this.feltToUint256(result.events?.find(e => e.event_name === 'HeaderSubmitted')?.data?.header_hash)
            };

        } catch (error) {
            console.error('Bitcoin header submission failed:', error);
            throw error;
        }
    }

    async getBitcoinHeader(height) {
        try {
            if (!this.contracts.has('bitcoinHeaders')) {
                throw new Error('BitcoinHeaders contract not initialized');
            }

            const contract = this.contracts.get('bitcoinHeaders');
            const heightUint = this.toFelt(height.toString());

            const result = await contract.get_header(heightUint);

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
            console.error('Bitcoin header retrieval failed:', error);
            throw error;
        }
    }

    // Utility Functions
    toFelt(value) {
        if (typeof value === 'string' && value.startsWith('0x')) {
            return value;
        }
        // Convert number or string to felt representation
        return '0x' + BigInt(value).toString(16);
    }

    feltToUint256(felt) {
        if (typeof felt === 'string') {
            return felt.replace('0x', '');
        }
        return felt.toString();
    }

    addressToFelt(address) {
        if (typeof address === 'string' && address.startsWith('0x')) {
            return address;
        }
        return this.toFelt(address);
    }

    feltToEnum(felt) {
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

    // Contract State Queries
    async getContractAdmin(contractName) {
        try {
            if (!this.contracts.has(contractName)) {
                throw new Error(`${contractName} contract not initialized`);
            }

            const contract = this.contracts.get(contractName);
            const result = await contract.get_admin();

            return this.feltToUint256(result);

        } catch (error) {
            console.error(`Failed to get ${contractName} admin:`, error);
            throw error;
        }
    }

    // Batch Contract Operations
    async batchContractCalls(calls) {
        try {
            if (!this.provider) {
                throw new Error('Provider not initialized');
            }

            const { CallData } = window.starknet || await import('starknet');
            const callData = new CallData([]);

            // Prepare multicall data
            const multicallData = calls.map(call => ({
                contractAddress: call.contractAddress,
                entrypoint: call.method,
                calldata: callData.compile(call.method, call.params || [])
            }));

            // Execute batch call
            const results = await this.provider.callContract({
                contractAddress: this.config.contractAddresses.bridge || this.config.contractAddresses.sbtc,
                entrypoint: 'batch_call',
                calldata: callData.compile('batch_call', [multicallData])
            });

            return results;

        } catch (error) {
            console.error('Batch contract calls failed:', error);
            throw error;
        }
    }

    // Event Monitoring
    async monitorContractEvents(contractName, eventName, callback) {
        try {
            if (!this.contracts.has(contractName)) {
                throw new Error(`${contractName} contract not initialized`);
            }

            const contract = this.contracts.get(contractName);

            // Set up event polling
            const pollInterval = setInterval(async () => {
                try {
                    // This would typically use Starknet event filters
                    // For now, we'll simulate event monitoring
                    if (callback && typeof callback === 'function') {
                        callback({
                            contract: contractName,
                            event: eventName,
                            timestamp: Date.now()
                        });
                    }
                } catch (error) {
                    console.error('Event monitoring error:', error);
                }
            }, 5000);

            return pollInterval;

        } catch (error) {
            console.error('Contract event monitoring setup failed:', error);
            throw error;
        }
    }

    // Contract Interaction Helpers
    async estimateGas(contractName, method, params = []) {
        try {
            if (!this.contracts.has(contractName)) {
                throw new Error(`${contractName} contract not initialized`);
            }

            const contract = this.contracts.get(contractName);

            // Estimate gas for the transaction
            const gasEstimate = await this.provider.estimateFee({
                contractAddress: this.config.contractAddresses[contractName],
                entrypoint: method,
                calldata: params
            });

            return gasEstimate;

        } catch (error) {
            console.error(`Gas estimation failed for ${contractName}.${method}:`, error);
            throw error;
        }
    }

    // Health Check
    async healthCheck() {
        try {
            const checks = [];

            // Check provider connectivity
            try {
                await this.provider.getBlock('latest');
                checks.push({ service: 'starknet_provider', status: 'healthy' });
            } catch (error) {
                checks.push({ service: 'starknet_provider', status: 'unhealthy', error: error.message });
            }

            // Check contract availability
            for (const [name, contract] of this.contracts) {
                try {
                    await contract.get_admin();
                    checks.push({ service: `contract_${name}`, status: 'healthy' });
                } catch (error) {
                    checks.push({ service: `contract_${name}`, status: 'unhealthy', error: error.message });
                }
            }

            const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

            return {
                status: overallStatus,
                checks,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Contract utilities health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create global instance
window.contractUtils = new ContractUtils({
    contractAddresses: {
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
    }
});

// Auto-initialize if Starknet is available
if (typeof window !== 'undefined' && (window.starknet || document.readyState === 'complete')) {
    window.contractUtils.initialize().catch(console.error);
} else if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        window.contractUtils.initialize().catch(console.error);
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContractUtils;
}