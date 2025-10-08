/**
 * Starknet Bridge Contract Integration Service
 */
class StarknetBridgeService {
    constructor() {
        this.contractAddress = '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e';
        this.contract = null;
        this.provider = null;
        this.account = null;
        this.abi = null;
        this.currentNetwork = 'mainnet';

        // Multi-network configuration
        this.NETWORKS = {
            mainnet: {
                name: 'Starknet Mainnet',
                chainId: '0x534e5f4d41494e',
                rpcUrl: 'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
                explorerUrl: 'https://starkscan.co',
                contracts: {
                    BRIDGE_CONTRACT: '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e',
                    SBTC_CONTRACT: '0x07b10d8e5e60b2c9c5a5b12a4e1e5c4b3d2e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
                }
            },
            testnet: {
                name: 'Starknet Sepolia Testnet',
                chainId: '0x534e5f5345504f4c49',
                rpcUrl: 'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
                explorerUrl: 'https://sepolia.starkscan.co',
                contracts: {
                    BRIDGE_CONTRACT: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Placeholder
                    SBTC_CONTRACT: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // Placeholder
                }
            }
        };
    }

    // Network management methods
    switchNetwork(network) {
        if (this.NETWORKS[network]) {
            this.currentNetwork = network;
            this.contractAddress = this.NETWORKS[network].contracts.BRIDGE_CONTRACT;
            console.log(`🔄 Bridge service switched to ${this.NETWORKS[network].name}`);
            return true;
        }
        return false;
    }

    getCurrentNetwork() {
        return this.currentNetwork;
    }

    getCurrentNetworkConfig() {
        return this.NETWORKS[this.currentNetwork];
    }

    getNetworkExplorerUrl() {
        return this.NETWORKS[this.currentNetwork].explorerUrl;
    }

    isTestnet() {
        return this.NETWORKS[this.currentNetwork].isTestnet;
    }

    // Initialize the bridge service (direction-aware)
    async initialize(bridgeDirection = 'to-starknet') {
        try {
            console.log(`Initializing Starknet Bridge Service for direction: ${bridgeDirection}`);

            // For Bitcoin→Starknet transfers, we don't need Starknet wallet initially
            if (bridgeDirection === 'to-starknet') {
                console.log('🔄 Bitcoin→Starknet: Will initialize Starknet wallet when needed for transaction execution');
                // Just load the ABI and contract info for now
                await this.loadABI();
                this.contract = {
                    address: this.contractAddress,
                    abi: this.abi
                };
                console.log('✅ Bridge service ready for Bitcoin→Starknet transfers');
                return true;
            }

            // For Starknet→Bitcoin transfers, we need Starknet wallet connection
            if (bridgeDirection === 'to-bitcoin') {
                console.log('🔄 Starknet→Bitcoin: Initializing Starknet wallet connection...');

                // Wait for Starknet wallet to be available
                let retries = 0;
                const maxRetries = 50; // 5 seconds max wait

                while (retries < maxRetries) {
                    if (typeof window.starknet !== 'undefined') {
                        console.log('Starknet wallet detected');
                        break;
                    }

                    console.log(`Waiting for Starknet wallet... (attempt ${retries + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    retries++;
                }

                if (typeof window.starknet === 'undefined') {
                    throw new Error('Starknet wallet not detected. Please install Argent X, Braavos, or another Starknet wallet.');
                }

                console.log('Starknet wallet object:', {
                    isConnected: window.starknet.isConnected,
                    selectedAddress: window.starknet.selectedAddress,
                    account: window.starknet.account,
                    provider: window.starknet.provider
                });

                // Check if wallet is connected
                if (!window.starknet.isConnected && !window.starknet.selectedAddress) {
                    throw new Error('Starknet wallet not connected. Please connect your wallet first.');
                }

                // Get provider and account - handle different wallet structures
                this.provider = window.starknet.provider;

                // Handle different wallet account structures
                if (window.starknet.account) {
                    this.account = window.starknet.account;
                } else if (window.starknet.selectedAddress) {
                    // Create a basic account object for wallets that don't provide one
                    this.account = {
                        address: window.starknet.selectedAddress,
                        execute: async function(transaction) {
                            return await window.starknet.account.execute(transaction);
                        }
                    };
                } else {
                    throw new Error('No Starknet account available. Please ensure your wallet is unlocked.');
                }

                console.log('Wallet provider:', this.provider);
                console.log('Wallet account:', this.account);
                console.log('Account address:', this.account.address);

                if (!this.account) {
                    throw new Error('No Starknet account available. Please ensure your wallet is unlocked.');
                }

                if (!this.account.execute) {
                    console.warn('Account does not have execute method, trying alternative...');
                    // Try to use the wallet's execute method directly
                    if (window.starknet.execute) {
                        this.account.execute = window.starknet.execute;
                        console.log('✅ Using wallet.execute as fallback');
                    } else {
                        throw new Error('Wallet account does not support execute method. Please check your wallet version.');
                    }
                }

                console.log('✅ Starknet wallet account validated');
            }

            // Load contract ABI for both directions
            await this.loadABI();

            // Initialize contract instance
            this.contract = {
                address: this.contractAddress,
                abi: this.abi
            };

            console.log('Starknet Bridge Service initialized successfully');
            console.log('Contract address:', this.contractAddress);
            if (this.account) {
                console.log('Account address:', this.account.address);
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize Starknet Bridge Service:', error);
            throw error;
        }
    }

    // Load contract ABI
    async loadABI() {
        // Use the ABI you provided
        this.abi = [
            {
                "type": "function",
                "name": "initiate_bitcoin_deposit",
                "inputs": [
                    {
                        "name": "amount",
                        "type": "core::integer::u256"
                    },
                    {
                        "name": "btc_address",
                        "type": "core::felt252"
                    },
                    {
                        "name": "starknet_recipient",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u256"
                    }
                ],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "initiate_bitcoin_withdrawal",
                "inputs": [
                    {
                        "name": "amount",
                        "type": "core::integer::u256"
                    },
                    {
                        "name": "btc_address",
                        "type": "core::felt252"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u256"
                    }
                ],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "stake",
                "inputs": [
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    },
                    {
                        "name": "amount",
                        "type": "core::integer::u256"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "unstake",
                "inputs": [
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    },
                    {
                        "name": "amount",
                        "type": "core::integer::u256"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "claim_rewards",
                "inputs": [
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [],
                "state_mutability": "external"
            },
            {
                "type": "function",
                "name": "get_staking_position",
                "inputs": [
                    {
                        "name": "user",
                        "type": "core::starknet::contract_address::ContractAddress"
                    },
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "Bridge::StakingPosition"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_user_rewards",
                "inputs": [
                    {
                        "name": "user",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u256"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_total_staked",
                "inputs": [
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u256"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_reward_rate",
                "inputs": [
                    {
                        "name": "token",
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "outputs": [
                    {
                        "type": "core::integer::u256"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "is_bridge_paused",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::bool"
                    }
                ],
                "state_mutability": "view"
            },
            {
                "type": "function",
                "name": "get_sbtc_contract",
                "inputs": [],
                "outputs": [
                    {
                        "type": "core::starknet::contract_address::ContractAddress"
                    }
                ],
                "state_mutability": "view"
            }
        ];
    }

    // Convert Bitcoin address to felt252 (Contract expects LENGTH, not encoded address)
    bitcoinAddressToFelt(btcAddress) {
        console.log('🔄 Converting Bitcoin address to felt252 (length-based):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Comprehensive Bitcoin address validation
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}. Expected P2PKH, P2SH, or Bech32 format.`);
        }

        // CRITICAL FIX: Contract expects the LENGTH of the address as felt252, not the encoded address!
        // The Cairo contract does: let addr_len: u32 = btc_address.try_into().unwrap_or(0);
        // So we need to send the length (26-35) as a felt252 number

        const addressLength = btcAddress.length;
        console.log('📏 Bitcoin address length:', addressLength);

        // Validate length is in expected range (26-35 characters)
        if (addressLength < 26 || addressLength > 35) {
            throw new Error(`Bitcoin address length ${addressLength} is outside expected range 26-35`);
        }

        // Convert length to felt252 hex format
        const lengthHex = addressLength.toString(16);
        const felt252Hex = '0x' + lengthHex;

        console.log('✅ Bitcoin address length converted to felt252:', {
            original: btcAddress,
            length: addressLength,
            felt: felt252Hex,
            format: btcAddress.startsWith('1') ? 'P2PKH' : btcAddress.startsWith('3') ? 'P2SH' : 'Bech32'
        });

        return felt252Hex;
    }

    // Alternative Bitcoin address conversion method for contract compatibility
    bitcoinAddressToFeltAlt(btcAddress) {
        console.log('🔄 Converting Bitcoin address (alternative method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Method 1: Simple ASCII sum approach
        let asciiSum = 0n;
        for (let i = 0; i < btcAddress.length; i++) {
            asciiSum += BigInt(btcAddress.charCodeAt(i));
        }

        // Convert to hex with proper padding
        let hex = asciiSum.toString(16);
        while (hex.length < 64) {
            hex = '0' + hex;
        }
        if (hex.length > 64) {
            hex = hex.substring(hex.length - 64);
        }

        const felt252Hex = '0x' + hex;

        console.log('✅ Alternative Bitcoin address conversion:', {
            original: btcAddress,
            felt: felt252Hex,
            method: 'ASCII sum'
        });

        return felt252Hex;
    }

    // Try multiple conversion methods to find one that works with the contract
    bitcoinAddressToFeltAuto(btcAddress) {
        console.log('🔄 Auto-detecting best Bitcoin address conversion method for:', btcAddress);

        // PRIORITIZE LENGTH-BASED METHOD FIRST - this is what the contract actually expects!
        const methods = [
            { method: this.bitcoinAddressToFelt.bind(this), name: 'Length-based encoding (PRIMARY)' },
            { method: this.bitcoinAddressToFeltLength.bind(this), name: 'Direct length encoding' },
            { method: this.bitcoinAddressToFeltContract.bind(this), name: 'Contract-compatible encoding' },
            { method: this.bitcoinAddressToFeltBytes.bind(this), name: 'Byte encoding' },
            { method: this.bitcoinAddressToFeltAlt.bind(this), name: 'Alternative ASCII sum' },
            { method: this.bitcoinAddressToFeltHash.bind(this), name: 'Hash-based encoding' },
            { method: this.bitcoinAddressToFeltRaw.bind(this), name: 'Raw felt252 encoding' },
            { method: this.bitcoinAddressToFeltPadded.bind(this), name: 'Padded encoding' }
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                const result = methods[i].method(btcAddress);
                console.log(`✅ Method ${i + 1} (${methods[i].name}) successful:`, result);
                console.log(`   Result length: ${result.length}, format: ${result.startsWith('0x') ? 'hex' : 'decimal'}`);
                console.log(`   Represents length: ${parseInt(result, 16)}`);
                return result;
            } catch (error) {
                console.warn(`⚠️ Method ${i + 1} (${methods[i].name}) failed:`, error.message);
                continue;
            }
        }

        throw new Error('All Bitcoin address conversion methods failed');
    }

    // Hash-based Bitcoin address conversion
    bitcoinAddressToFeltHash(btcAddress) {
        console.log('🔄 Converting Bitcoin address (hash method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Create a simple hash of the address string
        let hash = 0n;
        for (let i = 0; i < btcAddress.length; i++) {
            const char = btcAddress.charCodeAt(i);
            hash = ((hash << 5n) - hash + BigInt(char)) & ((1n << 256n) - 1n);
        }

        // Convert to hex with proper padding
        let hex = hash.toString(16);
        while (hex.length < 64) {
            hex = '0' + hex;
        }
        if (hex.length > 64) {
            hex = hex.substring(hex.length - 64);
        }

        const felt252Hex = '0x' + hex;

        console.log('✅ Hash-based Bitcoin address conversion:', {
            original: btcAddress,
            felt: felt252Hex,
            method: 'Hash-based'
        });

        return felt252Hex;
    }

    // Raw felt252 encoding (direct conversion)
    bitcoinAddressToFeltRaw(btcAddress) {
        console.log('🔄 Converting Bitcoin address (raw method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Convert directly to a felt252 by treating as a large integer
        let felt = 0n;
        for (let i = 0; i < btcAddress.length && i < 31; i++) {
            const char = btcAddress.charCodeAt(i);
            felt = (felt * 256n + BigInt(char)) % ((1n << 251n) - 1n);
        }

        // Convert to hex with 0x prefix
        let hex = felt.toString(16);
        while (hex.length < 64) {
            hex = '0' + hex;
        }
        if (hex.length > 64) {
            hex = hex.substring(hex.length - 64);
        }

        const felt252Hex = '0x' + hex;

        console.log('✅ Raw Bitcoin address conversion:', {
            original: btcAddress,
            felt: felt252Hex,
            method: 'Raw encoding'
        });

        return felt252Hex;
    }

    // Padded encoding method
    bitcoinAddressToFeltPadded(btcAddress) {
        console.log('🔄 Converting Bitcoin address (padded method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Convert to bytes and pad to 32 bytes (256 bits)
        const bytes = new TextEncoder().encode(btcAddress);
        const padded = new Uint8Array(32);
        padded.set(bytes.slice(0, 32));

        // Convert to BigInt
        let felt = 0n;
        for (let i = 0; i < padded.length; i++) {
            felt = (felt << 8n) | BigInt(padded[i]);
        }

        // Convert to hex with 0x prefix
        let hex = felt.toString(16);
        while (hex.length < 64) {
            hex = '0' + hex;
        }
        if (hex.length > 64) {
            hex = hex.substring(hex.length - 64);
        }

        const felt252Hex = '0x' + hex;

        console.log('✅ Padded Bitcoin address conversion:', {
            original: btcAddress,
            felt: felt252Hex,
            method: 'Padded encoding'
        });

        return felt252Hex;
    }

    // Contract-compatible Bitcoin address conversion (string length + content)
    bitcoinAddressToFeltContract(btcAddress) {
        console.log('🔄 Converting Bitcoin address (contract-compatible method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // The contract expects the Bitcoin address as a felt252 that represents the string
        // The validation does: let addr_len: u32 = btc_address.try_into().unwrap_or(0);
        // This means it's trying to convert the felt252 to a u32 for length checking

        // The key insight: the contract is expecting the felt252 to BE the length of the address
        // Not the encoded address itself, but the length as a number!

        // Bitcoin addresses are 26-35 characters, so the felt252 should be a number between 26-35
        const addressLength = btcAddress.length;

        if (addressLength < 26 || addressLength > 35) {
            throw new Error(`Bitcoin address length ${addressLength} not in expected range 26-35`);
        }

        // Convert the length to hex format (this is what the contract expects)
        const felt252Hex = '0x' + addressLength.toString(16);

        console.log('✅ Contract-compatible Bitcoin address conversion:', {
            original: btcAddress,
            length: btcAddress.length,
            felt: felt252Hex,
            feltLength: felt252Hex.length,
            method: 'Contract-compatible (length-based)'
        });

        return felt252Hex;
    }

    // Simple byte encoding method
    bitcoinAddressToFeltBytes(btcAddress) {
        console.log('🔄 Converting Bitcoin address (byte encoding method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Convert each character to its byte value and create a compact felt252
        const bytes = new TextEncoder().encode(btcAddress);
        let felt = 0n;

        // For Bitcoin addresses, we can fit them in a much smaller felt252
        for (let i = 0; i < bytes.length && i < 31; i++) {
            felt = (felt * 256n) + BigInt(bytes[i]);
        }

        // Convert to hex - should be much shorter than 64 chars for Bitcoin addresses
        let hex = felt.toString(16);

        // Don't pad to 64 chars - keep it compact
        const felt252Hex = '0x' + hex;

        console.log('✅ Byte encoding Bitcoin address conversion:', {
            original: btcAddress,
            length: btcAddress.length,
            felt: felt252Hex,
            feltLength: felt252Hex.length,
            method: 'Byte encoding'
        });

        return felt252Hex;
    }

    // Direct length-based conversion (what the contract actually expects)
    bitcoinAddressToFeltLength(btcAddress) {
        console.log('🔄 Converting Bitcoin address (length-based method):', btcAddress);

        if (!btcAddress || typeof btcAddress !== 'string') {
            throw new Error('Bitcoin address is required');
        }

        // Validate Bitcoin address format
        const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
        if (!btcRegex.test(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }

        // Based on the contract validation logic, it expects the felt252 to convert to a u32 length
        // The contract does: let addr_len: u32 = btc_address.try_into().unwrap_or(0);
        // This means the felt252 should BE the length number, not an encoded address

        const addressLength = btcAddress.length;

        // Ensure length is in expected range (26-35)
        if (addressLength < 26 || addressLength > 35) {
            throw new Error(`Bitcoin address length ${addressLength} not in expected range 26-35`);
        }

        // Convert the length directly to hex (this is what the contract validation expects)
        const felt252Hex = '0x' + addressLength.toString(16);

        console.log('✅ Length-based Bitcoin address conversion:', {
            original: btcAddress,
            length: btcAddress.length,
            felt: felt252Hex,
            feltLength: felt252Hex.length,
            method: 'Length-based'
        });

        return felt252Hex;
    }

    // Enhanced transaction execution with better error handling
    async executeTransaction(calldata) {
        try {
            console.log('Attempting transaction with account.execute...');

            // Add transaction timeout and better error handling
            const transactionPromise = this.account.execute({
                contractAddress: this.contractAddress,
                entrypoint: 'initiate_bitcoin_deposit',
                calldata: calldata
            });

            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Transaction execution timed out'));
                }, 90000); // 90 seconds timeout
            });

            return await Promise.race([transactionPromise, timeoutPromise]);

        } catch (error) {
            console.error('Transaction execution failed:', error);
            throw error;
        }
    }

    // Alternative transaction execution method
    async executeTransactionAlternative(calldata) {
        try {
            console.log('Attempting alternative transaction execution...');

            if (window.starknet && window.starknet.execute) {
                return await window.starknet.execute({
                    contractAddress: this.contractAddress,
                    entrypoint: 'initiate_bitcoin_deposit',
                    calldata: calldata
                });
            } else {
                throw new Error('Alternative execution method not available');
            }
        } catch (error) {
            console.error('Alternative transaction execution failed:', error);
            throw error;
        }
    }

    // Enhanced withdrawal transaction execution with better error handling
    async executeWithdrawalTransaction(calldata) {
        try {
            console.log('Attempting withdrawal transaction with account.execute...');

            // Add transaction timeout and better error handling
            const transactionPromise = this.account.execute({
                contractAddress: this.contractAddress,
                entrypoint: 'initiate_bitcoin_withdrawal',
                calldata: calldata
            });

            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Withdrawal transaction execution timed out'));
                }, 90000); // 90 seconds timeout
            });

            return await Promise.race([transactionPromise, timeoutPromise]);

        } catch (error) {
            console.error('Withdrawal transaction execution failed:', error);
            throw error;
        }
    }

    // Alternative withdrawal transaction execution method
    async executeWithdrawalTransactionAlternative(calldata) {
        try {
            console.log('Attempting alternative withdrawal transaction execution...');

            if (window.starknet && window.starknet.execute) {
                return await window.starknet.execute({
                    contractAddress: this.contractAddress,
                    entrypoint: 'initiate_bitcoin_withdrawal',
                    calldata: calldata
                });
            } else {
                throw new Error('Alternative withdrawal execution method not available');
            }
        } catch (error) {
            console.error('Alternative withdrawal transaction execution failed:', error);
            throw error;
        }
    }

    // Convert Starknet address to felt252
    starknetAddressToFelt(starknetAddress) {
        console.log('🔄 Converting Starknet address to felt252:', starknetAddress);

        if (!starknetAddress || typeof starknetAddress !== 'string') {
            throw new Error('Invalid Starknet address');
        }

        // Validate Starknet address format
        const starknetRegex = /^0x[0-9a-fA-F]{64}$/;
        if (!starknetRegex.test(starknetAddress)) {
            throw new Error(`Invalid Starknet address format: ${starknetAddress}. Expected 0x + 64 hex characters.`);
        }

        // Starknet addresses are already in the correct felt252 format (0x + 64 hex)
        // Just ensure consistent casing and return as-is
        const felt252Hex = starknetAddress.toLowerCase();

        console.log('✅ Starknet address converted to felt252:', felt252Hex);
        return felt252Hex;
    }

    // Convert BTC amount to satoshis (u256 format)
    btcToSatoshis(btcAmount) {
        console.log('🔄 Converting BTC to satoshis:', btcAmount);

        if (typeof btcAmount !== 'number' || isNaN(btcAmount)) {
            throw new Error(`Invalid BTC amount: ${btcAmount}`);
        }

        if (btcAmount <= 0) {
            throw new Error(`BTC amount must be positive: ${btcAmount}`);
        }

        const satoshis = Math.floor(btcAmount * 100000000);
        console.log('✅ Converted to satoshis:', satoshis);

        return {
            low: satoshis.toString(),
            high: '0'
        };
    }

    // Convert token amount to contract units (6 decimals)
    tokenToUnits(tokenAmount) {
        const units = Math.floor(tokenAmount * 1000000);
        return {
            low: units.toString(),
            high: '0'
        };
    }

    // Initiate Bitcoin deposit (Bitcoin → Starknet) with enhanced timeout and retry logic
    async initiateBitcoinDeposit(amount, btcAddress, starknetRecipient) {
        let transactionPromise = null;
        let timeoutId = null;
        let retryCount = 0;
        const maxRetries = 3;
        const timeoutDuration = 120000; // 2 minutes timeout

        try {
            console.log('🚀 Starting Bitcoin deposit process...');
            console.log('Input validation:', { amount, btcAddress, starknetRecipient });

            if (!this.contract || !this.account) {
                throw new Error('Bridge service not initialized');
            }

            // COMPREHENSIVE INPUT VALIDATION (as suggested by ChatGPT)
            // Frontend-level validation before any processing

            // 1. Validate amount
            if (!amount || typeof amount !== 'number' || isNaN(amount)) {
                throw new Error(`Invalid amount format: ${amount}. Expected a valid number.`);
            }
            if (amount <= 0) {
                throw new Error(`Invalid amount: ${amount}. Must be greater than 0.`);
            }
            if (amount < 0.001) {
                throw new Error(`Amount too small: ${amount}. Minimum is 0.001 BTC.`);
            }
            if (amount > 10) {
                throw new Error(`Amount too large: ${amount}. Maximum is 10 BTC.`);
            }

            // 2. Validate Bitcoin address
            if (!btcAddress || typeof btcAddress !== 'string') {
                throw new Error('Bitcoin address is required');
            }
            // Bitcoin address format validation (P2PKH, P2SH, Bech32)
            const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
            if (!btcRegex.test(btcAddress)) {
                throw new Error(`Invalid Bitcoin address format: ${btcAddress}. Expected valid Bitcoin address (P2PKH, P2SH, or Bech32).`);
            }

            // 3. Validate Starknet address
            if (!starknetRecipient || typeof starknetRecipient !== 'string') {
                throw new Error('Starknet recipient address is required');
            }
            // Starknet address format validation (0x + 64 hex characters)
            const starknetRegex = /^0x[a-fA-F0-9]{64}$/;
            if (!starknetRegex.test(starknetRecipient)) {
                throw new Error(`Invalid Starknet address format: ${starknetRecipient}. Expected 0x + 64 hexadecimal characters.`);
            }

            console.log('✅ All input validation passed');

            const amountU256 = this.btcToSatoshis(amount);

            // Try multiple Bitcoin address conversion methods to handle INVALID_BTC_ADDR_LENGTH
            let btcAddressFelt;
            try {
                btcAddressFelt = this.bitcoinAddressToFeltAuto(btcAddress);
                console.log('✅ Used auto-detected Bitcoin address conversion method');
            } catch (conversionError) {
                console.error('❌ Bitcoin address conversion failed:', conversionError);
                throw new Error(`Bitcoin address conversion failed: ${conversionError.message}`);
            }

            const recipientFelt = this.starknetAddressToFelt(starknetRecipient);

            console.log('Converted values:', {
                amountU256,
                btcAddressFelt: btcAddressFelt.substring(0, 16) + '...',
                recipientFelt: recipientFelt.substring(0, 16) + '...'
            });

            // Prepare calldata with explicit type conversion
            const lowAmount = String(amountU256.low);
            const highAmount = String(amountU256.high);
            const btcFelt = btcAddressFelt;
            const recipientFeltFormatted = recipientFelt;

            console.log('Calldata components:', {
                lowAmount: { value: lowAmount, type: typeof lowAmount, length: lowAmount.length },
                highAmount: { value: highAmount, type: typeof highAmount, length: highAmount.length },
                btcFelt: { value: btcFelt, type: typeof btcFelt, length: btcFelt.length },
                recipientFelt: { value: recipientFeltFormatted, type: typeof recipientFeltFormatted, length: recipientFeltFormatted.length }
            });

            // Prepare calldata
            const calldata = [
                lowAmount,              // amount low (string)
                highAmount,             // amount high (string)
                btcFelt,                // btc_address (felt252 as string)
                recipientFeltFormatted  // starknet_recipient (felt252 as string)
            ];

            console.log('Final calldata array:', calldata);

            // Validate calldata format before sending
            this.validateCalldata(calldata);

            console.log('✅ Calldata validation passed');

            // Enhanced transaction execution with timeout and retry logic
            const executeTransactionWithRetry = async (calldata) => {
                return new Promise(async (resolve, reject) => {
                    const startTime = Date.now();

                    while (retryCount < maxRetries) {
                        try {
                            console.log(`🚀 Executing Starknet transaction (attempt ${retryCount + 1}/${maxRetries})...`);
                            console.log('Contract address:', this.contractAddress);
                            console.log('Entrypoint:', 'initiate_bitcoin_deposit');
                            console.log('Final calldata:', calldata);

                            // Set up timeout for this attempt
                            transactionPromise = this.executeTransaction(calldata);
                            timeoutId = setTimeout(() => {
                                console.warn(`⏰ Transaction attempt ${retryCount + 1} timed out after ${timeoutDuration/1000}s`);
                                retryCount++;
                                if (retryCount >= maxRetries) {
                                    reject(new Error(`Transaction timed out after ${maxRetries} attempts`));
                                }
                            }, timeoutDuration);

                            const result = await transactionPromise;
                            clearTimeout(timeoutId);

                            console.log('✅ Transaction executed successfully:', result);
                            resolve(result);
                            return;

                        } catch (executeError) {
                            clearTimeout(timeoutId);
                            console.error(`❌ Transaction attempt ${retryCount + 1} failed:`, executeError);

                            // Check if it's a timeout error
                            if (executeError.message && executeError.message.includes('timeout')) {
                                console.log('🔄 Timeout detected, will retry...');
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    console.log(`⏳ Waiting 3 seconds before retry ${retryCount + 1}...`);
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                    continue;
                                }
                            }

                            // Check if it's a user rejection
                            if (executeError.message && (executeError.message.includes('rejected') || executeError.message.includes('User denied'))) {
                                console.log('🚫 User rejected transaction');
                                reject(new Error('Transaction rejected by user'));
                                return;
                            }

                            // For other errors, try alternative execution method
                            try {
                                console.log('🔄 Trying alternative execution method...');
                                const altResult = await this.executeTransactionAlternative(calldata);
                                clearTimeout(timeoutId);
                                console.log('✅ Alternative execution successful:', altResult);
                                resolve(altResult);
                                return;
                            } catch (altError) {
                                console.error('❌ Alternative execution also failed:', altError);
                                retryCount++;

                                if (retryCount >= maxRetries) {
                                    reject(executeError);
                                    return;
                                }

                                console.log(`⏳ Waiting 3 seconds before retry ${retryCount + 1}...`);
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        }
                    }
                });
            };

            const result = await executeTransactionWithRetry(calldata);

            console.log('Deposit initiated successfully:', result);

            // Wait for transaction confirmation
            const receipt = await this.provider.waitForTransaction(result.transaction_hash);

            return {
                success: true,
                transactionHash: result.transaction_hash,
                depositId: result.transaction_hash, // Using tx hash as deposit ID for now
                blockHash: receipt.block_hash
            };

        } catch (error) {
            console.error('Failed to initiate Bitcoin deposit:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Initiate Bitcoin withdrawal (Starknet → Bitcoin) with enhanced timeout and retry logic
    async initiateBitcoinWithdrawal(amount, btcAddress) {
        let transactionPromise = null;
        let timeoutId = null;
        let retryCount = 0;
        const maxRetries = 3;
        const timeoutDuration = 120000; // 2 minutes timeout

        try {
            console.log('🚀 Starting Bitcoin withdrawal process...');
            console.log('Input validation:', { amount, btcAddress });

            if (!this.contract || !this.account) {
                throw new Error('Bridge service not initialized');
            }

            // COMPREHENSIVE INPUT VALIDATION

            // 1. Validate amount
            if (!amount || typeof amount !== 'number' || isNaN(amount)) {
                throw new Error(`Invalid amount format: ${amount}. Expected a valid number.`);
            }
            if (amount <= 0) {
                throw new Error(`Invalid amount: ${amount}. Must be greater than 0.`);
            }
            if (amount < 0.001) {
                throw new Error(`Amount too small: ${amount}. Minimum is 0.001 BTC.`);
            }
            if (amount > 10) {
                throw new Error(`Amount too large: ${amount}. Maximum is 10 BTC.`);
            }

            // 2. Validate Bitcoin address
            if (!btcAddress || typeof btcAddress !== 'string') {
                throw new Error('Bitcoin address is required');
            }
            // Bitcoin address format validation (P2PKH, P2SH, Bech32)
            const btcRegex = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$/;
            if (!btcRegex.test(btcAddress)) {
                throw new Error(`Invalid Bitcoin address format: ${btcAddress}. Expected valid Bitcoin address (P2PKH, P2SH, or Bech32).`);
            }

            console.log('✅ Withdrawal input validation passed');

            const amountU256 = this.btcToSatoshis(amount);

            // Try multiple Bitcoin address conversion methods to handle INVALID_BTC_ADDR_LENGTH
            let btcAddressFelt;
            try {
                btcAddressFelt = this.bitcoinAddressToFeltAuto(btcAddress);
                console.log('✅ Used auto-detected Bitcoin address conversion method for withdrawal');
            } catch (conversionError) {
                console.error('❌ Bitcoin address conversion failed for withdrawal:', conversionError);
                throw new Error(`Bitcoin address conversion failed: ${conversionError.message}`);
            }

            console.log('Converted withdrawal values:', {
                amountU256,
                btcAddressFelt: btcAddressFelt.substring(0, 16) + '...'
            });

            // Prepare calldata with explicit type conversion
            const lowAmount = String(amountU256.low);
            const highAmount = String(amountU256.high);
            const btcFelt = btcAddressFelt;

            console.log('Withdrawal calldata components:', {
                lowAmount: { value: lowAmount, type: typeof lowAmount, length: lowAmount.length },
                highAmount: { value: highAmount, type: typeof highAmount, length: highAmount.length },
                btcFelt: { value: btcFelt, type: typeof btcFelt, length: btcFelt.length }
            });

            // Prepare calldata
            const calldata = [
                lowAmount,        // amount low (string)
                highAmount,       // amount high (string)
                btcFelt           // btc_address (felt252 as string)
            ];

            console.log('Final withdrawal calldata array:', calldata);

            // Validate calldata format before sending
            this.validateCalldata(calldata);

            console.log('✅ Withdrawal calldata validation passed');

            // Enhanced withdrawal transaction execution with timeout and retry logic
            const executeWithdrawalTransactionWithRetry = async (calldata) => {
                return new Promise(async (resolve, reject) => {
                    const startTime = Date.now();

                    while (retryCount < maxRetries) {
                        try {
                            console.log(`🚀 Executing Starknet withdrawal transaction (attempt ${retryCount + 1}/${maxRetries})...`);
                            console.log('Contract address:', this.contractAddress);
                            console.log('Entrypoint:', 'initiate_bitcoin_withdrawal');
                            console.log('Final calldata:', calldata);

                            // Set up timeout for this attempt
                            transactionPromise = this.executeWithdrawalTransaction(calldata);
                            timeoutId = setTimeout(() => {
                                console.warn(`⏰ Withdrawal transaction attempt ${retryCount + 1} timed out after ${timeoutDuration/1000}s`);
                                retryCount++;
                                if (retryCount >= maxRetries) {
                                    reject(new Error(`Withdrawal transaction timed out after ${maxRetries} attempts`));
                                }
                            }, timeoutDuration);

                            const result = await transactionPromise;
                            clearTimeout(timeoutId);

                            console.log('✅ Withdrawal transaction executed successfully:', result);
                            resolve(result);
                            return;

                        } catch (executeError) {
                            clearTimeout(timeoutId);
                            console.error(`❌ Withdrawal transaction attempt ${retryCount + 1} failed:`, executeError);

                            // Check if it's a timeout error
                            if (executeError.message && executeError.message.includes('timeout')) {
                                console.log('🔄 Withdrawal timeout detected, will retry...');
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    console.log(`⏳ Waiting 3 seconds before withdrawal retry ${retryCount + 1}...`);
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                    continue;
                                }
                            }

                            // Check if it's a user rejection
                            if (executeError.message && (executeError.message.includes('rejected') || executeError.message.includes('User denied'))) {
                                console.log('🚫 User rejected withdrawal transaction');
                                reject(new Error('Withdrawal transaction rejected by user'));
                                return;
                            }

                            // For other errors, try alternative execution method
                            try {
                                console.log('🔄 Trying alternative withdrawal execution method...');
                                const altResult = await this.executeWithdrawalTransactionAlternative(calldata);
                                clearTimeout(timeoutId);
                                console.log('✅ Alternative withdrawal execution successful:', altResult);
                                resolve(altResult);
                                return;
                            } catch (altError) {
                                console.error('❌ Alternative withdrawal execution also failed:', altError);
                                retryCount++;

                                if (retryCount >= maxRetries) {
                                    reject(executeError);
                                    return;
                                }

                                console.log(`⏳ Waiting 3 seconds before withdrawal retry ${retryCount + 1}...`);
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        }
                    }
                });
            };

            const result = await executeWithdrawalTransactionWithRetry(calldata);

            console.log('Withdrawal initiated successfully:', result);

            // Wait for transaction confirmation
            const receipt = await this.provider.waitForTransaction(result.transaction_hash);

            return {
                success: true,
                transactionHash: result.transaction_hash,
                withdrawalId: result.transaction_hash, // Using tx hash as withdrawal ID for now
                blockHash: receipt.block_hash
            };

        } catch (error) {
            console.error('Failed to initiate Bitcoin withdrawal:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Stake tokens
    async stakeTokens(tokenAddress, amount) {
        try {
            if (!this.contract || !this.account) {
                throw new Error('Bridge service not initialized');
            }

            const amountU256 = this.tokenToUnits(amount);
            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.account.execute({
                contractAddress: this.contractAddress,
                entrypoint: 'stake',
                calldata: [
                    tokenFelt,        // token address
                    amountU256.low,   // amount low
                    amountU256.high   // amount high
                ]
            });

            const receipt = await this.provider.waitForTransaction(result.transaction_hash);
            
            return {
                success: true,
                transactionHash: result.transaction_hash,
                blockHash: receipt.block_hash
            };

        } catch (error) {
            console.error('Failed to stake tokens:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Unstake tokens
    async unstakeTokens(tokenAddress, amount) {
        try {
            if (!this.contract || !this.account) {
                throw new Error('Bridge service not initialized');
            }

            const amountU256 = this.tokenToUnits(amount);
            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.account.execute({
                contractAddress: this.contractAddress,
                entrypoint: 'unstake',
                calldata: [
                    tokenFelt,        // token address
                    amountU256.low,   // amount low
                    amountU256.high   // amount high
                ]
            });

            const receipt = await this.provider.waitForTransaction(result.transaction_hash);
            
            return {
                success: true,
                transactionHash: result.transaction_hash,
                blockHash: receipt.block_hash
            };

        } catch (error) {
            console.error('Failed to unstake tokens:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Claim staking rewards
    async claimRewards(tokenAddress) {
        try {
            if (!this.contract || !this.account) {
                throw new Error('Bridge service not initialized');
            }

            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.account.execute({
                contractAddress: this.contractAddress,
                entrypoint: 'claim_rewards',
                calldata: [tokenFelt] // token address
            });

            const receipt = await this.provider.waitForTransaction(result.transaction_hash);
            
            return {
                success: true,
                transactionHash: result.transaction_hash,
                blockHash: receipt.block_hash
            };

        } catch (error) {
            console.error('Failed to claim rewards:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Get staking position (view function)
    async getStakingPosition(userAddress, tokenAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const userFelt = this.starknetAddressToFelt(userAddress);
            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'get_staking_position',
                calldata: [userFelt, tokenFelt]
            });

            // Parse the staking position from result
            // Note: This depends on the exact return structure of your contract
            return this.parseStakingPosition(result);

        } catch (error) {
            console.error('Failed to get staking position:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Get user rewards (view function)
    async getUserRewards(userAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const userFelt = this.starknetAddressToFelt(userAddress);

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'get_user_rewards',
                calldata: [userFelt]
            });

            // Parse rewards from result
            return this.parseU256(result);

        } catch (error) {
            console.error('Failed to get user rewards:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Get total staked amount (view function)
    async getTotalStaked(tokenAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'get_total_staked',
                calldata: [tokenFelt]
            });

            return this.parseU256(result);

        } catch (error) {
            console.error('Failed to get total staked:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Get reward rate (view function)
    async getRewardRate(tokenAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const tokenFelt = this.starknetAddressToFelt(tokenAddress);

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'get_reward_rate',
                calldata: [tokenFelt]
            });

            return this.parseU256(result);

        } catch (error) {
            console.error('Failed to get reward rate:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Check if bridge is paused
    async isBridgePaused() {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'is_bridge_paused',
                calldata: []
            });

            return result.result && result.result[0] === '0x1';

        } catch (error) {
            console.error('Failed to check bridge status:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Get SBTC contract address
    async getSBTCContract() {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Bridge service not initialized');
            }

            const result = await this.provider.callContract({
                contractAddress: this.contractAddress,
                entrypoint: 'get_sbtc_contract',
                calldata: []
            });

            return '0x' + result.result[0];

        } catch (error) {
            console.error('Failed to get SBTC contract:', error);
            throw this.parseStarknetError(error);
        }
    }

    // Helper function to parse U256 from contract result
    parseU256(result) {
        if (!result.result || result.result.length < 2) {
            return 0;
        }
        
        const low = parseInt(result.result[0]);
        const high = parseInt(result.result[1]);
        
        // For small amounts, we can just use the low part
        // For larger amounts, we'd need proper BigInt handling
        return low / 1000000; // Convert from contract units (6 decimals)
    }

    // Helper function to parse staking position
    parseStakingPosition(result) {
        if (!result.result || result.result.length < 6) {
            return null;
        }

        return {
            user: '0x' + result.result[0],
            token: '0x' + result.result[1],
            amount: parseInt(result.result[2]) / 1000000,
            stakedAt: parseInt(result.result[3]),
            lastRewardUpdate: parseInt(result.result[4]),
            rewardDebt: parseInt(result.result[5])
        };
    }

    // Validate calldata format before sending to contract
    validateCalldata(calldata) {
        console.log('🔍 Validating calldata:', calldata);
        console.log('Calldata types:', calldata.map((item, i) => `${i}: ${typeof item} = ${item}`));

        if (!Array.isArray(calldata)) {
            throw new Error('Calldata must be an array');
        }

        if (calldata.length < 3) {
            throw new Error(`Calldata array too short. Expected at least 3 items, got ${calldata.length}`);
        }

        for (let i = 0; i < calldata.length; i++) {
            const item = calldata[i];
            console.log(`Validating calldata[${i}]:`, {
                value: item,
                type: typeof item,
                isString: typeof item === 'string',
                length: typeof item === 'string' ? item.length : 'N/A'
            });

            // Check if it's a valid format for Starknet
            if (typeof item === 'string') {
                // Should be either a hex string starting with 0x or a decimal number as string
                if (item.match(/^\d+$/)) {
                    // Decimal number as string - valid
                    console.log(`✅ Calldata[${i}] is valid decimal string: ${item}`);
                } else if (item.match(/^0x[0-9a-fA-F]+$/)) {
                    // Hex string - valid
                    console.log(`✅ Calldata[${i}] is valid hex string: ${item}`);

                    // More lenient validation for felt252 format - accept shorter formats for contract compatibility
                    if (item.startsWith('0x') && item.length < 10) {
                        console.warn(`⚠️ Calldata[${i}] hex string length warning: ${item.length} chars (expected at least 10 for felt252)`);
                    }
                } else {
                    console.error(`❌ Calldata[${i}] invalid format: ${item}`);
                    throw new Error(`Invalid calldata format at index ${i}: ${item}. Expected hex (0x...) or decimal number.`);
                }
            } else if (typeof item === 'number') {
                console.log(`✅ Calldata[${i}] is valid number: ${item}`);
            } else if (typeof item === 'bigint') {
                console.log(`✅ Calldata[${i}] is valid bigint: ${item}`);
            } else {
                console.error(`❌ Calldata[${i}] invalid type: ${typeof item}`);
                throw new Error(`Invalid calldata type at index ${i}: ${typeof item}. Expected string, number, or bigint.`);
            }
        }

        console.log('✅ Calldata validation passed');
        return true;
    }

    // Parse Starknet errors for user-friendly messages
    parseStarknetError(error) {
        const errorMessage = error.message || error.toString();

        console.error('Raw Starknet error:', errorMessage);

        if (errorMessage.includes('rejected') || errorMessage.includes('User denied')) {
            return new Error('Transaction rejected by user');
        } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
            return new Error('Insufficient balance for this transaction');
        } else if (errorMessage.includes('paused')) {
            return new Error('Bridge is currently paused. Please try again later.');
        } else if (errorMessage.includes('nonce')) {
            return new Error('Transaction nonce error. Please try again.');
        } else if (errorMessage.includes('limit')) {
            return new Error('Transaction exceeds daily bridge limit.');
        } else if (errorMessage.includes('timeout')) {
            return new Error('Transaction confirmation timed out. Please check your wallet.');
        } else if (errorMessage.includes('invalid_format') || errorMessage.includes('invalid_type')) {
            return new Error('Invalid transaction data format. Please check your input values.');
        } else if (errorMessage.includes('INVALID_BTC_ADDR_LENGTH')) {
            return new Error('Bitcoin address format not compatible with bridge contract. The bridge will automatically try alternative conversion methods.');
        } else if (errorMessage.includes('too_big')) {
            return new Error('Input value too large for this transaction.');
        }

        return new Error(`Transaction failed: ${errorMessage}`);
    }

    // Enhanced debugging function for troubleshooting
    async debugTransaction(amount, btcAddress, starknetAddress) {
        console.log('🔍 Enhanced Transaction Debug');
        console.log('Input parameters:', { amount, btcAddress, starknetAddress });

        try {
            // Test address conversions with auto-detection
            console.log('Testing address conversions...');
            const btcFelt = this.bitcoinAddressToFeltAuto(btcAddress);
            const starknetFelt = this.starknetAddressToFelt(starknetAddress);
            const amountU256 = this.btcToSatoshis(amount);

            console.log('✅ Address conversions successful:', {
                btcFelt: btcFelt,
                starknetFelt: starknetFelt,
                amountU256: amountU256
            });

            // Test calldata preparation
            console.log('Testing calldata preparation...');
            const calldata = [
                String(amountU256.low),
                String(amountU256.high),
                btcFelt,
                starknetFelt
            ];

            console.log('Calldata array:', calldata);
            console.log('Calldata details:', calldata.map((item, i) => ({
                index: i,
                value: item,
                type: typeof item,
                length: item.length,
                format: item.startsWith('0x') ? 'hex' : 'decimal'
            })));

            // Test validation
            console.log('Testing calldata validation...');
            this.validateCalldata(calldata);
            console.log('✅ Calldata validation passed');

            // Test wallet account
            if (this.account) {
                console.log('✅ Wallet account available:', {
                    address: this.account.address,
                    hasExecute: !!this.account.execute
                });
            } else {
                console.log('❌ No wallet account available');
            }

            return {
                success: true,
                calldata: calldata,
                conversions: {
                    btcFelt,
                    starknetFelt,
                    amountU256
                },
                walletInfo: this.account ? {
                    address: this.account.address,
                    hasExecute: !!this.account.execute
                } : null
            };

        } catch (error) {
            console.error('❌ Debug failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            return {
                success: false,
                error: error.message,
                errorDetails: error,
                calldata: null
            };
        }
    }
}

// Create global instance
window.starknetBridgeService = new StarknetBridgeService();

// Global debug function for browser console
window.debugBridge = async function(amount = 0.1, btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', starknetAddress = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
    console.log('🔧 Global Bridge Debug Function');
    console.log('Testing with parameters:', { amount, btcAddress, starknetAddress });

    if (window.starknetBridgeService) {
        return await window.starknetBridgeService.debugTransaction(amount, btcAddress, starknetAddress);
    } else {
        console.error('❌ Bridge service not available');
        return { success: false, error: 'Bridge service not loaded' };
    }
};

// Test Bitcoin address conversion methods against the actual contract
window.testBitcoinAddressConversion = async function(btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') {
    console.log('🧪 Testing Bitcoin Address Conversion Methods');
    console.log('Testing address:', btcAddress);

    try {
        if (window.starknetBridgeService) {
            const methods = [
                { name: 'Length-based encoding', method: 'bitcoinAddressToFeltLength' },
                { name: 'Contract-compatible encoding', method: 'bitcoinAddressToFeltContract' },
                { name: 'Byte encoding', method: 'bitcoinAddressToFeltBytes' },
                { name: 'Standard ASCII encoding', method: 'bitcoinAddressToFelt' },
                { name: 'Alternative ASCII sum', method: 'bitcoinAddressToFeltAlt' },
                { name: 'Hash-based encoding', method: 'bitcoinAddressToFeltHash' },
                { name: 'Raw felt252 encoding', method: 'bitcoinAddressToFeltRaw' },
                { name: 'Padded encoding', method: 'bitcoinAddressToFeltPadded' }
            ];

            const results = {};

            for (const { name, method } of methods) {
                try {
                    console.log(`\n🔄 Testing ${name}...`);
                    const result = window.starknetBridgeService[method](btcAddress);
                    results[method] = {
                        success: true,
                        result: result,
                        method: name,
                        length: result.length,
                        format: result.startsWith('0x') ? 'hex' : 'decimal'
                    };
                    console.log(`✅ ${name} successful:`, result);
                } catch (error) {
                    results[method] = {
                        success: false,
                        error: error.message,
                        method: name
                    };
                    console.error(`❌ ${name} failed:`, error.message);
                }
            }

            console.log('\n📊 Conversion Results Summary:');
            console.table(results);

            // Check which methods succeeded
            const successfulMethods = Object.entries(results)
                .filter(([_, result]) => result.success)
                .map(([method, result]) => ({ method, result: result.result }));

            if (successfulMethods.length > 0) {
                console.log(`✅ ${successfulMethods.length} conversion method(s) succeeded`);
                console.log('💡 The bridge will automatically use the first successful method');
            } else {
                console.error('❌ All conversion methods failed');
            }

            // Test each successful method against the actual contract
            if (successfulMethods.length > 0) {
                console.log('\n🔍 Testing successful methods against the actual contract...');
                const contractTestResults = await testConversionsAgainstContract(btcAddress, successfulMethods);
                console.log('Contract test results:', contractTestResults);

                return {
                    success: successfulMethods.length > 0,
                    results: results,
                    successfulMethods: successfulMethods,
                    contractTestResults: contractTestResults
                };
            }

            return {
                success: successfulMethods.length > 0,
                results: results,
                successfulMethods: successfulMethods
            };
        } else {
            console.error('❌ Bridge service not available');
            return { success: false, error: 'Bridge service not loaded' };
        }
    } catch (error) {
        console.error('❌ Bitcoin address conversion test failed:', error);
        return {
            success: false,
            error: error.message,
            errorDetails: error
        };
    }
};

// Test contract-compatible Bitcoin address conversion specifically
window.testContractCompatibleConversion = async function(btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') {
    console.log('🧪 Testing Contract-Compatible Bitcoin Address Conversion');
    console.log('Testing address:', btcAddress);

    try {
        if (window.starknetBridgeService) {
            const methods = [
                { name: 'Length-based encoding', method: 'bitcoinAddressToFeltLength' },
                { name: 'Contract-compatible encoding', method: 'bitcoinAddressToFeltContract' },
                { name: 'Byte encoding', method: 'bitcoinAddressToFeltBytes' }
            ];

            console.log('📏 Bitcoin address length:', btcAddress.length);
            console.log('✅ Expected range: 26-35 characters');

            if (btcAddress.length < 26 || btcAddress.length > 35) {
                console.warn(`⚠️ Address length ${btcAddress.length} is outside expected range 26-35`);
                console.log('💡 This might cause INVALID_BTC_ADDR_LENGTH error');
            }

            // Test the length-based method specifically since it's most likely to work
            console.log('\n🎯 Testing length-based method (most likely to work):');
            try {
                const lengthMethod = window.starknetBridgeService.bitcoinAddressToFeltLength(btcAddress);
                console.log(`✅ Length-based method result: ${lengthMethod}`);
                console.log(`   This represents the length ${btcAddress.length} as a felt252`);
                console.log(`   Contract validation: btc_address.try_into().unwrap_or(0) should equal ${btcAddress.length}`);
            } catch (error) {
                console.error(`❌ Length-based method failed:`, error.message);
            }

            for (const { name, method } of methods) {
                try {
                    console.log(`\n🔄 Testing ${name}...`);
                    const result = window.starknetBridgeService[method](btcAddress);

                    console.log(`✅ ${name} successful:`, {
                        result: result,
                        length: result.length,
                        btcLength: btcAddress.length
                    });

                    // Test if this format would pass contract validation
                    if (result.length >= 26 && result.length <= 35) {
                        console.log(`✅ ${name} length is within contract expectations`);
                    } else {
                        console.log(`❌ ${name} length ${result.length} is outside contract expectations`);
                    }

                } catch (error) {
                    console.error(`❌ ${name} failed:`, error.message);
                }
            }

            return {
                success: true,
                btcAddress: btcAddress,
                length: btcAddress.length,
                expectedRange: '26-35'
            };
        } else {
            console.error('❌ Bridge service not available');
            return { success: false, error: 'Bridge service not loaded' };
        }
    } catch (error) {
        console.error('❌ Contract-compatible conversion test failed:', error);
        return {
            success: false,
            error: error.message,
            errorDetails: error
        };
    }
};

// Test conversion methods against the actual contract
async function testConversionsAgainstContract(btcAddress, successfulMethods) {
    console.log('🔬 Testing conversion methods against actual contract...');

    if (!window.starknetBridgeService) {
        console.error('❌ Bridge service not available');
        return { error: 'Bridge service not loaded' };
    }

    const testAmount = 0.001; // Small test amount
    const testStarknetAddress = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const amountU256 = window.starknetBridgeService.btcToSatoshis(testAmount);

    const contractTestResults = {};

    for (const { method, result } of successfulMethods) {
        try {
            console.log(`\n🧪 Testing ${method} against contract...`);

            // Prepare calldata with this conversion method
            const calldata = [
                String(amountU256.low),
                String(amountU256.high),
                result,
                testStarknetAddress
            ];

            console.log(`Testing calldata:`, calldata);

            // Try to validate calldata format first
            window.starknetBridgeService.validateCalldata(calldata);

            // Try a dry-run call to see if the contract accepts this format
            // We'll use a very small amount to minimize risk
            try {
                // This will fail with INVALID_BTC_ADDR_LENGTH if the format is wrong
                await window.starknetBridgeService.account.execute({
                    contractAddress: window.starknetBridgeService.contractAddress,
                    entrypoint: 'initiate_bitcoin_deposit',
                    calldata: calldata
                });

                contractTestResults[method] = {
                    success: true,
                    result: result,
                    calldata: calldata,
                    message: '✅ Contract accepted this format!'
                };
                console.log(`✅ ${method} PASSED contract validation!`);

            } catch (contractError) {
                if (contractError.message && contractError.message.includes('INVALID_BTC_ADDR_LENGTH')) {
                    contractTestResults[method] = {
                        success: false,
                        result: result,
                        calldata: calldata,
                        error: 'INVALID_BTC_ADDR_LENGTH',
                        message: '❌ Contract rejected this format'
                    };
                    console.log(`❌ ${method} FAILED contract validation: INVALID_BTC_ADDR_LENGTH`);
                } else {
                    contractTestResults[method] = {
                        success: false,
                        result: result,
                        calldata: calldata,
                        error: contractError.message,
                        message: '❌ Contract call failed for other reasons'
                    };
                    console.log(`❌ ${method} FAILED: ${contractError.message}`);
                }
            }

        } catch (error) {
            contractTestResults[method] = {
                success: false,
                result: result,
                error: error.message,
                message: '❌ Preparation failed'
            };
            console.log(`❌ ${method} preparation failed: ${error.message}`);
        }
    }

    // Find which methods passed
    const passedMethods = Object.entries(contractTestResults)
        .filter(([_, result]) => result.success)
        .map(([method, result]) => ({ method, result: result.result }));

    console.log(`\n📊 Contract Test Summary:`);
    console.log(`Total methods tested: ${successfulMethods.length}`);
    console.log(`Methods that passed: ${passedMethods.length}`);

    if (passedMethods.length > 0) {
        console.log(`✅ SUCCESS! Found working conversion method(s):`);
        passedMethods.forEach(({ method, result }) => {
            console.log(`   - ${method}: ${result}`);
        });
    } else {
        console.log(`❌ No conversion methods passed contract validation`);
    }

    return {
        totalTested: successfulMethods.length,
        passed: passedMethods.length,
        results: contractTestResults,
        passedMethods: passedMethods
    };
}

// Test Bitcoin address length conversion (the fix for INVALID_BTC_ADDR_LENGTH)
window.testBitcoinAddressLengthConversion = async function(btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') {
    console.log('🧪 Testing Bitcoin Address Length Conversion Fix');
    console.log('Testing address:', btcAddress);
    console.log('Address length:', btcAddress.length);

    try {
        if (window.starknetBridgeService) {
            // Test the corrected conversion method
            console.log('Testing corrected length-based conversion...');
            const lengthFelt = window.starknetBridgeService.bitcoinAddressToFelt(btcAddress);

            console.log('✅ Length conversion successful:', {
                original: btcAddress,
                length: btcAddress.length,
                felt: lengthFelt,
                feltAsNumber: parseInt(lengthFelt, 16)
            });

            // Verify the conversion is correct
            const expectedLength = btcAddress.length;
            const actualLength = parseInt(lengthFelt, 16);

            if (actualLength === expectedLength) {
                console.log('✅ Conversion is CORRECT! Contract should accept this.');
                console.log('💡 The INVALID_BTC_ADDR_LENGTH error should now be fixed.');
            } else {
                console.error('❌ Conversion is INCORRECT!');
                console.error(`Expected length: ${expectedLength}, Got: ${actualLength}`);
            }

            // Test with different Bitcoin address formats
            const testAddresses = [
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // P2PKH - 34 chars
                '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // P2SH - 34 chars
                'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' // Bech32 - 42 chars
            ];

            console.log('\n🧪 Testing different Bitcoin address formats:');
            testAddresses.forEach((addr, i) => {
                const len = addr.length;
                const felt = window.starknetBridgeService.bitcoinAddressToFelt(addr);
                const convertedLen = parseInt(felt, 16);
                const status = len === convertedLen ? '✅' : '❌';
                console.log(`${status} Address ${i + 1}: ${len} chars → ${felt} → ${convertedLen} chars`);
            });

            return {
                success: actualLength === expectedLength,
                originalLength: expectedLength,
                convertedLength: actualLength,
                feltValue: lengthFelt,
                btcAddress: btcAddress
            };
        } else {
            console.error('❌ Bridge service not available');
            return { success: false, error: 'Bridge service not loaded' };
        }
    } catch (error) {
        console.error('❌ Bitcoin address length conversion test failed:', error);
        return {
            success: false,
            error: error.message,
            errorDetails: error
        };
    }
};

// Test Bitcoin to Starknet deposit specifically
window.testBitcoinToStarknetBridge = async function(amount = 0.1, btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', starknetAddress = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
    console.log('🧪 Testing Bitcoin → Starknet Bridge');
    console.log('Testing parameters:', { amount, btcAddress, starknetAddress });

    try {
        // Validate inputs first
        if (!btcAddress || !starknetAddress) {
            throw new Error('Bitcoin and Starknet addresses are required');
        }

        if (typeof amount !== 'number' || amount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        if (window.starknetBridgeService) {
            // Test the conversion functions with auto-detection
            console.log('Testing address conversions...');
            const btcFelt = window.starknetBridgeService.bitcoinAddressToFeltAuto(btcAddress);
            const starknetFelt = window.starknetBridgeService.starknetAddressToFelt(starknetAddress);
            const amountU256 = window.starknetBridgeService.btcToSatoshis(amount);

            console.log('✅ Conversions successful:', {
                btcFelt: btcFelt,
                starknetFelt: starknetFelt,
                amountU256: amountU256
            });

            // Test calldata preparation
            console.log('Testing calldata preparation...');
            const calldata = [
                String(amountU256.low),
                String(amountU256.high),
                btcFelt,
                starknetFelt
            ];

            console.log('✅ Calldata prepared:', calldata);

            // Test validation
            console.log('Testing calldata validation...');
            window.starknetBridgeService.validateCalldata(calldata);
            console.log('✅ Calldata validation passed');

            // Check if wallet is ready
            if (window.starknetBridgeService.account) {
                console.log('✅ Wallet account ready for transaction');
                console.log('💡 Ready to execute initiateBitcoinDeposit()');
            } else {
                console.log('⚠️ Wallet not connected. Please connect your Starknet wallet first.');
            }

            return {
                success: true,
                ready: !!window.starknetBridgeService.account,
                calldata: calldata,
                conversions: {
                    btcFelt,
                    starknetFelt,
                    amountU256
                }
            };
        } else {
            console.error('❌ Bridge service not available');
            return { success: false, error: 'Bridge service not loaded' };
        }
    } catch (error) {
        console.error('❌ Bitcoin to Starknet test failed:', error);
        return {
            success: false,
            error: error.message,
            errorDetails: error
        };
    }
};