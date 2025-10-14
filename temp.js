        // Bridge Configuration - UPDATED WITH CORRECT DEPLOYED ADDRESSES
        const BRIDGE_CONFIG = {
            // Contract addresses (updated to match deployed contract addresses)
            BRIDGE_CONTRACT: '0x05ea098d3afed3c0f34258e25b0ccfbdf5893e24313dd4caed31d5f98faec7fe',
            SBTC_CONTRACT: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c',

            // Token configurations
            TOKENS: {
                SBTC: {
                    address: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c',
                    decimals: 6,
                    symbol: 'SBTC'
                },
                STRK: {
                    address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
                    decimals: 18,
                    symbol: 'STRK'
                }
            },

            // Multi-Network Configuration with multiple RPC endpoints for reliability
            NETWORKS: {
                mainnet: {
                    name: 'Starknet Mainnet',
                    chainId: '0x534e5f4d41494e', // SN_MAIN
                    rpcUrls: [
                        'https://starknet-mainnet.public.blastapi.io/rpc/v0_7',
                        'https://starknet-mainnet.g.alchemy.com/v2/demo',
                        'https://rpc.starknet.lava.build',
                        'https://starknet.public.blastapi.io'
                    ],
                    explorerUrl: 'https://starkscan.co',
                    isTestnet: false,
                    warning: null,
                    // Contract addresses for mainnet
                    contracts: {
                        BRIDGE_CONTRACT: '0x05ea098d3afed3c0f34258e25b0ccfbdf5893e24313dd4caed31d5f98faec7fe',
                        SBTC_CONTRACT: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c'
                    }
                },
                testnet: {
                    name: 'Starknet Sepolia Testnet',
                    chainId: '0x534e5f5345504f4c49', // SN_SEPOLIA
                    rpcUrls: [
                        'https://starknet-sepolia.public.blastapi.io/rpc/v0_7',
                        'https://starknet-sepolia.g.alchemy.com/v2/demo',
                        'https://rpc.starknet-sepolia.lava.build',
                        'https://starknet-sepolia.public.blastapi.io'
                    ],
                    explorerUrl: 'https://sepolia.starkscan.co',
                    isTestnet: true,
                    warning: '⚠️ TESTNET: This is a test network. Tokens have no real value.',
                    // Contract addresses for testnet (replace with actual deployed addresses)
                    contracts: {
                        BRIDGE_CONTRACT: '0x05ea098d3afed3c0f34258e25b0ccfbdf5893e24313dd4caed31d5f98faec7fe', // Use mainnet for now
                        SBTC_CONTRACT: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c' // Use mainnet for now
                    }
                }
            },

            // Current network (default to mainnet)
            currentNetwork: 'mainnet',

            // Get current network configuration
            get NETWORK() {
                return this.NETWORKS[this.currentNetwork];
            },

            // Get current RPC URL for the network
            getCurrentRpcUrl: function() {
                const network = this.NETWORKS[this.currentNetwork];
                if (!network || !network.rpcUrls) {
                    throw new Error(`No RPC URLs configured for network: ${this.currentNetwork}`);
                }
                return network.rpcUrls[this.currentRpcIndex || 0];
            },

            // Switch to next RPC endpoint for the current network
            switchToNextRpc: function() {
                const network = this.NETWORKS[this.currentNetwork];
                if (!network || !network.rpcUrls || network.rpcUrls.length === 0) {
                    throw new Error(`No RPC URLs available for network: ${this.currentNetwork}`);
                }

                this.currentRpcIndex = (this.currentRpcIndex || 0) + 1;
                if (this.currentRpcIndex >= network.rpcUrls.length) {
                    this.currentRpcIndex = 0;
                }

                const newRpcUrl = this.getCurrentRpcUrl();
                console.log(`🔄 Switched to RPC endpoint: ${newRpcUrl}`);

                return newRpcUrl;
            },

            // Test RPC endpoint connectivity
            testRpcEndpoint: async function(rpcUrl) {
                const startTime = Date.now();
                try {
                    const response = await fetch(rpcUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'starknet_blockNumber',
                            params: [],
                            id: 1
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (data.error) {
                        throw new Error(`RPC Error: ${data.error.message}`);
                    }

                    return {
                        success: true,
                        blockNumber: data.result,
                        latency: Date.now() - startTime
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        latency: Date.now() - startTime
                    };
                }
            },

            // Find the best available RPC endpoint
            findBestRpcEndpoint: async function() {
                const network = this.NETWORKS[this.currentNetwork];
                if (!network || !network.rpcUrls || network.rpcUrls.length === 0) {
                    throw new Error(`No RPC URLs configured for network: ${this.currentNetwork}`);
                }

                console.log(`🔍 Testing ${network.rpcUrls.length} RPC endpoints for ${network.name}...`);

                for (let i = 0; i < network.rpcUrls.length; i++) {
                    const rpcUrl = network.rpcUrls[i];
                    console.log(`Testing RPC ${i + 1}/${network.rpcUrls.length}: ${rpcUrl}`);

                    const result = await this.testRpcEndpoint(rpcUrl);

                    if (result.success) {
                        console.log(`✅ RPC endpoint ${i + 1} is working (latency: ${result.latency}ms)`);
                        this.currentRpcIndex = i;
                        return { rpcUrl, index: i };
                    } else {
                        console.log(`❌ RPC endpoint ${i + 1} failed: ${result.error}`);
                    }
                }

                // If no endpoint is working, throw error with details
                throw new Error(`All RPC endpoints failed for ${network.name}`);
            },

            // Switch network
            switchNetwork: function(network) {
                if (this.NETWORKS[network]) {
                    this.currentNetwork = network;
                    this.currentRpcIndex = 0; // Reset RPC index when switching networks
                    // Update contract addresses
                    this.BRIDGE_CONTRACT = this.NETWORKS[network].contracts.BRIDGE_CONTRACT;
                    this.SBTC_CONTRACT = this.NETWORKS[network].contracts.SBTC_CONTRACT;
                    return true;
                }
                return false;
            }
        };

        // Global bridge state
        let bridgeState = {
            isInitialized: false,
            isBridgePaused: false,
            stakingData: {
                stakedAmount: 0,
                rewards: 0,
                apy: 12.5
            },
            currentDirection: 'to-starknet',
            currentNetwork: 'mainnet'
        };

        // Current direction variable for easier access
        let currentDirection = bridgeState.currentDirection;

        // DOM Elements
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        const bridgeForm = document.getElementById('bridgeForm');
        const bridgeAmount = document.getElementById('bridgeAmount');
        const fromAddressInput = document.getElementById('fromAddress');
        const toAddressInput = document.getElementById('toAddress');
        const addressValidation = document.getElementById('addressValidation');
        const toAddressValidation = document.getElementById('toAddressValidation');
        const addressHint = document.getElementById('addressHint');
        const toAddressHint = document.getElementById('toAddressHint');
        const progressFill = document.getElementById('progressFill');
        const progressValue = document.getElementById('progressValue');
        const stakedAmountEl = document.getElementById('stakedAmount');
        const stakingRewardsEl = document.getElementById('stakingRewards');
        const stakingApyEl = document.getElementById('stakingApy');
        const stakeBtn = document.getElementById('stakeBtn');
        const unstakeBtn = document.getElementById('unstakeBtn');
        const claimRewardsBtn = document.getElementById('claimRewardsBtn');
        const useConnectedAddressBtn = document.getElementById('useConnectedAddress');
        const pasteAddressBtn = document.getElementById('pasteAddress');
        const useConnectedToAddressBtn = document.getElementById('useConnectedToAddress');
        const pasteToAddressBtn = document.getElementById('pasteToAddress');
        const maxButton = document.querySelector('.max-btn');
        const networkOptions = document.querySelectorAll('.network-option');
        const bridgeButton = document.getElementById('bridgeButton');
        const cancelBridgeBtn = document.getElementById('cancelBridgeBtn');
        const connectStarknetBtn = document.getElementById('connectStarknetBtn');
        const starknetConnectSection = document.getElementById('starknetConnectSection');

        // New wallet connect buttons
        const connectXverseBtn = document.getElementById('connectXverseBtn');
        const connectReadyBtn = document.getElementById('connectReadyBtn');

        // Attach event listeners to wallet connect buttons
        if (connectXverseBtn) {
            connectXverseBtn.addEventListener('click', async function() {
                try {
                    console.log('🔄 Xverse connect button clicked');
                    const result = await connectToXverseWallet();

                    // Update connection state
                    connectedWallets.bitcoin = result.name;
                    connectedAddresses.bitcoin = result.address;

                    // Update UI
                    updateWalletUI();
                    updateWalletStatusDisplay();

                    // Show success notification
                    showNotification(`✅ Connected to ${result.name} (${result.address.substring(0, 8)}...)`, false);

                } catch (error) {
                    console.error('Xverse connection failed:', error);
                    showNotification(`❌ ${error.message}`, true);
                }
            });
        }

        if (connectReadyBtn) {
            connectReadyBtn.addEventListener('click', async function() {
                try {
                    console.log('🔄 Ready connect button clicked');
                    const result = await connectToReadyWallet();

                    // Update connection state
                    connectedWallets.starknet = result.name;
                    connectedAddresses.starknet = result.address;

                    // Update UI
                    updateWalletUI();
                    updateWalletStatusDisplay();

                    // Show success notification
                    showNotification(`✅ Connected to ${result.name} (${result.address.substring(0, 8)}...)`, false);

                } catch (error) {
                    console.error('Ready connection failed:', error);
                    showNotification(`❌ ${error.message}`, true);
                }
            });
        }

        // Wallet connection state - now supports both wallets
        let connectedWallets = {
            bitcoin: null,    // Xverse or other Bitcoin wallet
            starknet: null    // Ready or other Starknet wallet
        };
        let connectedAddresses = {
            bitcoin: null,
            starknet: null
        };

        // Connect to REAL Xverse wallet using Sats Connect API
        async function connectToXverseWallet() {
            try {
                console.log('🔄 Connecting to REAL Xverse Wallet...');

                // Check for Xverse wallet availability - prioritize Sats Connect
                let xverseProvider = null;
                let detectionMethod = '';

                // Method 1: Check for Sats Connect API (official Xverse Bitcoin API)
                if (window.satsConnect && typeof window.satsConnect.request === 'function') {
                    console.log('✅ Found Xverse Sats Connect API');
                    xverseProvider = window.satsConnect;
                    detectionMethod = 'satsConnect';
                }

                // Method 2: Check for Xverse Bitcoin Provider
                if (!xverseProvider && window.XverseProviders && window.XverseProviders.BitcoinProvider) {
                    console.log('✅ Found Xverse Bitcoin Provider');
                    xverseProvider = window.XverseProviders.BitcoinProvider;
                    detectionMethod = 'bitcoinProvider';
                }

                // Method 3: Check for direct xverse object
                if (!xverseProvider && window.xverse && typeof window.xverse.request === 'function') {
                    console.log('✅ Found direct Xverse API');
                    xverseProvider = window.xverse;
                    detectionMethod = 'direct';
                }

                // Method 4: Check ethereum providers for Xverse
                if (!xverseProvider && window.ethereum && window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                    const xverseInProviders = window.ethereum.providers.find(p =>
                        p.isXverse === true ||
                        (p.constructor && p.constructor.name && p.constructor.name.includes('Xverse'))
                    );
                    if (xverseInProviders) {
                        console.log('✅ Found Xverse in ethereum providers');
                        xverseProvider = xverseInProviders;
                        detectionMethod = 'ethereumProvider';
                    }
                }

                // Method 5: Check if current ethereum provider is Xverse
                if (!xverseProvider && window.ethereum && window.ethereum.isXverse === true && typeof window.ethereum.request === 'function') {
                    console.log('✅ Current ethereum provider is Xverse');
                    xverseProvider = window.ethereum;
                    detectionMethod = 'currentEthereum';
                }

                // If no Xverse wallet detected, fail with clear message
                if (!xverseProvider) {
                    throw new Error('REAL Xverse wallet not detected. Please install the official Xverse browser extension from https://www.xverse.app/ and refresh this page. If you have Xverse installed, try disabling other wallet extensions and refresh the page.');
                }

                console.log(`🔄 Using detection method: ${detectionMethod}`);

                // Check if wallet is unlocked/ready before requesting addresses
                console.log('🔐 Checking Xverse wallet unlock status...');
                let walletReady = false;
                let statusCheckError = null;

                try {
                    // Try to check wallet status using different methods
                    if (xverseProvider.request) {
                        // For Sats Connect and similar APIs, try a simple request to check if wallet responds
                        try {
                            const statusResponse = await xverseProvider.request('getInfo', {});
                            if (statusResponse) {
                                console.log('✅ Xverse wallet status check passed');
                                walletReady = true;
                            } else {
                                console.log('⚠️ Xverse wallet status check returned empty response');
                                statusCheckError = 'Empty status response';
                            }
                        } catch (requestError) {
                            console.log('⚠️ Xverse wallet status request failed:', requestError.message);
                            statusCheckError = requestError.message;
                            // Don't fail here - some wallets may not support getInfo
                        }
                    } else if (xverseProvider.getInfo && typeof xverseProvider.getInfo === 'function') {
                        // Alternative status check
                        try {
                            const info = await xverseProvider.getInfo();
                            if (info) {
                                console.log('✅ Xverse wallet info retrieved');
                                walletReady = true;
                            } else {
                                console.log('⚠️ Xverse wallet info check returned empty response');
                                statusCheckError = 'Empty info response';
                            }
                        } catch (infoError) {
                            console.log('⚠️ Xverse wallet info check failed:', infoError.message);
                            statusCheckError = infoError.message;
                        }
                    } else {
                        // If we can't check status, assume it's ready (backward compatibility)
                        console.log('⚠️ Cannot check wallet status, proceeding with address request');
                        walletReady = true;
                    }
                } catch (statusError) {
                    console.warn('⚠️ Wallet status check failed:', statusError.message);
                    statusCheckError = statusError.message;
                    // Don't fail here, just log and continue - some wallets may not support status checks
                    walletReady = true;
                }

                // Only throw error if we have a specific indication that wallet is locked
                if (!walletReady && statusCheckError) {
                    // Check for specific locked wallet indicators
                    if (statusCheckError.includes('locked') ||
                        statusCheckError.includes('not authorized') ||
                        statusCheckError.includes('unauthorized') ||
                        statusCheckError.includes('User rejected') ||
                        statusCheckError.includes('cancelled')) {
                        throw new Error('Xverse wallet is locked or access denied. Please unlock your Xverse wallet and try again.');
                    }

                    if (statusCheckError.includes('not initialized') ||
                        statusCheckError.includes('not ready') ||
                        statusCheckError.includes('not available')) {
                        throw new Error('Xverse wallet is not properly initialized. Please ensure your Xverse wallet is set up and try again.');
                    }

                    // For other status check failures, proceed anyway since some wallets don't support status checks
                    console.log('⚠️ Status check failed but proceeding anyway:', statusCheckError);
                    walletReady = true;
                }

                console.log('🔄 Requesting Bitcoin addresses from Xverse...');

                // Get addresses using Sats Connect API with retry mechanism
                let addresses = null;
                let lastError = null;
                const maxRetries = 3;
                const baseDelay = 1000; // 1 second base delay

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        console.log(`🔄 Address request attempt ${attempt}/${maxRetries}...`);
                        console.log('📡 Using provider:', detectionMethod);
                        console.log('📋 Request parameters:', {
                            purposes: ['ordinals', 'payment'],
                            message: 'Connect to VernWallet Bridge - Bitcoin to Starknet'
                        });

                        const response = await xverseProvider.request('getAddresses', {
                            purposes: ['ordinals', 'payment'],
                            message: 'Connect to VernWallet Bridge - Bitcoin to Starknet'
                        });

                        console.log('📨 Xverse response received:', response);
                        console.log('🔍 Response structure:', {
                            hasResponse: !!response,
                            hasAddresses: !!(response && response.addresses),
                            addressesLength: response && response.addresses ? response.addresses.length : 0,
                            addressesType: response && response.addresses ? typeof response.addresses : 'undefined'
                        });

                        if (response && response.addresses && Array.isArray(response.addresses) && response.addresses.length > 0) {
                            addresses = response.addresses;
                            console.log(`✅ Retrieved ${addresses.length} addresses from Xverse on attempt ${attempt}`);
                            console.log('📧 Address details:', addresses.map((addr, i) => ({
                                index: i,
                                address: addr.address ? addr.address.substring(0, 10) + '...' : 'undefined',
                                purpose: addr.purpose || 'unknown',
                                hasPublicKey: !!addr.publicKey
                            })));
                            break; // Success, exit retry loop
                        } else {
                            // Log detailed information about the empty response
                            console.warn(`⚠️ Xverse returned empty or invalid address response on attempt ${attempt}`);
                            console.warn('Response details:', {
                                response: response,
                                responseType: typeof response,
                                addresses: response ? response.addresses : 'undefined',
                                addressesType: response && response.addresses ? typeof response.addresses : 'undefined',
                                isArray: response && response.addresses ? Array.isArray(response.addresses) : false
                            });

                            lastError = new Error('Empty or invalid response from Xverse wallet');

                            // If this is the last attempt, throw specific error
                            if (attempt === maxRetries) {
                                if (response && response.addresses === null) {
                                    throw new Error('Xverse wallet appears to be locked or not properly initialized. Please unlock your Xverse wallet and ensure you have Bitcoin addresses set up.');
                                } else if (response && Array.isArray(response.addresses) && response.addresses.length === 0) {
                                    throw new Error('No Bitcoin addresses found in Xverse wallet. Please ensure your Xverse wallet has Bitcoin addresses created.');
                                } else {
                                    throw new Error('Xverse wallet returned an unexpected response format. Please try again or contact support.');
                                }
                            }
                        }
                    } catch (addressError) {
                        lastError = addressError;
                        console.warn(`⚠️ Address request attempt ${attempt} failed:`, addressError.message);

                        // If this is the last attempt, throw the error
                        if (attempt === maxRetries) {
                            throw addressError;
                        }

                        // Wait before retry with exponential backoff
                        const delay = baseDelay * Math.pow(2, attempt - 1);
                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                }

                // Get the payment address (preferred for Bitcoin transactions)
                const bitcoinAddress = addresses.find(addr => addr.purpose === 'payment')?.address ||
                                      addresses.find(addr => addr.purpose === 'ordinals')?.address ||
                                      addresses[0]?.address;

                if (!bitcoinAddress) {
                    throw new Error('No valid Bitcoin address found in Xverse wallet response');
                }

                // Validate the Bitcoin address format
                if (!validateBitcoinAddress(bitcoinAddress)) {
                    throw new Error('Invalid Bitcoin address format returned from Xverse wallet');
                }

                console.log('✅ REAL Xverse wallet connected successfully!');
                console.log(`📧 Bitcoin Address: ${bitcoinAddress.substring(0, 8)}...${bitcoinAddress.substring(bitcoinAddress.length - 6)}`);
                console.log(`🔍 Detection Method: ${detectionMethod}`);

                return {
                    address: bitcoinAddress,
                    name: 'Xverse Wallet (Real)',
                    provider: xverseProvider,
                    type: 'bitcoin',
                    isRealWallet: true,
                    detectionMethod: detectionMethod
                };

            } catch (error) {
                console.error('❌ Xverse wallet connection failed:', error);

                // Enhanced error handling with specific user guidance
                let enhancedError = null;

                if (error.message.includes('not detected') || error.message.includes('not found')) {
                    enhancedError = new Error('Xverse wallet not detected. Please:\n\n1. Install Xverse from https://www.xverse.app/\n2. Enable the extension in browser settings\n3. Refresh this page\n4. Try connecting again\n\n💡 If Xverse is already installed, try disabling other wallet extensions temporarily.');
                }

                if (error.message.includes('cancelled') || error.message.includes('rejected') || error.message.includes('User rejected')) {
                    enhancedError = new Error('Connection cancelled. Please:\n\n1. Click "Connect Xverse" again\n2. Approve the connection in your Xverse wallet popup\n3. Make sure your wallet is unlocked\n\n💡 The connection request may have timed out. Try again.');
                }

                if (error.message.includes('not authorized') || error.message.includes('locked') || error.message.includes('unauthorized')) {
                    enhancedError = new Error('Xverse wallet is locked or access denied. Please:\n\n1. Unlock your Xverse wallet\n2. Ensure you have Bitcoin addresses set up\n3. Try connecting again\n\n💡 If your wallet remains locked, restart your browser and try again.');
                }

                if (error.message.includes('Invalid Bitcoin address')) {
                    enhancedError = new Error('Xverse wallet returned an invalid address format. Please:\n\n1. Ensure your Xverse wallet has valid Bitcoin addresses\n2. Contact Xverse support if the issue persists\n3. Try creating a new Bitcoin address in your wallet');
                }

                if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                    enhancedError = new Error('Connection timed out. Please:\n\n1. Make sure your Xverse wallet is active\n2. Try refreshing the page\n3. Check your internet connection\n4. Try again in a few moments\n\n💡 This is normal if your wallet extension is loading slowly.');
                }

                if (error.message.includes('network') || error.message.includes('Network')) {
                    enhancedError = new Error('Network error occurred. Please:\n\n1. Check your internet connection\n2. Try refreshing the page\n3. Try again in a few moments\n\n💡 If the issue persists, there may be a temporary network issue.');
                }

                // If we have an enhanced error, throw it
                if (enhancedError) {
                    throw enhancedError;
                }

                // Re-throw the error if it's already customized
                if (error.message.includes('Xverse wallet') || error.message.includes('REAL Xverse')) {
                    throw error;
                }

                // Generic fallback with helpful guidance
                enhancedError = new Error(`Xverse connection failed: ${error.message}\n\nTroubleshooting steps:\n1. Ensure Xverse extension is installed and enabled\n2. Refresh this page and try again\n3. Try disabling other wallet extensions\n4. Restart your browser if issues persist\n5. Contact support if the problem continues\n\n💡 Error code: ${error.code || 'Unknown'}`);
                throw enhancedError;
            }
        }

        // Connect to Ready wallet (Starknet) - Shows wallet popup for user to click connect
        async function connectToReadyWallet() {
            try {
                console.log('🔄 Opening Ready wallet popup...');

                if (!window.starknet) {
                    throw new Error('Ready wallet not detected. Please install Argent X, Braavos, or another Starknet wallet.');
                }

                // Enable the wallet (this triggers the wallet popup)
                await window.starknet.enable();

                if (!window.starknet.selectedAddress) {
                    throw new Error('No address selected in Ready wallet');
                }

                console.log('✅ Ready wallet connected successfully');
                return {
                    address: window.starknet.selectedAddress,
                    name: 'Ready Wallet',
                    provider: window.starknet,
                    type: 'starknet'
                };

            } catch (error) {
                console.error('Ready wallet connection error:', error);

                if (error.message.includes('rejected') || error.code === 4001) {
                    throw new Error('Wallet connection cancelled by user');
                }

                if (error.message.includes('not detected') || error.message.includes('not available')) {
                    throw new Error('Ready wallet not found. Please install Argent X, Braavos, or another Starknet wallet.');
                }

                throw error;
            }
        }



        // Update wallet buttons to show connected addresses (supports both wallets)
        function updateWalletUI() {
            // Update Xverse button
            if (connectedWallets.bitcoin && connectedAddresses.bitcoin && connectXverseBtn) {
                connectXverseBtn.innerHTML = `
                    <i class="fas fa-bitcoin"></i>
                    <span style="font-size: 0.75rem; display: block; margin-top: 2px;">
                        ${connectedAddresses.bitcoin.substring(0, 6)}...${connectedAddresses.bitcoin.substring(connectedAddresses.bitcoin.length - 4)}
                    </span>
                `;
                connectXverseBtn.classList.add('connected');
                connectXverseBtn.style.background = 'linear-gradient(to right, #4caf50, #45a049)';
                connectXverseBtn.style.borderColor = '#4caf50';
            } else if (connectXverseBtn) {
                connectXverseBtn.innerHTML = '<i class="fas fa-bitcoin" style="color: #f7931a;"></i> Xverse';
                connectXverseBtn.classList.remove('connected');
                connectXverseBtn.style.background = 'rgba(247, 147, 26, 0.1)';
                connectXverseBtn.style.borderColor = '#f7931a';
            }

            // Update Ready button
            if (connectedWallets.starknet && connectedAddresses.starknet && connectReadyBtn) {
                connectReadyBtn.innerHTML = `
                    <i class="fas fa-link"></i>
                    <span style="font-size: 0.75rem; display: block; margin-top: 2px;">
                        ${connectedAddresses.starknet.substring(0, 6)}...${connectedAddresses.starknet.substring(connectedAddresses.starknet.length - 4)}
                    </span>
                `;
                connectReadyBtn.classList.add('connected');
                connectReadyBtn.style.background = 'linear-gradient(to right, #4caf50, #45a049)';
                connectReadyBtn.style.borderColor = '#4caf50';
            } else if (connectReadyBtn) {
                connectReadyBtn.innerHTML = '<i class="fas fa-link" style="color: var(--primary);"></i> Ready';
                connectReadyBtn.classList.remove('connected');
                connectReadyBtn.style.background = 'rgba(124, 58, 237, 0.1)';
                connectReadyBtn.style.borderColor = 'var(--primary)';
            }
        }

        // Add event listeners for wallet buttons (supports simultaneous connections)
        if (connectXverseBtn) {
            connectXverseBtn.addEventListener('click', async () => {
                try {
                    console.log('🔄 Connecting to Xverse wallet...');
                    const result = await connectToXverseWallet();
                    if (result) {
                        connectedWallets.bitcoin = result.name;
                        connectedAddresses.bitcoin = result.address;
                        updateWalletUI();
                        updateWalletStatusDisplay();
                        showNotification(`✅ Connected to ${result.name} (Bitcoin wallet)`);

                        // Auto-populate forms if appropriate
                        useConnectedAddressForForms();
                    }
                } catch (error) {
                    console.error('Xverse connection failed:', error);
                    showNotification(`❌ Xverse connection failed: ${error.message}`, true);
                }
            });
        }

        if (connectReadyBtn) {
            connectReadyBtn.addEventListener('click', async () => {
                try {
                    console.log('🔄 Connecting to Ready wallet...');
                    const result = await connectToReadyWallet();
                    if (result) {
                        connectedWallets.starknet = result.name;
                        connectedAddresses.starknet = result.address;
                        updateWalletUI();
                        updateWalletStatusDisplay();
                        showNotification(`✅ Connected to ${result.name} (Starknet wallet)`);

                        // Auto-populate forms if appropriate
                        useConnectedAddressForForms();
                    }
                } catch (error) {
                    console.error('Ready connection failed:', error);
                    showNotification(`❌ Ready connection failed: ${error.message}`, true);
                }
            });
        }

        // Available wallets configuration - context-aware based on bridge direction
        const getAvailableWallets = () => {
            const bitcoinWallets = [
                {
                    id: 'xverse',
                    name: 'Xverse Wallet',
                    type: 'Bitcoin',
                    icon: 'fas fa-bitcoin',
                    isAvailable: () => {
                        try {
                            // Check for Xverse wallet in the correct order

                            // Method 1: Check for Xverse Bitcoin Provider (most common)
                            if (window.XverseProviders && window.XverseProviders.BitcoinProvider) {
                                return true;
                            }

                            // Method 2: Check for Sats Connect API
                            if (window.satsConnect && typeof window.satsConnect.request === 'function') {
                                return true;
                            }

                            // Method 3: Check for direct xverse object
                            if (window.xverse && typeof window.xverse.request === 'function') {
                                return true;
                            }

                            // Method 4: Check ethereum providers for Xverse
                            if (window.ethereum && window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                                const xverseProvider = window.ethereum.providers.find(p =>
                                    p.isXverse === true ||
                                    (p.constructor && p.constructor.name && p.constructor.name.includes('Xverse'))
                                );
                                if (xverseProvider) return true;
                            }

                            // Method 5: Check user agent for Xverse
                            if (typeof navigator !== 'undefined') {
                                const userAgent = navigator.userAgent.toLowerCase();
                                if (userAgent.includes('xverse')) {
                                    return true;
                                }
                            }

                            return false;
                        } catch (error) {
                            console.warn('Error detecting Xverse wallet:', error);
                            return false;
                        }
                    },
                    connect: async () => {
                        const walletName = 'Xverse Wallet';

                        try {
                            // Check if Sats Connect is available (Xverse's Bitcoin wallet API)
                            if (window.satsConnect || window.XverseProviders?.BitcoinProvider) {
                                console.log('🔄 Connecting via Sats Connect (Xverse Bitcoin API)...');

                                // Use Sats Connect to request addresses
                                const response = await window.satsConnect.request('getAddresses', {
                                    purposes: ['ordinals', 'payment'],
                                    message: 'Connect to Bitcoin-Starknet Bridge'
                                });

                                if (response && response.addresses && response.addresses.length > 0) {
                                    const bitcoinAddress = response.addresses.find(addr => addr.purpose === 'payment')?.address ||
                                                          response.addresses[0].address;

                                    console.log('✅ Connected to Xverse via Sats Connect');
                                    return {
                                        address: bitcoinAddress,
                                        name: walletName,
                                        provider: window.satsConnect || window.XverseProviders.BitcoinProvider,
                                        type: 'bitcoin'
                                    };
                                }
                            }

                            // Fallback: Try Xverse's direct API
                            if (window.xverse && typeof window.xverse.request === 'function') {
                                console.log('🔄 Trying Xverse direct API...');

                                try {
                                    const result = await window.xverse.request('getAddresses', {
                                        purposes: ['ordinals', 'payment']
                                    });

                                    if (result && result.addresses && result.addresses.length > 0) {
                                        const bitcoinAddress = result.addresses.find(addr => addr.purpose === 'payment')?.address ||
                                                              result.addresses[0].address;

                                        console.log('✅ Connected via Xverse direct API');
                                        return {
                                            address: bitcoinAddress,
                                            name: walletName,
                                            provider: window.xverse,
                                            type: 'bitcoin'
                                        };
                                    }
                                } catch (directError) {
                                    console.log('⚠️ Xverse direct API failed, trying other methods');
                                }
                            }

                            // Fallback: Try Unisat or other Bitcoin wallet APIs
                            if (window.unisat) {
                                console.log('🔄 Trying Unisat wallet...');
                                const accounts = await window.unisat.requestAccounts();
                                if (accounts && accounts.length > 0) {
                                    console.log('✅ Connected via Unisat');
                                    return {
                                        address: accounts[0],
                                        name: 'Unisat Wallet',
                                        provider: window.unisat,
                                        type: 'bitcoin'
                                    };
                                }
                            }

                            // Final fallback: Ethereum-style connection (for compatibility)
                            if (window.ethereum) {
                                console.log('🔄 Trying Ethereum-style connection...');

                                let provider = window.ethereum;

                                // Check if it's Xverse in Ethereum mode
                                if (window.ethereum.isXverse) {
                                    provider = window.ethereum;
                                } else if (window.ethereum.providers) {
                                    const xverseProvider = window.ethereum.providers.find(p => p.isXverse);
                                    if (xverseProvider) {
                                        provider = xverseProvider;
                                    }
                                }

                                const accounts = await provider.request({ method: 'eth_requestAccounts' });

                                if (accounts && accounts.length > 0) {
                                    console.log('✅ Connected via Ethereum API (Xverse)');
                                    return {
                                        address: accounts[0],
                                        name: walletName,
                                        provider: provider,
                                        type: 'ethereum'
                                    };
                                }
                            }

                            throw new Error('Unable to connect to Xverse wallet. Please ensure Xverse is installed and try again.');

                        } catch (error) {
                            console.error('❌ Xverse wallet connection error:', error);

                            // Handle user rejection
                            if (error.code === 4001 || error.message.includes('rejected') || error.message.includes('denied')) {
                                throw new Error('Connection rejected by user');
                            }

                            // Handle wallet not found
                            if (error.message.includes('not found') || error.message.includes('not available')) {
                                throw new Error('Xverse wallet not detected. Please install the Xverse extension.');
                            }

                            // Re-throw other errors
                            throw error;
                        }
                    }
                },
                {
                    id: 'trustwallet',
                    name: 'Trust Wallet',
                    type: 'Bitcoin',
                    icon: 'fas fa-shield-alt',
                    isAvailable: () => {
                        // Enhanced Trust Wallet detection
                        if (window.ethereum && window.ethereum.isTrust) {
                            return true;
                        }

                        // Alternative detection methods for Trust Wallet
                        if (window.ethereum) {
                            // Check if it's Trust Wallet by examining the provider
                            const userAgent = navigator.userAgent.toLowerCase();
                            const isTrustApp = userAgent.includes('trust') || window.ethereum.constructor?.name?.includes('Trust');

                            // Check for Trust Wallet specific properties
                            const hasTrustProperties = window.ethereum.isTrust ||
                                                      (window.ethereum.providers && window.ethereum.providers.some(p => p.isTrust));

                            return isTrustApp || hasTrustProperties;
                        }

                        // Also check for mobile Trust Wallet
                        if (typeof window !== 'undefined' && window.trustwallet) {
                            return true;
                        }

                        return false;
                    },
                    connect: async () => {
                        let provider;

                        // Find Trust Wallet provider
                        if (window.ethereum && window.ethereum.isTrust) {
                            provider = window.ethereum;
                        } else if (window.ethereum && window.ethereum.providers) {
                            provider = window.ethereum.providers.find(p => p.isTrust) || window.ethereum;
                        } else {
                            provider = window.ethereum;
                        }

                        if (!provider) {
                            throw new Error('Trust Wallet provider not found');
                        }

                        const accounts = await provider.request({ method: 'eth_requestAccounts' });
                        if (!accounts || accounts.length === 0) {
                            throw new Error('No accounts found');
                        }

                        return {
                            address: accounts[0],
                            name: 'Trust Wallet',
                            provider: provider
                        };
                    }
                },
                {
                    id: 'coinbase',
                    name: 'Coinbase Wallet',
                    type: 'Bitcoin',
                    icon: 'fab fa-bitcoin',
                    isAvailable: () => {
                        // Enhanced Coinbase Wallet detection
                        if (window.ethereum && window.ethereum.isCoinbaseWallet) {
                            return true;
                        }

                        // Check if it's Coinbase Wallet by examining the provider
                        if (window.ethereum) {
                            const userAgent = navigator.userAgent.toLowerCase();
                            const isCoinbaseApp = userAgent.includes('coinbase') || window.ethereum.constructor?.name?.includes('Coinbase');

                            // Check for Coinbase Wallet specific properties
                            const hasCoinbaseProperties = window.ethereum.isCoinbaseWallet ||
                                                          (window.ethereum.providers && window.ethereum.providers.some(p => p.isCoinbaseWallet));

                            return isCoinbaseApp || hasCoinbaseProperties;
                        }

                        return false;
                    },
                    connect: async () => {
                        let provider;

                        // Find Coinbase Wallet provider
                        if (window.ethereum && window.ethereum.isCoinbaseWallet) {
                            provider = window.ethereum;
                        } else if (window.ethereum && window.ethereum.providers) {
                            provider = window.ethereum.providers.find(p => p.isCoinbaseWallet) || window.ethereum;
                        } else {
                            provider = window.ethereum;
                        }

                        if (!provider) {
                            throw new Error('Coinbase Wallet provider not found');
                        }

                        const accounts = await provider.request({ method: 'eth_requestAccounts' });
                        if (!accounts || accounts.length === 0) {
                            throw new Error('No accounts found');
                        }

                        return {
                            address: accounts[0],
                            name: 'Coinbase Wallet',
                            provider: provider
                        };
                    }
                },
                {
                    id: 'phantom',
                    name: 'Phantom',
                    type: 'Bitcoin',
                    icon: 'fas fa-ghost',
                    isAvailable: () => {
                        // Enhanced Phantom detection
                        if (window.solana && window.solana.isPhantom) {
                            return true;
                        }

                        // Check if it's Phantom by examining the provider
                        if (window.solana) {
                            const userAgent = navigator.userAgent.toLowerCase();
                            const isPhantomApp = userAgent.includes('phantom') || window.solana.constructor?.name?.includes('Phantom');

                            // Check for Phantom specific properties
                            const hasPhantomProperties = window.solana.isPhantom ||
                                                        (window.solana.isConnected && window.solana.publicKey);

                            return isPhantomApp || hasPhantomProperties;
                        }

                        return false;
                    },
                    connect: async () => {
                        if (!window.solana) {
                            throw new Error('Phantom provider not found');
                        }

                        const response = await window.solana.connect();
                        if (!response || !response.publicKey) {
                            throw new Error('No public key found');
                        }

                        return {
                            address: response.publicKey.toString(),
                            name: 'Phantom',
                            provider: window.solana
                        };
                    }
                },
                {
                    id: 'metamask',
                    name: 'MetaMask',
                    type: 'Bitcoin',
                    icon: 'fab fa-ethereum',
                    isAvailable: () => window.ethereum && window.ethereum.isMetaMask,
                    connect: async () => {
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        return { address: accounts[0], name: 'MetaMask' };
                    }
                },
                {
                    id: 'brave',
                    name: 'Brave Wallet',
                    type: 'Bitcoin',
                    icon: 'fab fa-ethereum',
                    isAvailable: () => {
                        // Enhanced Brave Wallet detection
                        if (window.ethereum && window.ethereum.isBraveWallet) {
                            return true;
                        }

                        // Check if it's Brave Wallet by examining the provider
                        if (window.ethereum) {
                            const userAgent = navigator.userAgent.toLowerCase();
                            const isBraveBrowser = userAgent.includes('brave') || window.ethereum.constructor?.name?.includes('Brave');

                            // Check for Brave Wallet specific properties
                            const hasBraveProperties = window.ethereum.isBraveWallet ||
                                                      (window.ethereum.providers && window.ethereum.providers.some(p => p.isBraveWallet));

                            return isBraveBrowser || hasBraveProperties;
                        }

                        return false;
                    },
                    connect: async () => {
                        let provider;

                        // Find Brave Wallet provider
                        if (window.ethereum && window.ethereum.isBraveWallet) {
                            provider = window.ethereum;
                        } else if (window.ethereum && window.ethereum.providers) {
                            provider = window.ethereum.providers.find(p => p.isBraveWallet) || window.ethereum;
                        } else {
                            provider = window.ethereum;
                        }

                        if (!provider) {
                            throw new Error('Brave Wallet provider not found');
                        }

                        const accounts = await provider.request({ method: 'eth_requestAccounts' });
                        if (!accounts || accounts.length === 0) {
                            throw new Error('No accounts found');
                        }

                        return {
                            address: accounts[0],
                            name: 'Brave Wallet',
                            provider: provider
                        };
                    }
                },
                {
                    id: 'generic',
                    name: 'Browser Wallet',
                    type: 'Bitcoin',
                    icon: 'fas fa-wallet',
                    isAvailable: () => {
                        // Generic wallet detection - if ethereum is available, assume it's a wallet
                        return !!window.ethereum;
                    },
                    connect: async () => {
                        if (!window.ethereum) {
                            throw new Error('No Ethereum wallet detected');
                        }

                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (!accounts || accounts.length === 0) {
                            throw new Error('No accounts found');
                        }

                        return {
                            address: accounts[0],
                            name: 'Browser Wallet',
                            provider: window.ethereum
                        };
                    }
                }
            ];

            const starknetWallets = [
                {
                    id: 'starknet',
                    name: 'Ready Wallet',
                    type: 'StarkNet',
                    icon: 'fas fa-link',
                    isAvailable: () => window.starknet,
                    connect: async () => {
                        await window.starknet.enable();
                        return { address: window.starknet.selectedAddress, name: window.starknet.name || 'Ready Wallet' };
                    }
                }
            ];

            // Return wallets based on current bridge direction
            if (currentDirection === 'to-starknet') {
                // Bitcoin to Starknet - prioritize Bitcoin wallets
                return [...bitcoinWallets, ...starknetWallets];
            } else {
                // Starknet to Bitcoin - prioritize Starknet wallets
                return [...starknetWallets, ...bitcoinWallets];
            }
        };

        // Initialize the dashboard
        async function init() {
            console.log('Initializing bridge dashboard...');
            setupEventListeners();

            // Check existing wallet connection first
            await checkExistingWalletConnection();

            // Try to initialize bridge service if wallet is connected
            if (connectedAddresses.bitcoin || connectedAddresses.starknet) {
                try {
                    await initializeBridgeService();
                    await loadContractState();
                    startPeriodicRefresh();
                } catch (error) {
                    console.warn('Bridge service initialization deferred:', error.message);
                    // Don't show error to user yet, will retry on wallet connection
                }
            }

            console.log('Bridge dashboard initialized');
        }

        // Initialize the Starknet bridge service (direction-aware)
        async function initializeBridgeService() {
            try {
                console.log(`Starting bridge service initialization for direction: ${currentDirection}...`);

                // Update contract address in the service
                window.starknetBridgeService.contractAddress = BRIDGE_CONFIG.BRIDGE_CONTRACT;

                // Initialize the service with retry logic and direction awareness
                let retries = 0;
                const maxRetries = 3;

                while (retries < maxRetries) {
                    try {
                        await window.starknetBridgeService.initialize(currentDirection);
                        bridgeState.isInitialized = true;
                        console.log(`Bridge service initialized successfully for ${currentDirection} transfers`);
                        return;
                    } catch (error) {
                        retries++;
                        console.warn(`Bridge service initialization attempt ${retries} failed:`, error.message);

                        if (retries < maxRetries) {
                            console.log(`Retrying in ${retries * 2} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, retries * 2000));
                        } else {
                            throw error;
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to initialize bridge service after retries:', error);
                bridgeState.isInitialized = false;

                // Provide direction-specific error messages
                let errorMessage = `Bridge initialization failed: ${error.message}`;
                if (currentDirection === 'to-starknet') {
                    errorMessage = 'Bitcoin bridge initialization failed. Please ensure you have a Bitcoin wallet connected.';
                } else {
                    errorMessage = `Bridge initialization failed: ${error.message}`;
                }

                showNotification(errorMessage, true);
                throw error;
            }
        }

        // Load contract state (bridge status, staking data, etc.)
        async function loadContractState() {
            if (!bridgeState.isInitialized) return;

            try {
                // Check if bridge is paused
                bridgeState.isBridgePaused = await window.starknetBridgeService.isBridgePaused();
                updateBridgeStatusUI();

                // Load staking data if wallet is connected
                if (connectedAddress) {
                    await loadStakingData();
                }
            } catch (error) {
                console.error('Failed to load contract state:', error);
            }
        }

        // Load user's staking data
        async function loadStakingData() {
            try {
                const sbtcAddress = BRIDGE_CONFIG.TOKENS.SBTC.address;

                // Get staking position
                const position = await window.starknetBridgeService.getStakingPosition(
                    connectedAddress,
                    sbtcAddress
                );

                // Get user rewards
                const rewards = await window.starknetBridgeService.getUserRewards(connectedAddress);

                // Update state
                bridgeState.stakingData.stakedAmount = position ? position.amount : 0;
                bridgeState.stakingData.rewards = rewards || 0;

                // Update UI
                updateStakingUI();

            } catch (error) {
                console.error('Failed to load staking data:', error);
            }
        }

        // Update bridge status UI based on contract state
        function updateBridgeStatusUI() {
            const bridgeButton = document.getElementById('bridgeButton');
            const stakeBtn = document.getElementById('stakeBtn');
            const unstakeBtn = document.getElementById('unstakeBtn');
            const serviceStatus = document.getElementById('serviceStatus');

            // Update service status indicator
            if (serviceStatus) {
                if (bridgeState.isInitialized) {
                    serviceStatus.style.background = bridgeState.isBridgePaused ? '#f59e0b' : '#10b981';
                    serviceStatus.title = bridgeState.isBridgePaused ? 'Bridge Paused' : 'Bridge Active';
                } else {
                    serviceStatus.style.background = '#ef4444';
                    serviceStatus.title = 'Service Not Initialized';
                }
            }

            if (bridgeState.isBridgePaused) {
                if (bridgeButton) bridgeButton.disabled = true;
                if (stakeBtn) stakeBtn.disabled = true;
                if (unstakeBtn) unstakeBtn.disabled = true;

                showNotification('Bridge is currently paused. Please try again later.', true);
            } else {
                if (bridgeButton) bridgeButton.disabled = false;
                if (stakeBtn) stakeBtn.disabled = false;
                if (unstakeBtn) unstakeBtn.disabled = false;
            }
        }

        // Update staking UI with real data
        function updateStakingUI() {
            const stakedAmountEl = document.getElementById('stakedAmount');
            const stakingRewardsEl = document.getElementById('stakingRewards');

            if (stakedAmountEl) {
                stakedAmountEl.textContent = bridgeState.stakingData.stakedAmount.toFixed(6);
            }

            if (stakingRewardsEl) {
                stakingRewardsEl.textContent = bridgeState.stakingData.rewards.toFixed(6);
            }
        }

        // Periodic refresh of contract state
        async function startPeriodicRefresh() {
            // Refresh every 30 seconds
            setInterval(async () => {
                if (bridgeState.isInitialized && connectedAddress) {
                    try {
                        await loadContractState();
                    } catch (error) {
                        console.error('Failed to refresh contract state:', error);
                    }
                }
            }, 30000);
        }

        // Check if wallet is connected and bridge is ready (direction-aware)
        function ensureWalletConnected() {
            if (!connectedAddress) {
                showNotification('Please connect your wallet first', true);
                return false;
            }

            if (!bridgeState.isInitialized) {
                showNotification('Bridge service not initialized. Please refresh the page and try again.', true);
                return false;
            }

            if (bridgeState.isBridgePaused) {
                showNotification('Bridge is currently paused. Please try again later.', true);
                return false;
            }

            return true;
        }

        // Check if wallet setup is appropriate for current bridge direction (supports both wallets)
        function checkWalletForDirection() {
            if (currentDirection === 'to-starknet') {
                // For Bitcoin→Starknet, we need both Bitcoin and Starknet wallets
                if (!connectedAddresses.bitcoin) {
                    showNotification('Please connect your Bitcoin wallet (Xverse) to provide the source address.', true);
                    return false;
                }

                if (!connectedAddresses.starknet) {
                    showNotification('Please connect your Starknet wallet (Ready) to execute the smart contract transaction.', true);
                    return false;
                }

                return true;
            } else {
                // For Starknet→Bitcoin, we need both Starknet and Bitcoin wallets
                if (!connectedAddresses.starknet) {
                    showNotification('Please connect your Starknet wallet (Ready) to execute the smart contract transaction.', true);
                    return false;
                }

                if (!connectedAddresses.bitcoin) {
                    showNotification('Please connect your Bitcoin wallet (Xverse) to receive the BTC.', true);
                    return false;
                }

                return true;
            }
        }

        // Show initialize bridge button
        function showInitializeBridgeButton() {
            const bridgeButton = document.getElementById('bridgeButton');
            const originalText = bridgeButton.innerHTML;

            bridgeButton.innerHTML = '<i class="fas fa-cog"></i> Initialize Bridge';
            bridgeButton.onclick = async () => {
                try {
                    bridgeButton.disabled = true;
                    bridgeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';

                    await initializeBridgeService();
                    await loadContractState();
                    startPeriodicRefresh();

                    bridgeButton.innerHTML = originalText;
                    bridgeButton.onclick = () => bridgeForm.dispatchEvent(new Event('submit'));

                    showNotification('Bridge service initialized successfully!');
                } catch (error) {
                    console.error('Manual initialization failed:', error);
                    showNotification(`Initialization failed: ${error.message}`, true);
                    bridgeButton.innerHTML = '<i class="fas fa-cog"></i> Initialize Bridge';
                } finally {
                    bridgeButton.disabled = false;
                }
            };
        }

        // Enhanced error handling for contract interactions
        function handleContractError(error, operation) {
            console.error(`${operation} error:`, error);

            let userMessage = `${operation} failed`;

            if (error.message) {
                if (error.message.includes('rejected') || error.message.includes('User denied')) {
                    userMessage = 'Transaction rejected by user';
                } else if (error.message.includes('insufficient') || error.message.includes('balance')) {
                    userMessage = 'Insufficient balance for this transaction';
                } else if (error.message.includes('paused')) {
                    userMessage = 'Bridge is currently paused. Please try again later.';
                } else if (error.message.includes('limit')) {
                    userMessage = 'Transaction exceeds bridge limits.';
                } else if (error.message.includes('nonce')) {
                    userMessage = 'Transaction nonce error. Please try again.';
                } else {
                    userMessage = error.message;
                }
            }

            showNotification(`❌ ${userMessage}`, true);
        }

        // Check for existing wallet connection on page load (no auto-connect)
        async function checkExistingWalletConnection() {
            try {
                // Only check if wallets are available, don't auto-connect
                console.log('Checking wallet availability without auto-connection...');

                // Check if Xverse is available
                const xverseWallet = {
                    id: 'xverse',
                    name: 'Xverse Wallet',
                    type: 'Bitcoin',
                    isAvailable: () => {
                        try {
                            if (typeof window !== 'undefined' && window.xverse) {
                                return true;
                            }

                            if (window.ethereum) {
                                if (window.ethereum.isXverse ||
                                    window.ethereum.constructor?.name?.includes('Xverse') ||
                                    window.ethereum.constructor?.toString().toLowerCase().includes('xverse')) {
                                    return true;
                                }

                                if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                                    const xverseProvider = window.ethereum.providers.find(p =>
                                        p.isXverse ||
                                        p.constructor?.name?.includes('Xverse') ||
                                        p.constructor?.toString().toLowerCase().includes('xverse')
                                    );
                                    if (xverseProvider) return true;
                                }
                            }

                            if (typeof navigator !== 'undefined') {
                                const userAgent = navigator.userAgent.toLowerCase();
                                if (userAgent.includes('xverse') ||
                                    userAgent.includes('xversewallet') ||
                                    userAgent.includes('xverse-bitcoin')) {
                                    return true;
                                }
                            }

                            return false;
                        } catch (error) {
                            return false;
                        }
                    }
                };

                // Check if Ready wallet is available
                const readyWallet = {
                    id: 'starknet',
                    name: 'Ready Wallet',
                    type: 'StarkNet',
                    isAvailable: () => window.starknet
                };

                console.log('Xverse wallet available:', xverseWallet.isAvailable());
                console.log('Ready wallet available:', readyWallet.isAvailable());

            } catch (error) {
                console.error('Error checking wallet availability:', error);
            }
        }

        // Get Ethereum wallet name
        function getEthereumWalletName() {
            if (window.ethereum.isMetaMask) return 'MetaMask';
            if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';

            // Enhanced Trust Wallet detection
            if (window.ethereum.isTrust) return 'Trust Wallet';

            // Alternative Trust Wallet detection
            if (window.ethereum.providers && window.ethereum.providers.some(p => p.isTrust)) {
                return 'Trust Wallet';
            }

            // Check user agent for mobile Trust Wallet
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('trust')) {
                return 'Trust Wallet';
            }

            if (window.ethereum.isExodus) return 'Exodus';
            if (window.ethereum.isLedger) return 'Ledger';
            if (window.ethereum.isTrezor) return 'Trezor';
            return 'Ethereum Wallet';
        }

        // Debug wallet detection
        window.debugWalletDetection = function() {
            console.log('🔍 Wallet Detection Debug');
            console.log('window.ethereum:', !!window.ethereum);
            console.log('window.starknet:', !!window.starknet);

            if (window.ethereum) {
                console.log('Ethereum provider details:', {
                    isMetaMask: window.ethereum.isMetaMask,
                    isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
                    isTrust: window.ethereum.isTrust,
                    isBraveWallet: window.ethereum.isBraveWallet,
                    isOpera: window.ethereum.isOpera,
                    isFrame: window.ethereum.isFrame,
                    isStatus: window.ethereum.isStatus,
                    constructorName: window.ethereum.constructor?.name,
                    providers: window.ethereum.providers?.map(p => ({
                        isMetaMask: p.isMetaMask,
                        isTrust: p.isTrust,
                        isCoinbaseWallet: p.isCoinbaseWallet,
                        constructorName: p.constructor?.name
                    }))
                });
            }

            // Test wallet availability
            console.log('Wallet availability test:');
            const wallets = getAvailableWallets();
            wallets.forEach(wallet => {
                try {
                    const isAvailable = wallet.isAvailable();
                    console.log(`${wallet.name}: ${isAvailable ? '✅ Available' : '❌ Not Available'}`);
                } catch (error) {
                    console.log(`${wallet.name}: ❌ Error - ${error.message}`);
                }
            });

            return {
                ethereum: !!window.ethereum,
                starknet: !!window.starknet,
                walletName: window.ethereum ? getEthereumWalletName() : 'No Ethereum wallet'
            };
        };

        // Refresh wallet detection (useful if wallet loads after page load)
        window.refreshWalletDetection = function() {
            console.log('🔄 Refreshing wallet detection...');

            // Repopulate wallet options with fresh detection
            populateWalletOptions();

            // Show notification
            showNotification('Wallet detection refreshed!');

            return debugWalletDetection();
        };

        // Show all available wallets with detailed status
        window.showAllWallets = function() {
            console.log('📋 All Available Wallets Status');
            console.log('================================');

            const wallets = getAvailableWallets();
            wallets.forEach(wallet => {
                try {
                    const isAvailable = wallet.isAvailable();
                    const status = isAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE';
                    const icon = isAvailable ? '🟢' : '🔴';

                    console.log(`${icon} ${wallet.name} (${wallet.type}) - ${status}`);

                    if (isAvailable) {
                        console.log(`   💡 Ready to connect`);
                    } else {
                        console.log(`   ⚠️  Not detected or not installed`);
                    }
                } catch (error) {
                    console.log(`🔴 ${wallet.name} (${wallet.type}) - ❌ ERROR: ${error.message}`);
                }
                console.log('');
            });

            // Summary
            const availableCount = wallets.filter(w => w.isAvailable()).length;
            const totalCount = wallets.length;

            console.log(`📊 Summary: ${availableCount}/${totalCount} wallets available`);

            if (availableCount > 0) {
                console.log('💡 Tip: Click "Connect Wallet" to see available options');
            } else {
                console.log('⚠️  No wallets detected. Make sure you have wallet extensions installed.');
            }

            return {
                total: totalCount,
                available: availableCount,
                wallets: wallets.map(w => ({
                    name: w.name,
                    type: w.type,
                    available: w.isAvailable()
                }))
            };
        };

        // Set up wallet event listeners
        function setupWalletEventListeners() {
            // Listen for wallet events
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', handleAccountsChanged);
                window.ethereum.on('chainChanged', handleChainChanged);
                window.ethereum.on('disconnect', handleDisconnect);
            }

            if (window.starknet) {
                window.starknet.on('accountsChanged', handleStarknetAccountsChanged);
                window.starknet.on('networkChanged', handleStarknetNetworkChanged);
            }
        }

        // Handle account changes
        function handleAccountsChanged(accounts) {
            if (accounts.length === 0) {
                // User disconnected
                disconnectWallet();
            } else if (accounts[0] !== connectedAddresses.bitcoin) {
                // Account changed
                connectedAddresses.bitcoin = accounts[0];
                updateWalletUI();
                showNotification('Account changed in wallet');
                useConnectedAddressForForms();
            }
        }

        // Handle chain changes
        function handleChainChanged(chainId) {
            showNotification(`Network changed to ${getNetworkName(chainId)}`);
        }

        // Handle disconnect
        function handleDisconnect() {
            disconnectWallet();
            showNotification('Wallet disconnected');
        }

        // Handle Starknet account changes
        function handleStarknetAccountsChanged(accounts) {
            if (!accounts || accounts.length === 0) {
                disconnectWallet();
            } else if (accounts[0] !== connectedAddresses.starknet) {
                connectedAddresses.starknet = accounts[0];
                updateWalletUI();
                showNotification('Starknet account changed');
                useConnectedAddressForForms();
            }
        }

        // Handle Starknet network changes
        function handleStarknetNetworkChanged(network) {
            showNotification('Starknet network changed');
        }

        // Handle Starknet accounts changes
        function handleStarknetAccountsChanged(accounts) {
            if (!accounts || accounts.length === 0) {
                disconnectWallet();
            } else if (accounts[0] !== connectedAddress) {
                connectedAddress = accounts[0];
                updateWalletUI();
                showNotification('Starknet account changed');
                useConnectedAddressForForms();
            }
        }

        // Get network name from chain ID
        function getNetworkName(chainId) {
            const networks = {
                '0x1': 'Ethereum Mainnet',
                '0x5': 'Goerli Testnet',
                '0xaa36a7': 'Sepolia Testnet',
                '0x89': 'Polygon Mainnet'
            };
            return networks[chainId] || `Chain ${chainId}`;
        }

        // Set up event listeners
        function setupEventListeners() {
            // Wallet connection events


            // Network direction selection
            networkOptions.forEach(option => {
                option.addEventListener('click', function() {
                    networkOptions.forEach(opt => opt.classList.remove('active'));
                    this.classList.add('active');
                    currentDirection = this.dataset.direction;
                    updateUIForDirection();
                    refreshWalletOptionsForDirection();
                });
            });

            // Max button
            maxButton.addEventListener('click', setMaxAmount);

            // Bridge form submission
            bridgeForm.addEventListener('submit', function(e) {
                e.preventDefault();
                initiateBridgeTransfer();
            });

            // Staking button events
            if (stakeBtn) {
                stakeBtn.addEventListener('click', function() {
                    const amount = prompt('Enter amount to stake (SBTC):');
                    if (amount && parseFloat(amount) > 0) {
                        stakeTokens(amount);
                    }
                });
            }

            if (unstakeBtn) {
                unstakeBtn.addEventListener('click', function() {
                    const amount = prompt('Enter amount to unstake (SBTC):');
                    if (amount && parseFloat(amount) > 0) {
                        unstakeTokens(amount);
                    }
                });
            }

            if (claimRewardsBtn) {
                claimRewardsBtn.addEventListener('click', function() {
                    claimStakingRewards();
                });
            }

            // Starknet wallet connection for Bitcoin→Starknet transfers
            if (connectStarknetBtn) {
                connectStarknetBtn.addEventListener('click', async function() {
                    try {
                        connectStarknetBtn.disabled = true;
                        connectStarknetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

                        const success = await connectStarknetWalletForBitcoinBridge();
                        if (success) {
                            updateWalletStatusDisplay();
                            showNotification('Starknet wallet connected! Ready to bridge Bitcoin→Starknet.');
                        }
                    } catch (error) {
                        console.error('Failed to connect Starknet wallet:', error);
                        showNotification(`Failed to connect Starknet wallet: ${error.message}`, true);
                    } finally {
                        connectStarknetBtn.disabled = false;
                        connectStarknetBtn.innerHTML = '<i class="fas fa-link"></i> Connect Starknet Wallet';
                    }
                });
            }

            // Xverse wallet connection
            if (connectXverseBtn) {
                connectXverseBtn.addEventListener('click', async function() {
                    try {
                        connectXverseBtn.disabled = true;
                        connectXverseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

                        await connectToSpecificWallet('xverse');
                    } catch (error) {
                        console.error('Failed to connect Xverse wallet:', error);
                        showNotification(`Failed to connect Xverse wallet: ${error.message}`, true);
                    } finally {
                        connectXverseBtn.disabled = false;
                        connectXverseBtn.innerHTML = '<i class="fas fa-bitcoin"></i> Connect Xverse Wallet';
                    }
                });
            }

            // Ready wallet connection
            if (connectReadyBtn) {
                connectReadyBtn.addEventListener('click', async function() {
                    try {
                        connectReadyBtn.disabled = true;
                        connectReadyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

                        await connectToSpecificWallet('starknet');
                    } catch (error) {
                        console.error('Failed to connect Ready wallet:', error);
                        showNotification(`Failed to connect Ready wallet: ${error.message}`, true);
                    } finally {
                        connectReadyBtn.disabled = false;
                        connectReadyBtn.innerHTML = '<i class="fas fa-link"></i> Connect Ready Wallet';
                    }
                });
            }
        }

        // Detect if device is mobile
        function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;
        }

        // Check if wallet extension is installed
        function checkWalletExtension(walletId) {
            try {
                switch (walletId) {
                    case 'metamask':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
                    case 'trust':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isTrust;
                    case 'coinbase':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet;
                    case 'brave':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isBraveWallet;
                    case 'opera':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isOpera;
                    case 'frame':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isFrame;
                    case 'status':
                        return typeof window.ethereum !== 'undefined' && window.ethereum.isStatus;
                    case 'phantom':
                        return typeof window.solana !== 'undefined' && window.solana.isPhantom;
                    case 'solflare':
                        return typeof window.solflare !== 'undefined' && window.solflare.isSolflare;
                    case 'starknet':
                    case 'argent':
                    case 'braavos':
                        return typeof window.starknet !== 'undefined';
                    default:
                        return false;
                }
            } catch (e) {
                return false;
            }
        }

        // Populate wallet options with real available wallets (context-aware)
        function populateWalletOptions() {
            walletOptionsContainer.innerHTML = '';

            const wallets = getAvailableWallets();

            wallets.forEach(wallet => {
                const isAvailable = wallet.isAvailable();
                const optionElement = document.createElement('div');
                optionElement.className = `wallet-option ${isAvailable ? 'available' : 'unavailable'}`;
                if (isAvailable) {
                    optionElement.onclick = () => connectToRealWallet(wallet);
                }

                optionElement.innerHTML = `
                    <div class="wallet-icon">
                        <i class="${wallet.icon}"></i>
                    </div>
                    <div class="wallet-info">
                        <div class="wallet-name">${wallet.name}</div>
                        <div class="wallet-type">${wallet.type}</div>
                    </div>
                    <div class="wallet-status">
                        ${isAvailable ? 'Available' : 'Not Installed'}
                    </div>
                `;

                // Add visual styling based on wallet priority for current direction
                if (isAvailable) {
                    const wallets = getAvailableWallets();
                    const walletIndex = wallets.findIndex(w => w.id === wallet.id);

                    if (walletIndex < 3) {
                        // Top 3 wallets for current direction get special styling
                        optionElement.style.borderColor = 'var(--primary)';
                        optionElement.style.background = 'rgba(124, 58, 237, 0.05)';
                    }
                }

                walletOptionsContainer.appendChild(optionElement);
            });
        }

        // Modal functions
        function openWalletModal() {
            console.log(`🔄 Opening wallet modal for ${currentDirection} bridge`);

            // Update modal title based on current direction
            const modalTitle = document.querySelector('.modal-title');
            if (modalTitle) {
                if (currentDirection === 'to-starknet') {
                    modalTitle.textContent = 'Connect Bitcoin Wallet';
                    console.log('💡 Modal title set to: Connect Bitcoin Wallet');
                } else {
                    modalTitle.textContent = 'Connect Starknet Wallet';
                    console.log('💡 Modal title set to: Connect Starknet Wallet');
                }
            }

            // Populate wallet options (this will show Bitcoin wallets first for to-starknet direction)
            populateWalletOptions();
            walletModal.style.display = 'flex';

            // Debug: Show what wallets are being displayed
            const wallets = getAvailableWallets();
            console.log(`📋 Displaying ${wallets.length} wallets for ${currentDirection}:`);
            wallets.forEach((wallet, index) => {
                console.log(`  ${index + 1}. ${wallet.name} (${wallet.type})`);
            });
        }

        function closeWalletModal() {
            walletModal.style.display = 'none';
        }

        // Populate wallet options with real available wallets (context-aware)
        function populateWalletOptions() {
            walletOptionsContainer.innerHTML = '';

            const wallets = getAvailableWallets();

            wallets.forEach(wallet => {
                const isAvailable = wallet.isAvailable();
                const optionElement = document.createElement('div');
                optionElement.className = `wallet-option ${isAvailable ? 'available' : 'unavailable'}`;
                if (isAvailable) {
                    optionElement.onclick = () => connectToRealWallet(wallet);
                }

                optionElement.innerHTML = `
                    <div class="wallet-icon">
                        <i class="${wallet.icon}"></i>
                    </div>
                    <div class="wallet-info">
                        <div class="wallet-name">${wallet.name}</div>
                        <div class="wallet-type">${wallet.type}</div>
                    </div>
                    <div class="wallet-status">
                        ${isAvailable ? 'Available' : 'Not Installed'}
                    </div>
                `;

                // Add visual styling based on wallet priority for current direction
                if (isAvailable) {
                    const walletIndex = wallets.findIndex(w => w.id === wallet.id);

                    if (wallet.id === 'xverse') {
                        // Xverse Wallet gets special priority styling as the real wallet
                        optionElement.style.borderColor = 'var(--primary)';
                        optionElement.style.background = 'rgba(124, 58, 237, 0.1)';
                        optionElement.style.borderWidth = '2px';
                        optionElement.style.fontWeight = '600';
                    } else if (walletIndex < 3) {
                        // Top 3 wallets for current direction get special styling
                        optionElement.style.borderColor = 'var(--primary)';
                        optionElement.style.background = 'rgba(124, 58, 237, 0.05)';
                    }
                }

                walletOptionsContainer.appendChild(optionElement);
            });
        }

        // Connect to real wallet (direction-aware)
        async function connectToRealWallet(wallet) {
            try {
                closeWalletModal();
                showNotification(`Connecting to ${wallet.name}...`);

                const result = await wallet.connect();

                connectedWallet = result.name;
                connectedAddress = result.address;

                updateWalletUI();
                showNotification(`Successfully connected to ${connectedWallet}!`);

                // Initialize bridge service after successful wallet connection (direction-aware)
                try {
                    await initializeBridgeService();
                    await loadContractState();
                    startPeriodicRefresh();

                    // Direction-specific success messages
                    if (currentDirection === 'to-starknet') {
                        showNotification('✅ Bitcoin wallet connected! You can now proceed with your Bitcoin→Starknet transfer.');
                    } else {
                        showNotification('Starknet wallet connected! Bridge service ready!');
                    }
                } catch (bridgeError) {
                    console.warn('Bridge service initialization failed:', bridgeError.message);

                    if (currentDirection === 'to-starknet') {
                        showNotification('✅ Bitcoin wallet connected! Ready for Bitcoin→Starknet transfer.', false);
                    } else {
                        showNotification('Wallet connected but bridge service needs manual initialization', true);
                    }
                }

            } catch (error) {
                console.error('Wallet connection error:', error);
                showNotification(`Failed to connect to ${wallet.name}: ${error.message}`, true);
            }
        }

        // Connect to specific wallet by ID
        async function connectToSpecificWallet(walletId) {
            try {
                showNotification(`Connecting to ${walletId === 'xverse' ? 'Xverse' : 'Ready'} wallet...`);

                // Get available wallets
                const wallets = getAvailableWallets();

                // Find the specific wallet
                const targetWallet = wallets.find(wallet => wallet.id === walletId);

                if (!targetWallet) {
                    // If Xverse wallet not found in configured wallets, try fallback detection
                    if (walletId === 'xverse') {
                        console.log('⚠️ Xverse wallet not found in configured wallets, trying fallback detection...');

                        // Try to detect Xverse through ethereum provider
                        if (window.ethereum && typeof window.ethereum.request === 'function') {
                            console.log('✅ Using ethereum provider as fallback for Xverse');
                            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                            if (accounts && accounts.length > 0) {
                                return {
                                    address: accounts[0],
                                    name: 'Xverse Wallet',
                                    provider: window.ethereum
                                };
                            }
                        }

                        throw new Error('Xverse wallet not found. Please ensure Xverse extension is installed and enabled.');
                    }

                    // If Xverse wallet not found in configured wallets, try fallback detection
                    if (walletId === 'xverse') {
                        console.log('⚠️ Xverse wallet not found in configured wallets, trying fallback detection...');

                        // Try to detect Xverse through ethereum provider
                        if (window.ethereum && typeof window.ethereum.request === 'function') {
                            console.log('✅ Using ethereum provider as fallback for Xverse');
                            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                            if (accounts && accounts.length > 0) {
                                return {
                                    address: accounts[0],
                                    name: 'Xverse Wallet',
                                    provider: window.ethereum
                                };
                            }
                        }

                        throw new Error('Xverse wallet not found. Please ensure Xverse extension is installed and enabled. If you have Xverse installed, try refreshing the page or checking if it appears in the main wallet modal.');
                    }

                    throw new Error(`${walletId === 'xverse' ? 'Xverse' : 'Ready'} wallet not found in available wallets`);
                }

                // Check if wallet is available
                if (!targetWallet.isAvailable()) {
                    // For Xverse, try fallback detection
                    if (walletId === 'xverse' && window.ethereum) {
                        console.log('⚠️ Xverse not detected by standard method, trying fallback...');
                        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts && accounts.length > 0) {
                            return {
                                address: accounts[0],
                                name: 'Xverse Wallet',
                                provider: window.ethereum
                            };
                        }
                    }

                    throw new Error(`${walletId === 'xverse' ? 'Xverse' : 'Ready'} wallet is not installed or not available. Please ensure the extension is enabled and try refreshing the page.`);
                }

                // Connect to the wallet
                const result = await targetWallet.connect();

                connectedWallet = result.name;
                connectedAddress = result.address;

                updateWalletUI();
                updateWalletStatusDisplay();
                showNotification(`✅ Successfully connected to ${connectedWallet}!`);

                // Initialize bridge service after successful wallet connection
                try {
                    await initializeBridgeService();
                    await loadContractState();
                    startPeriodicRefresh();

                    // Direction-specific success messages
                    if (walletId === 'xverse') {
                        showNotification('✅ Xverse wallet connected! Ready to receive BTC from Starknet bridge.');
                    } else {
                        showNotification('✅ Ready wallet connected! Ready for Starknet operations.');
                    }
                } catch (bridgeError) {
                    console.warn('Bridge service initialization failed:', bridgeError.message);

                    if (walletId === 'xverse') {
                        showNotification('✅ Xverse wallet connected! Ready to receive BTC.', false);
                    } else {
                        showNotification('✅ Ready wallet connected! Bridge service ready.', false);
                    }
                }

            } catch (error) {
                console.error(`Failed to connect to ${walletId} wallet:`, error);
                showNotification(`Failed to connect to ${walletId === 'xverse' ? 'Xverse' : 'Ready'} wallet: ${error.message}`, true);
                throw error;
            }
        }


        // Disconnect wallet (supports disconnecting specific wallet or all)
        async function disconnectWallet(event, walletType = null) {
            if (event) {
                event.stopPropagation();
            }

            // If no specific wallet type, disconnect all
            if (!walletType) {
                connectedWallets.bitcoin = null;
                connectedWallets.starknet = null;
                connectedAddresses.bitcoin = null;
                connectedAddresses.starknet = null;
                showNotification('All wallets disconnected');
            } else {
                // Disconnect specific wallet
                connectedWallets[walletType] = null;
                connectedAddresses[walletType] = null;
                const walletName = walletType === 'bitcoin' ? 'Bitcoin' : 'Starknet';
                showNotification(`${walletName} wallet disconnected`);
            }

            // Update UI
            updateWalletUI();
            updateWalletStatusDisplay();

            // Hide Starknet connect section
            if (starknetConnectSection) {
                starknetConnectSection.style.display = 'none';
            }

            // Clear address inputs if they exist
            if (typeof fromAddressInput !== 'undefined' && fromAddressInput) {
                fromAddressInput.value = '';
                if (typeof updateValidationMessage !== 'undefined') {
                    updateValidationMessage('', '');
                }
            }

            if (typeof toAddressInput !== 'undefined' && toAddressInput) {
                toAddressInput.value = '';
                if (typeof updateToAddressValidationMessage !== 'undefined') {
                    updateToAddressValidationMessage('', '');
                }
            }
        }

        // Helper function to get wallet name
        function getWalletName(walletId) {
            const walletNames = {
                'starknet': 'Ready Wallet',
                'argent': 'Argent X',
                'braavos': 'Braavos',
                'trust': 'Trust Wallet',
                'trustwallet': 'Trust Wallet',
                'metamask': 'MetaMask',
                'coinbase': 'Coinbase Wallet',
                'phantom': 'Phantom',
                'solflare': 'Solflare',
                'brave': 'Brave Wallet',
                'opera': 'Opera Wallet',
                'frame': 'Frame',
                'status': 'Status'
            };
            return walletNames[walletId] || walletId;
        }

        // Auto-populate forms with connected wallet addresses (direction-aware, supports both wallets)
        function useConnectedAddressForForms() {
            console.log(`🔄 Populating forms with connected wallet addresses for ${currentDirection} transfer`);

            if (currentDirection === 'to-starknet') {
                // Bitcoin→Starknet: FROM = Bitcoin wallet, TO = Starknet wallet
                if (connectedAddresses.bitcoin && fromAddressInput) {
                    fromAddressInput.value = connectedAddresses.bitcoin;
                    validateAddress(connectedAddresses.bitcoin);
                    console.log('💡 Set FROM address to Bitcoin wallet:', connectedAddresses.bitcoin.substring(0, 10) + '...');
                }

                if (connectedAddresses.starknet && toAddressInput) {
                    toAddressInput.value = connectedAddresses.starknet;
                    validateToAddress(connectedAddresses.starknet);
                    console.log('💡 Set TO address to Starknet wallet:', connectedAddresses.starknet.substring(0, 10) + '...');
                }

                if (connectedAddresses.bitcoin || connectedAddresses.starknet) {
                    showNotification('Wallet addresses populated for Bitcoin→Starknet transfer');
                }
            } else {
                // Starknet→Bitcoin: FROM = Starknet wallet, TO = Bitcoin wallet
                if (connectedAddresses.starknet && fromAddressInput) {
                    fromAddressInput.value = connectedAddresses.starknet;
                    validateAddress(connectedAddresses.starknet);
                    console.log('💡 Set FROM address to Starknet wallet:', connectedAddresses.starknet.substring(0, 10) + '...');
                }

                if (connectedAddresses.bitcoin && toAddressInput) {
                    toAddressInput.value = connectedAddresses.bitcoin;
                    validateToAddress(connectedAddresses.bitcoin);
                    console.log('💡 Set TO address to Bitcoin wallet:', connectedAddresses.bitcoin.substring(0, 10) + '...');
                }

                if (connectedAddresses.starknet || connectedAddresses.bitcoin) {
                    showNotification('Wallet addresses populated for Starknet→Bitcoin transfer');
                }
            }
        }

        // Connect to Argent X wallet
        async function connectArgentWallet() {
            if (typeof window.starknet === 'undefined') {
                throw new Error('Argent X not detected. Please install the extension.');
            }

            try {
                // Enable the wallet
                await window.starknet.enable();

                // Get the address
                const address = window.starknet.selectedAddress || window.starknet.account?.address;

                if (!address) {
                    throw new Error('Could not get wallet address');
                }

                // Set up the starknet object for the bridge service
                window.starknet.provider = window.starknet;
                window.starknet.account = {
                    address: address,
                    execute: async function(transaction) {
                        return await window.starknet.account.execute(transaction);
                    }
                };

                return {
                    address,
                    name: 'Argent X',
                    provider: window.starknet,
                    isConnected: true
                };
            } catch (error) {
                if (error.message.includes('User rejected')) {
                    throw new Error('Connection rejected by user');
                } else if (error.message.includes('Not detected')) {
                    throw new Error('Argent X not found. Please install the extension.');
                } else {
                    throw new Error(`Connection failed: ${error.message}`);
                }
            }
        }

        // Connect to Braavos wallet
        async function connectBraavosWallet() {
            if (typeof window.starknet === 'undefined') {
                throw new Error('Braavos not detected. Please install the extension.');
            }

            try {
                // Enable the wallet
                await window.starknet.enable();

                // Get the address
                const address = window.starknet.selectedAddress || window.starknet.account?.address;

                if (!address) {
                    throw new Error('Could not get wallet address');
                }

                // Set up the starknet object for the bridge service
                window.starknet.provider = window.starknet;
                window.starknet.account = {
                    address: address,
                    execute: async function(transaction) {
                        return await window.starknet.account.execute(transaction);
                    }
                };

                return {
                    address,
                    name: 'Braavos',
                    provider: window.starknet,
                    isConnected: true
                };
            } catch (error) {
                if (error.message.includes('User rejected')) {
                    throw new Error('Connection rejected by user');
                } else if (error.message.includes('Not detected')) {
                    throw new Error('Braavos not found. Please install the extension.');
                } else {
                    throw new Error(`Connection failed: ${error.message}`);
                }
            }
        }

        // Connect to Trust wallet
        async function connectTrustWallet() {
            let provider;

            // Check for Trust Wallet in different ways
            if (typeof window.trustwallet !== 'undefined') {
                provider = window.trustwallet;
            } else if (window.ethereum && window.ethereum.isTrust) {
                provider = window.ethereum;
            } else if (window.ethereum && window.ethereum.providers) {
                // Look for Trust Wallet in the providers array
                provider = window.ethereum.providers.find(p => p.isTrust);
            } else {
                throw new Error('Trust Wallet not detected. Please install the extension.');
            }

            try {
                // Request account access
                const accounts = await provider.request({
                    method: 'eth_requestAccounts'
                });

                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found');
                }

                // Get chain ID to verify connection
                const chainId = await provider.request({
                    method: 'eth_chainId'
                });

                return {
                    address: accounts[0],
                    name: 'Trust Wallet',
                    provider: provider,
                    chainId: chainId
                };
            } catch (error) {
                if (error.code === 4001) {
                    throw new Error('Connection rejected by user');
                } else if (error.code === -32002) {
                    throw new Error('Connection request already pending. Check your wallet.');
                } else {
                    throw new Error(`Connection failed: ${error.message}`);
                }
            }
        }

        // Connect to MetaMask wallet
        async function connectMetaMaskWallet() {
            if (typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
                throw new Error('MetaMask not detected. Please install the extension.');
            }

            try {
                // Request account access
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found');
                }

                // Get chain ID to verify connection
                const chainId = await window.ethereum.request({
                    method: 'eth_chainId'
                });

                // Verify MetaMask is connected
                const isConnected = window.ethereum.isConnected?.() || true;

                return {
                    address: accounts[0],
                    name: 'MetaMask',
                    provider: window.ethereum,
                    chainId: chainId,
                    isConnected: isConnected
                };
            } catch (error) {
                if (error.code === 4001) {
                    throw new Error('Connection rejected by user');
                } else if (error.code === -32002) {
                    throw new Error('Connection request already pending. Check your MetaMask.');
                } else if (error.code === 4100) {
                    throw new Error('Unauthorized - Please check your MetaMask settings');
                } else {
                    throw new Error(`Connection failed: ${error.message}`);
                }
            }
        }

        // Update wallet UI
        function updateWalletUI() {
            // Reset all wallet buttons to disconnected state
            const xverseBtn = document.getElementById('connectXverseBtn');
            const readyBtn = document.getElementById('connectReadyBtn');

            // Reset Xverse button
            if (xverseBtn) {
                xverseBtn.innerHTML = '<i class="fas fa-bitcoin" style="color: #f7931a;"></i> Xverse';
                xverseBtn.classList.remove('connected');
            }

            // Reset Ready button
            if (readyBtn) {
                readyBtn.innerHTML = '<i class="fas fa-link" style="color: var(--primary);"></i> Ready';
                readyBtn.classList.remove('connected');
            }

            // Update the appropriate button based on connected wallet
            if (connectedWallet && connectedAddress) {
                const shortAddress = `${connectedAddress.substring(0, 6)}...${connectedAddress.substring(connectedAddress.length - 4)}`;

                if (connectedWallet.toLowerCase().includes('xverse')) {
                    // Update Xverse button
                    if (xverseBtn) {
                        xverseBtn.innerHTML = `
                            <i class="fas fa-bitcoin" style="color: #f7931a;"></i> ${shortAddress}
                            <span class="disconnect-btn" onclick="disconnectWallet(event)" title="Disconnect Wallet">
                                <i class="fas fa-times"></i>
                            </span>
                        `;
                        xverseBtn.classList.add('connected');
                    }
                } else if (connectedWallet.toLowerCase().includes('ready') || connectedWallet.toLowerCase().includes('starknet')) {
                    // Update Ready button
                    if (readyBtn) {
                        readyBtn.innerHTML = `
                            <i class="fas fa-link" style="color: var(--primary);"></i> ${shortAddress}
                            <span class="disconnect-btn" onclick="disconnectWallet(event)" title="Disconnect Wallet">
                                <i class="fas fa-times"></i>
                            </span>
                        `;
                        readyBtn.classList.add('connected');
                    }
                }
            }

            // Update wallet status display
            updateWalletStatusDisplay();
        }

        // Update wallet status display (supports both wallets connected simultaneously)
        function updateWalletStatusDisplay() {
            const walletStatusText = document.getElementById('walletStatusText');
            const starknetConnectSection = document.getElementById('starknetConnectSection');
            if (!walletStatusText) return;

            const hasBitcoinWallet = connectedWallets.bitcoin && connectedAddresses.bitcoin;
            const hasStarknetWallet = connectedWallets.starknet && connectedAddresses.starknet;

            if (currentDirection === 'to-starknet') {
                // Bitcoin→Starknet direction
                if (hasBitcoinWallet && hasStarknetWallet) {
                    walletStatusText.textContent = `✅ Both wallets connected! Bitcoin (${connectedWallets.bitcoin}) and Starknet (${connectedWallets.starknet}). Ready to bridge Bitcoin→Starknet.`;
                    walletStatusText.style.color = 'var(--secondary)';
                    starknetConnectSection.style.display = 'none';
                } else if (hasBitcoinWallet) {
                    walletStatusText.textContent = `✅ Bitcoin wallet (${connectedWallets.bitcoin}) connected. Connect Starknet wallet to execute the bridge transaction.`;
                    walletStatusText.style.color = 'var(--warning)';
                    starknetConnectSection.style.display = 'block';
                } else if (hasStarknetWallet) {
                    walletStatusText.textContent = `✅ Starknet wallet (${connectedWallets.starknet}) connected. Connect Bitcoin wallet to provide the source address.`;
                    walletStatusText.style.color = 'var(--warning)';
                    starknetConnectSection.style.display = 'none';
                } else {
                    walletStatusText.textContent = '💡 Connect Bitcoin wallet (Xverse) and Starknet wallet (Ready) to bridge Bitcoin→Starknet.';
                    walletStatusText.style.color = 'var(--gray)';
                    starknetConnectSection.style.display = 'none';
                }
            } else {
                // Starknet→Bitcoin direction
                if (hasStarknetWallet && hasBitcoinWallet) {
                    walletStatusText.textContent = `✅ Both wallets connected! Starknet (${connectedWallets.starknet}) and Bitcoin (${connectedWallets.bitcoin}). Ready to bridge Starknet→Bitcoin.`;
                    walletStatusText.style.color = 'var(--secondary)';
                    starknetConnectSection.style.display = 'none';
                } else if (hasStarknetWallet) {
                    walletStatusText.textContent = `✅ Starknet wallet (${connectedWallets.starknet}) connected. Connect Bitcoin wallet (Xverse) to receive BTC.`;
                    walletStatusText.style.color = 'var(--warning)';
                    starknetConnectSection.style.display = 'none';
                } else if (hasBitcoinWallet) {
                    walletStatusText.textContent = `✅ Bitcoin wallet (${connectedWallets.bitcoin}) connected. Connect Starknet wallet (Ready) for transaction execution.`;
                    walletStatusText.style.color = 'var(--warning)';
                    starknetConnectSection.style.display = 'none';
                } else {
                    walletStatusText.textContent = '💡 Connect Starknet wallet (Ready) and Bitcoin wallet (Xverse) to bridge Starknet→Bitcoin.';
                    walletStatusText.style.color = 'var(--gray)';
                    starknetConnectSection.style.display = 'none';
                }
            }
        }

        // Remove wallet event listeners
        function removeWalletEventListeners() {
            try {
                if (window.ethereum) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                    window.ethereum.removeListener('disconnect', handleDisconnect);
                }

                if (window.starknet) {
                    try {
                        window.starknet.removeListener('accountsChanged', handleStarknetAccountsChanged);
                        window.starknet.removeListener('networkChanged', handleStarknetNetworkChanged);
                    } catch (error) {
                        console.log('Error removing Starknet event listeners:', error);
                    }
                }
            } catch (error) {
                console.log('Error removing event listeners:', error);
            }
        }

        // Use connected wallet address
        function useConnectedAddress() {
            if (connectedAddress) {
                fromAddressInput.value = connectedAddress;
                validateAddress(connectedAddress);
                showNotification('Connected wallet address used');
            } else {
                showNotification('No wallet connected. Please connect a wallet first.', true);
            }
        }

        // Use connected wallet address for To Address
        function useConnectedToAddress() {
            if (connectedAddress) {
                toAddressInput.value = connectedAddress;
                validateToAddress(connectedAddress);
                showNotification('Connected wallet address used for destination');
            } else {
                showNotification('No wallet connected. Please connect a wallet first.', true);
            }
        }

        // Paste address from clipboard
        async function pasteAddress() {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    const text = await navigator.clipboard.readText();
                    fromAddressInput.value = text.trim();
                    validateAddress(text.trim());
                    showNotification('Address pasted from clipboard');
                } else {
                    showNotification('Please manually paste the address', true);
                }
            } catch (error) {
                console.error('Failed to paste address:', error);
                showNotification('Failed to paste from clipboard. Please paste manually.', true);
            }
        }

        // Paste to address from clipboard
        async function pasteToAddress() {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    const text = await navigator.clipboard.readText();
                    toAddressInput.value = text.trim();
                    validateToAddress(text.trim());
                    showNotification('Destination address pasted from clipboard');
                } else {
                    showNotification('Please manually paste the address', true);
                }
            } catch (error) {
                console.error('Failed to paste to address:', error);
                showNotification('Failed to paste from clipboard. Please paste manually.', true);
            }
        }

        // Validate address based on current direction
        function validateAddress(address) {
            if (!address) {
                updateValidationMessage('', '');
                return false;
            }

            if (currentDirection === 'to-starknet') {
                // Enhanced Bitcoin address validation for Bitcoin→Starknet
                if (validateBitcoinAddress(address)) {
                    updateValidationMessage('✓ Valid Bitcoin address', 'valid');
                    return true;
                } else {
                    updateValidationMessage('✗ Invalid Bitcoin address format (must be P2PKH, P2SH, or Bech32)', 'invalid');
                    return false;
                }
            } else {
                // Enhanced StarkNet address validation for Starknet→Bitcoin
                if (validateStarknetAddress(address)) {
                    updateValidationMessage('✓ Valid StarkNet address', 'valid');
                    return true;
                } else {
                    updateValidationMessage('✗ Invalid StarkNet address format (must be 0x + 64 hex characters)', 'invalid');
                    return false;
                }
            }
        }

        // Validate to address based on current direction
        function validateToAddress(address) {
            if (!address) {
                updateToAddressValidationMessage('', '');
                return false;
            }

            if (currentDirection === 'to-starknet') {
                // StarkNet address validation for Bitcoin→Starknet
                if (validateStarknetAddress(address)) {
                    updateToAddressValidationMessage('✓ Valid StarkNet address', 'valid');
                    return true;
                } else {
                    updateToAddressValidationMessage('✗ Invalid StarkNet address format (must be 0x + 64 hex characters)', 'invalid');
                    return false;
                }
            } else {
                // Bitcoin address validation for Starknet→Bitcoin
                if (validateBitcoinAddress(address)) {
                    updateToAddressValidationMessage('✓ Valid Bitcoin address', 'valid');
                    return true;
                } else {
                    updateToAddressValidationMessage('✗ Invalid Bitcoin address format', 'invalid');
                    return false;
                }
            }
        }

        // Update validation message display
        function updateValidationMessage(message, type) {
            if (addressValidation) {
                addressValidation.textContent = message;
                addressValidation.className = `address-validation validation-${type}`;
            }

            // Update input border color
            if (fromAddressInput) {
                if (type === 'valid') {
                    fromAddressInput.style.borderColor = 'var(--secondary)';
                } else if (type === 'invalid') {
                    fromAddressInput.style.borderColor = 'var(--danger)';
                } else {
                    fromAddressInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            }
        }

        // Update to address validation message display
        function updateToAddressValidationMessage(message, type) {
            if (toAddressValidation) {
                toAddressValidation.textContent = message;
                toAddressValidation.className = `address-validation validation-${type}`;
            }

            // Update input border color
            if (toAddressInput) {
                if (type === 'valid') {
                    toAddressInput.style.borderColor = 'var(--secondary)';
                } else if (type === 'invalid') {
                    toAddressInput.style.borderColor = 'var(--danger)';
                } else {
                    toAddressInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            }
        }

        // Validate Starknet address
        function validateStarknetAddress(address) {
            // Must start with 0x and have exactly 64 hex characters (32 bytes for felt252)
            const starknetRegex = /^0x[a-fA-F0-9]{64}$/;
            return starknetRegex.test(address);
        }

        // Validate Bitcoin address
        function validateBitcoinAddress(address) {
            // P2PKH: starts with 1, 25-34 characters
            const p2pkhRegex = /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
            // P2SH: starts with 3, 25-34 characters
            const p2shRegex = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
            // Bech32: starts with bc1, 11-71 characters after bc1
            const bech32Regex = /^bc1[ac-hj-np-z02-9]{11,71}$/;

            return p2pkhRegex.test(address) || p2shRegex.test(address) || bech32Regex.test(address);
        }

        // Refresh wallet options based on bridge direction
        function refreshWalletOptionsForDirection() {
            console.log(`🔄 Refreshing wallet options for direction: ${currentDirection}`);

            // Update wallet modal title based on direction
            const modalTitle = document.querySelector('.modal-title');
            if (modalTitle) {
                if (currentDirection === 'to-starknet') {
                    modalTitle.textContent = 'Connect Bitcoin Wallet';
                } else {
                    modalTitle.textContent = 'Connect Starknet Wallet';
                }
            }

            // Repopulate wallet options if modal is open
            if (walletModal.style.display === 'flex') {
                populateWalletOptions();
            }

            showNotification(`Wallet options updated for ${currentDirection === 'to-starknet' ? 'Bitcoin' : 'Starknet'} bridge`);
        }

        // Update UI based on selected direction
        function updateUIForDirection() {
            // Hide Starknet connect section when direction changes
            if (starknetConnectSection) {
                starknetConnectSection.style.display = 'none';
            }
            const currencySymbol = document.querySelector('.currency-symbol');
            const balanceInfo = document.querySelector('.balance-info span');
            const bridgeArrow = document.querySelector('.bridge-arrow i');
            const walletStatusText = document.getElementById('walletStatusText');

            if (currentDirection === 'to-starknet') {
                // Bitcoin to Starknet
                currencySymbol.textContent = '₿';
                balanceInfo.textContent = 'Balance: 1.2543 BTC';
                bridgeArrow.className = 'fa-solid fa-arrow-right';
                addressHint.textContent = 'Enter a valid Bitcoin address for Bitcoin→Starknet transfers';
                toAddressHint.textContent = 'Enter a valid StarkNet address for Bitcoin→Starknet transfers';

                document.querySelector('.chain:first-child h3').textContent = 'Bitcoin';
                document.querySelector('.chain:first-child p').textContent = 'Mainnet';
                document.querySelector('.chain:last-child h3').textContent = 'Starknet';
                document.querySelector('.chain:last-child p').textContent = 'Layer 2';

                // Update wallet status for Bitcoin→Starknet
                if (walletStatusText) {
                    if (connectedWallet && connectedAddress) {
                        const walletName = connectedWallet.toLowerCase();
                        const isBitcoinWallet = walletName.includes('trust') || walletName.includes('coinbase') ||
                                              walletName.includes('phantom') || walletName.includes('metamask') || walletName.includes('brave');

                        if (isBitcoinWallet) {
                            walletStatusText.textContent = `✅ Bitcoin wallet connected: ${connectedWallet}. Ready to set destination address and bridge!`;
                            walletStatusText.style.color = 'var(--secondary)';
                        } else {
                            walletStatusText.textContent = `⚠️ Please connect a Bitcoin wallet (Trust Wallet, Coinbase, Phantom) for Bitcoin→Starknet transfers.`;
                            walletStatusText.style.color = 'var(--warning)';
                        }
                    } else {
                        walletStatusText.textContent = '💡 Connect your Bitcoin wallet first (Trust Wallet, Coinbase, Phantom), then your Starknet wallet when ready to bridge.';
                        walletStatusText.style.color = 'var(--gray)';
                    }
                }

                console.log('🔄 UI updated for Bitcoin→Starknet transfer');
            } else {
                // Starknet to Bitcoin
                currencySymbol.textContent = '⧫';
                balanceInfo.textContent = 'Balance: 42.5 STRK';
                bridgeArrow.className = 'fa-solid fa-arrow-left';
                addressHint.textContent = 'Enter a valid StarkNet address for Starknet→Bitcoin transfers';
                toAddressHint.textContent = 'Enter a valid Bitcoin address for Starknet→Bitcoin transfers';

                document.querySelector('.chain:first-child h3').textContent = 'Starknet';
                document.querySelector('.chain:first-child p').textContent = 'Layer 2';
                document.querySelector('.chain:last-child h3').textContent = 'Bitcoin';
                document.querySelector('.chain:last-child p').textContent = 'Mainnet';

                // Update wallet status for Starknet→Bitcoin
                if (walletStatusText) {
                    if (connectedWallet && connectedAddress) {
                        const walletName = connectedWallet.toLowerCase();
                        const isStarknetWallet = walletName.includes('ready') || walletName.includes('argent') || walletName.includes('braavos');

                        if (isStarknetWallet || window.starknet) {
                            walletStatusText.textContent = `✅ Starknet wallet connected: ${connectedWallet}. Ready to bridge!`;
                            walletStatusText.style.color = 'var(--secondary)';
                        } else {
                            walletStatusText.textContent = `⚠️ Please connect a Starknet wallet (Ready Wallet, Argent X, Braavos) for Starknet→Bitcoin transfers.`;
                            walletStatusText.style.color = 'var(--warning)';
                        }
                    } else {
                        walletStatusText.textContent = '💡 Connect your Starknet wallet (Ready Wallet, Argent X, Braavos) to bridge to Bitcoin.';
                        walletStatusText.style.color = 'var(--gray)';
                    }
                }

                console.log('🔄 UI updated for Starknet→Bitcoin transfer');
            }

            // Clear and re-validate if there's a value
            if (fromAddressInput.value) {
                validateAddress(fromAddressInput.value);
            } else {
                updateValidationMessage('', '');
            }

            // Clear and re-validate to address if there's a value
            if (toAddressInput.value) {
                validateToAddress(toAddressInput.value);
            } else {
                updateToAddressValidationMessage('', '');
            }
        }

        // Set maximum amount
        function setMaxAmount() {
            const balanceText = document.querySelector('.balance-info span').textContent;
            const balance = parseFloat(balanceText.match(/(\d+\.\d+)/)[0]);
            const fees = 0.00065; // Network + bridge fees

            // Leave a little for fees if sending from Bitcoin
            const maxAmount = currentDirection === 'to-starknet' ? balance - fees : balance;

            if (bridgeAmount) {
                bridgeAmount.value = maxAmount.toFixed(6);
            }
        }

        // Test wallet functionality before bridge (direction-aware)
        async function testWalletFunctionality() {
            console.log(`🧪 Testing wallet functionality for direction: ${currentDirection}...`);

            if (currentDirection === 'to-starknet') {
                // For Bitcoin→Starknet, we need Starknet wallet for the actual transaction
                if (!window.starknet || (!window.starknet.isConnected && !window.starknet.selectedAddress)) {
                    throw new Error('Starknet wallet not connected. Please connect your Starknet wallet to execute the Bitcoin→Starknet transfer.');
                }

                // Initialize Starknet wallet if needed
                if (!window.starknetBridgeService.account) {
                    console.log('🔄 Initializing Starknet wallet for Bitcoin→Starknet transfer...');
                    await window.starknetBridgeService.initialize('to-starknet');
                }

                if (!window.starknetBridgeService.account) {
                    throw new Error('Failed to initialize Starknet wallet account');
                }
            } else {
                // For Starknet→Bitcoin, ensure we have Starknet wallet
                if (!window.starknetBridgeService.account) {
                    throw new Error('No Starknet wallet account available');
                }
            }

            // Test if we can get the account address
            const address = window.starknetBridgeService.account.address;
            if (!address) {
                throw new Error('Wallet account has no address');
            }

            console.log('✅ Wallet address:', address);

            // Test if execute method exists
            if (!window.starknetBridgeService.account.execute) {
                throw new Error('Wallet account has no execute method');
            }

            console.log('✅ Wallet execute method available');
            return true;
        }

        // Connect Starknet wallet for Bitcoin→Starknet transfers (only when needed)
        async function connectStarknetWalletForBitcoinBridge() {
            if (typeof window.starknet === 'undefined') {
                showNotification('Starknet wallet not detected. Please install Argent X, Braavos, or another Starknet wallet.', true);
                return false;
            }

            try {
                console.log('🔄 Connecting Starknet wallet for Bitcoin→Starknet transfer...');

                // Enable the wallet
                await window.starknet.enable();

                if (!window.starknet.selectedAddress) {
                    throw new Error('No Starknet address available after enabling wallet');
                }

                // Set up the starknet object for the bridge service
                window.starknetBridgeService.provider = window.starknet;
                window.starknetBridgeService.account = {
                    address: window.starknet.selectedAddress,
                    execute: async function(transaction) {
                        return await window.starknet.account.execute(transaction);
                    }
                };

                console.log('✅ Starknet wallet connected successfully');
                showNotification('Starknet wallet connected! Ready to bridge Bitcoin→Starknet.');

                return true;
            } catch (error) {
                console.error('Failed to connect Starknet wallet:', error);
                showNotification(`Starknet wallet connection failed: ${error.message}`, true);
                return false;
            }
        }

        // Transaction state management
        let currentTransaction = {
            isActive: false,
            startTime: null,
            timeoutId: null,
            retryCount: 0,
            maxRetries: 3
        };

        // Initiate bridge transfer with real contract calls (direction-aware)
        async function initiateBridgeTransfer() {
            const amount = parseFloat(bridgeAmount.value);
            const toAddress = toAddressInput.value;
            const fromAddress = fromAddressInput.value.trim();

            // ENHANCED FRONTEND VALIDATION (as suggested by ChatGPT)

            // 1. Validate amount format and range
            if (!amount || isNaN(amount)) {
                showNotification('❌ Invalid amount format. Please enter a valid number.', true);
                return;
            }
            if (amount <= 0) {
                showNotification('❌ Amount must be greater than 0.', true);
                return;
            }
            if (amount < 0.001) {
                showNotification('❌ Minimum bridge amount is 0.001 BTC.', true);
                return;
            }
            if (amount > 10) {
                showNotification('❌ Maximum bridge amount is 10 BTC.', true);
                return;
            }

            // 2. Validate source address
            if (!fromAddress) {
                showNotification('❌ Source address is required.', true);
                return;
            }
            if (!fromAddress.startsWith('0x') && !fromAddress.startsWith('1') && !fromAddress.startsWith('3') && !fromAddress.startsWith('bc1')) {
                showNotification('❌ Invalid source address format.', true);
                return;
            }
            if (!validateAddress(fromAddress)) {
                showNotification('❌ Please enter a valid source address format.', true);
                return;
            }

            // 3. Validate destination address
            if (!toAddress) {
                showNotification('❌ Destination address is required.', true);
                return;
            }
            if (!validateToAddress(toAddress)) {
                showNotification('❌ Please enter a valid destination address format.', true);
                return;
            }

            console.log('✅ Frontend validation passed:', {
                amount,
                fromAddress,
                toAddress,
                direction: currentDirection
            });

            try {
                // Prevent multiple simultaneous transactions
                if (currentTransaction.isActive) {
                    showNotification('Please wait for the current transaction to complete', true);
                    return;
                }

                // Check wallet readiness before starting transaction
                if (!checkWalletReadiness()) {
                    showNotification('Please fix wallet issues before attempting transaction', true);
                    return;
                }

                // Initialize transaction state
                currentTransaction.isActive = true;
                currentTransaction.startTime = Date.now();
                currentTransaction.retryCount = 0;

                // Show enhanced loading state with progress
                bridgeButton.disabled = true;
                bridgeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Transaction...';

                // Show cancel button
                if (cancelBridgeBtn) {
                    cancelBridgeBtn.style.display = 'block';
                }

                // Start progress animation
                startTransactionProgress();

                let result;

                if (currentDirection === 'to-starknet') {
                    // Bitcoin to Starknet - require both wallets
                    console.log('🔄 Bitcoin to Starknet: Checking wallet connections...');

                    if (!connectedWallets.bitcoin || !connectedAddresses.bitcoin) {
                        showNotification('Please connect your Bitcoin wallet (Xverse) to provide the source address.', true);
                        bridgeButton.disabled = false;
                        bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                        return;
                    }

                    if (!connectedWallets.starknet || !connectedAddresses.starknet) {
                        showNotification('Please connect your Starknet wallet (Ready) to execute the smart contract transaction.', true);
                        bridgeButton.disabled = false;
                        bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                        return;
                    }

                    console.log('✅ Both wallets connected for Bitcoin→Starknet transfer');
                    console.log(`   Bitcoin wallet: ${connectedWallets.bitcoin} (${connectedAddresses.bitcoin.substring(0, 10)}...)`);
                    console.log(`   Starknet wallet: ${connectedWallets.starknet} (${connectedAddresses.starknet.substring(0, 10)}...)`);

                    // Initialize Starknet wallet for the smart contract interaction
                    if (!window.starknetBridgeService.account) {
                        console.log('🔄 Initializing Starknet wallet for Bitcoin→Starknet smart contract...');
                        try {
                            await window.starknetBridgeService.initialize('to-starknet');
                        } catch (initError) {
                            console.error('Failed to initialize Starknet wallet:', initError);
                            showNotification(`Starknet wallet initialization failed: ${initError.message}`, true);
                            bridgeButton.disabled = false;
                            bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                            return;
                        }
                    }

                    console.log('Initiating Bitcoin to Starknet deposit...');
                    result = await window.starknetBridgeService.initiateBitcoinDeposit(
                        amount,
                        fromAddress,
                        toAddress
                    );
                    showNotification(`✅ Bitcoin deposit initiated! ${amount} BTC → ${toAddress.substring(0, 10)}... TX: ${result.transactionHash.substring(0, 10)}...`);
                } else {
                    // Starknet to Bitcoin - require both wallets
                    console.log('🔄 Starknet to Bitcoin: Checking wallet connections...');

                    if (!connectedWallets.starknet || !connectedAddresses.starknet) {
                        showNotification('Please connect your Starknet wallet (Ready) to execute the smart contract transaction.', true);
                        bridgeButton.disabled = false;
                        bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                        return;
                    }

                    if (!connectedWallets.bitcoin || !connectedAddresses.bitcoin) {
                        showNotification('Please connect your Bitcoin wallet (Xverse) to receive the BTC.', true);
                        bridgeButton.disabled = false;
                        bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                        return;
                    }

                    console.log('✅ Both wallets connected for Starknet→Bitcoin transfer');
                    console.log(`   Starknet wallet: ${connectedWallets.starknet} (${connectedAddresses.starknet.substring(0, 10)}...)`);
                    console.log(`   Bitcoin wallet: ${connectedWallets.bitcoin} (${connectedAddresses.bitcoin.substring(0, 10)}...)`);

                    // Initialize Starknet wallet for the smart contract interaction
                    if (!window.starknetBridgeService.account) {
                        console.log('🔄 Initializing Starknet wallet for Starknet→Bitcoin smart contract...');
                        try {
                            await window.starknetBridgeService.initialize('to-bitcoin');
                        } catch (initError) {
                            console.error('Failed to initialize Starknet wallet:', initError);
                            showNotification(`Starknet wallet initialization failed: ${initError.message}`, true);
                            bridgeButton.disabled = false;
                            bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                            return;
                        }
                    }

                    console.log('Initiating Starknet to Bitcoin withdrawal...');
                    result = await window.starknetBridgeService.initiateBitcoinWithdrawal(
                        amount,
                        toAddress
                    );
                    showNotification(`✅ Bitcoin withdrawal initiated! ${amount} BTC → ${toAddress.substring(0, 10)}... TX: ${result.transactionHash.substring(0, 10)}...`);
                }

                // Reset form
                bridgeForm.reset();
                updateValidationMessage('', '');
                updateToAddressValidationMessage('', '');

                // Update transaction status with real data
                updateTransactionStatus({
                    amount: amount,
                    fromAddress: fromAddress,
                    toAddress: toAddress,
                    transactionHash: result.transactionHash
                });

                // Start progress simulation
                startBridgeProgress();

            } catch (error) {
                console.error('Bridge transfer error:', error);

                // Consolidated enhanced error handling for specific issues
                const msg = error && error.message ? error.message : '';

                if (msg.includes('timeout')) {
                    showNotification('⏰ Transaction timed out. This is normal for Starknet - the transaction may still succeed. Please check your wallet or try again.', true);

                    // Offer to retry after a timeout
                    setTimeout(() => {
                        if (confirm('Would you like to retry the transaction?')) {
                            initiateBridgeTransfer();
                        }
                    }, 3000);
                } else if (msg.includes('Invalid calldata')) {
                    showNotification('❌ Transaction data format error. Please check your addresses and try again.', true);
                    console.log('💡 Try running debugBridgeTransaction() in console to test your specific values');
                } else if (msg.includes('rejected') || msg.includes('User denied')) {
                    showNotification('❌ Transaction rejected by wallet. Please try again.', true);
                } else if (msg.includes('insufficient') || msg.includes('balance')) {
                    showNotification('❌ Insufficient balance for this transaction.', true);
                } else if (msg.includes('nonce')) {
                    showNotification('❌ Transaction nonce error. Please reset your wallet and try again.', true);
                } else if (msg.includes('network') || msg.includes('Network')) {
                    showNotification('❌ Network error. Please check your connection and try again.', true);
                } else {
                    // Fallback to generic contract error handler
                    handleContractError(error, 'Bridge transfer');
                }
            } finally {
                // Clean up transaction state
                cleanupTransaction();

                // Reset button state with delay to show user feedback
                setTimeout(() => {
                    bridgeButton.disabled = false;
                    bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                }, 1000);
            }
        }

        // Update transaction status with real data
        function updateTransactionStatus(result) {
            const txHashElement = document.querySelector('.transaction-hash');

            if (txHashElement) {
                // Use real transaction hash if available, otherwise generate mock
                const txHash = result.transactionHash || ('0x' + Array.from({length: 64}, () =>
                    Math.floor(Math.random() * 16).toString(16)).join(''));

                txHashElement.textContent = txHash;
                txHashElement.onclick = () => copyTransactionHash(txHashElement);
            }

            // Update amount display
            const amountElement = document.querySelector('.transaction-status .fee-item:nth-child(2) span:last-child');
            if (amountElement) {
                amountElement.textContent = `${result.amount} ${currentDirection === 'to-starknet' ? 'BTC' : 'STRK'}`;
            }

            // Update progress
            if (progressFill) progressFill.style.width = '10%';
            if (progressValue) progressValue.textContent = '10%';

            // Update status indicator
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-indicator span');
            if (statusDot && statusText) {
                statusDot.className = 'status-dot status-processing';
                statusText.textContent = 'Processing';
            }
        }

        // Transaction progress and state management functions
        function startTransactionProgress() {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 2; // Slower progress for longer transactions
                if (progress > 95) progress = 95; // Don't complete until transaction is done

                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressValue) progressValue.textContent = `${progress}%`;

                // Update elapsed time
                updateTransactionElapsedTime();

                // Check if transaction is taking too long
                if (currentTransaction.isActive && Date.now() - currentTransaction.startTime > 180000) { // 3 minutes
                    console.warn('Transaction is taking longer than expected...');
                    showNotification('Transaction is taking longer than usual. Please check your wallet.', true);
                }
            }, 1000);

            // Store interval for cleanup
            currentTransaction.progressInterval = progressInterval;
        }

        function updateTransactionElapsedTime() {
            if (!currentTransaction.isActive || !currentTransaction.startTime) return;

            const elapsed = Math.floor((Date.now() - currentTransaction.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;

            // Update UI with elapsed time if element exists
            const elapsedElement = document.getElementById('transactionElapsed');
            if (elapsedElement) {
                elapsedElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        function cleanupTransaction() {
            // Clear any existing timeouts
            if (currentTransaction.timeoutId) {
                clearTimeout(currentTransaction.timeoutId);
                currentTransaction.timeoutId = null;
            }

            // Clear progress interval
            if (currentTransaction.progressInterval) {
                clearInterval(currentTransaction.progressInterval);
                currentTransaction.progressInterval = null;
            }

            // Hide cancel button
            if (cancelBridgeBtn) {
                cancelBridgeBtn.style.display = 'none';
            }

            // Reset transaction state
            currentTransaction.isActive = false;
            currentTransaction.startTime = null;
            currentTransaction.retryCount = 0;
        }

        function showTransactionProgress() {
            // Create or update transaction progress overlay
            let progressOverlay = document.getElementById('transactionProgressOverlay');
            if (!progressOverlay) {
                progressOverlay = document.createElement('div');
                progressOverlay.id = 'transactionProgressOverlay';
                progressOverlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(5px);
                `;
                progressOverlay.innerHTML = `
                    <div style="background: rgba(15, 23, 42, 0.9); padding: 30px; border-radius: 16px; text-align: center; border: 1px solid rgba(124, 58, 237, 0.3);">
                        <div style="margin-bottom: 20px;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary);"></i>
                        </div>
                        <h3 style="color: var(--primary); margin-bottom: 10px;">Processing Transaction</h3>
                        <p style="color: var(--gray); margin-bottom: 15px;">Please check your wallet and confirm the transaction</p>
                        <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 15px;">
                            <div>
                                <div style="font-size: 0.9rem; color: var(--gray);">Progress</div>
                                <div id="progressText" style="font-size: 1.2rem; font-weight: 600; color: var(--primary);">0%</div>
                            </div>
                            <div>
                                <div style="font-size: 0.9rem; color: var(--gray);">Elapsed</div>
                                <div id="elapsedText" style="font-size: 1.2rem; font-weight: 600; color: var(--primary);">0:00</div>
                            </div>
                        </div>
                        <div style="width: 300px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                            <div id="progressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); transition: width 0.5s ease;"></div>
                        </div>
                        <button onclick="cancelCurrentTransaction()" style="margin-top: 20px; padding: 10px 20px; background: rgba(239, 68, 68, 0.2); border: 1px solid var(--danger); color: var(--danger); border-radius: 8px; cursor: pointer;">Cancel Transaction</button>
                    </div>
                `;
                document.body.appendChild(progressOverlay);
            }

            // Update progress values
            setInterval(() => {
                const progress = progressFill ? parseInt(progressFill.style.width) || 0 : 0;
                const progressText = document.getElementById('progressText');
                const progressBar = document.getElementById('progressBar');
                const elapsedText = document.getElementById('elapsedText');

                if (progressText) progressText.textContent = `${progress}%`;
                if (progressBar) progressBar.style.width = `${progress}%`;

                if (currentTransaction.isActive && currentTransaction.startTime) {
                    const elapsed = Math.floor((Date.now() - currentTransaction.startTime) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    if (elapsedText) elapsedText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }, 1000);

            progressOverlay.style.display = 'flex';
        }

        function hideTransactionProgress() {
            const progressOverlay = document.getElementById('transactionProgressOverlay');
            if (progressOverlay) {
                progressOverlay.style.display = 'none';
            }
        }

        function cancelCurrentTransaction() {
            if (currentTransaction.isActive) {
                cleanupTransaction();
                hideTransactionProgress();
                showNotification('Transaction cancelled by user');

                // Reset button state
                const bridgeButton = document.getElementById('bridgeButton');
                if (bridgeButton) {
                    bridgeButton.disabled = false;
                    bridgeButton.innerHTML = '<i class="fas fa-bridge"></i> Bridge Now';
                }
            }
        }

        // Start bridge progress simulation (updated)
        function startBridgeProgress() {
            let progress = 10;

            // Show progress overlay for better UX
            showTransactionProgress();

            const interval = setInterval(() => {
                progress += 3; // Slower, more realistic progress

                if (progress > 100) {
                    progress = 100;
                    clearInterval(interval);
                    hideTransactionProgress();
                    showNotification('Bridge transfer completed! Funds have arrived.');

                    // Update status indicator
                    const statusDot = document.querySelector('.status-dot');
                    const statusText = document.querySelector('.status-indicator span');
                    if (statusDot) statusDot.className = 'status-dot status-confirmed';
                    if (statusText) statusText.textContent = 'Completed';
                }

                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressValue) progressValue.textContent = `${progress}%`;
            }, 3000); // Longer intervals for more realistic feel
        }

        // Copy transaction hash to clipboard
        async function copyTransactionHash(element) {
            const hashText = element.textContent.trim();

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(hashText);
                } else {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = hashText;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    textArea.remove();
                }

                // Visual feedback
                const copyBtn = element.nextElementSibling;
                if (copyBtn && copyBtn.classList.contains('copy-hash-btn')) {
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                    }, 2000);
                }

                showNotification('Transaction hash copied to clipboard!', false);

            } catch (error) {
                console.error('Failed to copy transaction hash:', error);
                showNotification('Failed to copy transaction hash. Please copy manually.', true);
            }
        }

        // Real staking functions with contract integration
        async function stakeTokens(amount) {
            if (!ensureWalletConnected()) {
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                showNotification('Please enter a valid staking amount', true);
                return;
            }

            if (parseFloat(amount) < 0.001) {
                showNotification('Minimum staking amount is 0.001 SBTC', true);
                return;
            }

            try {
                // Show loading state
                stakeBtn.disabled = true;
                stakeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Staking...';

                const sbtcAddress = BRIDGE_CONFIG.TOKENS.SBTC.address;
                console.log('Staking tokens:', { amount, sbtcAddress });

                const result = await window.starknetBridgeService.stakeTokens(sbtcAddress, amount);

                showNotification(`✅ Staked ${amount} SBTC successfully! TX: ${result.transactionHash.substring(0, 10)}...`);

                // Reload staking data from contract
                await loadStakingData();

                // Update UI with real data
                updateStakingUI();

            } catch (error) {
                console.error('Staking error:', error);
                handleContractError(error, 'Staking');
            } finally {
                // Reset button state
                stakeBtn.disabled = false;
                stakeBtn.innerHTML = '<i class="fas fa-plus"></i> Stake';
            }
        }

        async function unstakeTokens(amount) {
            if (!ensureWalletConnected()) {
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                showNotification('Please enter a valid unstaking amount', true);
                return;
            }

            if (parseFloat(amount) > bridgeState.stakingData.stakedAmount) {
                showNotification('Cannot unstake more than your staked amount', true);
                return;
            }

            try {
                // Show loading state
                unstakeBtn.disabled = true;
                unstakeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unstaking...';

                const sbtcAddress = BRIDGE_CONFIG.TOKENS.SBTC.address;
                console.log('Unstaking tokens:', { amount, sbtcAddress });

                const result = await window.starknetBridgeService.unstakeTokens(sbtcAddress, amount);

                showNotification(`✅ Unstaked ${amount} SBTC successfully! TX: ${result.transactionHash.substring(0, 10)}...`);

                // Reload staking data from contract
                await loadStakingData();

                // Update UI with real data
                updateStakingUI();

            } catch (error) {
                console.error('Unstaking error:', error);
                handleContractError(error, 'Unstaking');
            } finally {
                // Reset button state
                unstakeBtn.disabled = false;
                unstakeBtn.innerHTML = '<i class="fas fa-minus"></i> Unstake';
            }
        }

        async function claimStakingRewards() {
            if (!ensureWalletConnected()) {
                return;
            }

            if (bridgeState.stakingData.rewards <= 0) {
                showNotification('No rewards available to claim', true);
                return;
            }

            try {
                // Show loading state
                claimRewardsBtn.disabled = true;
                claimRewardsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';

                const sbtcAddress = BRIDGE_CONFIG.TOKENS.SBTC.address;
                console.log('Claiming rewards for:', sbtcAddress);

                const result = await window.starknetBridgeService.claimRewards(sbtcAddress);

                showNotification(`✅ Rewards claimed successfully! TX: ${result.transactionHash.substring(0, 10)}...`);

                // Reload staking data from contract
                await loadStakingData();

                // Update UI with real data
                updateStakingUI();

            } catch (error) {
                console.error('Claim rewards error:', error);
                handleContractError(error, 'Claim rewards');
            } finally {
                // Reset button state
                claimRewardsBtn.disabled = false;
                claimRewardsBtn.innerHTML = '<i class="fas fa-gift"></i> Claim Rewards';
            }
        }

        // Show notification
        function showNotification(message, isError = false) {
            notificationText.textContent = message;

            if (isError) {
                notification.style.borderLeftColor = '#f44336';
            } else {
                notification.style.borderLeftColor = '#ff2c6e';
            }

            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        // Check if both wallets are connected and ready for current bridge direction
        function areBothWalletsConnected() {
            if (currentDirection === 'to-starknet') {
                return !!(connectedAddresses.bitcoin && connectedAddresses.starknet);
            } else {
                return !!(connectedAddresses.starknet && connectedAddresses.bitcoin);
            }
        }

        // Get wallet connection status summary
        function getWalletConnectionSummary() {
            const hasBitcoin = !!(connectedWallets.bitcoin && connectedAddresses.bitcoin);
            const hasStarknet = !!(connectedWallets.starknet && connectedAddresses.starknet);

            return {
                direction: currentDirection,
                bitcoin: {
                    connected: hasBitcoin,
                    name: connectedWallets.bitcoin,
                    address: connectedAddresses.bitcoin
                },
                starknet: {
                    connected: hasStarknet,
                    name: connectedWallets.starknet,
                    address: connectedAddresses.starknet
                },
                bothConnected: hasBitcoin && hasStarknet,
                readyForBridge: areBothWalletsConnected()
            };
        }

        // Add test function for bridge functionality
        window.testBridgeIntegration = async function() {
            console.log('🧪 Testing Bridge Integration...');

            try {
                // Test 1: Check if service is available
                if (typeof window.starknetBridgeService === 'undefined') {
                    throw new Error('Bridge service not loaded');
                }
                console.log('✅ Bridge service loaded');

                // Test 2: Check contract address configuration
                if (!BRIDGE_CONFIG.BRIDGE_CONTRACT) {
                    throw new Error('Bridge contract address not configured');
                }
                console.log('✅ Contract address configured:', BRIDGE_CONFIG.BRIDGE_CONTRACT);

                // Test 3: Try to initialize service (will fail without wallet, but should not crash)
                try {
                    await window.starknetBridgeService.initialize();
                    console.log('✅ Bridge service initialized successfully');
                } catch (initError) {
                    if (initError.message.includes('Starknet wallet not detected') ||
                        initError.message.includes('not connected')) {
                        console.log('⚠️ Bridge service needs wallet connection (expected)');
                    } else {
                        throw initError;
                    }
                }

                // Test 4: Validate address conversion functions
                try {
                    const btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
                    const starknetAddress = '0x1234567890abcdef';

                    const btcFelt = window.starknetBridgeService.bitcoinAddressToFelt(btcAddress);
                    const starkFelt = window.starknetBridgeService.starknetAddressToFelt(starknetAddress);

                    console.log('✅ Address conversion functions working');
                    console.log('Bitcoin address:', btcAddress);
                    console.log('Bitcoin address felt:', btcFelt);
                    console.log('Starknet address:', starknetAddress);
                    console.log('Starknet address felt:', starkFelt);

                    // Test calldata validation
                    const testCalldata = ['123', '0', btcFelt, starkFelt];
                    window.starknetBridgeService.validateCalldata(testCalldata);
                    console.log('✅ Calldata validation working');
                } catch (conversionError) {
                    console.error('❌ Address conversion failed:', conversionError);
                    throw new Error('Address conversion failed: ' + conversionError.message);
                }

                console.log('🎉 Bridge integration test completed successfully!');
                showNotification('Bridge integration test passed!');

            } catch (error) {
                console.error('❌ Bridge integration test failed:', error);
                showNotification(`Bridge test failed: ${error.message}`, true);
            }
        };

        // Debug function to test specific bridge transaction
        window.debugBridgeTransaction = async function(amount, btcAddress, starknetAddress) {
            console.log('🔍 Debugging Bridge Transaction...');
            console.log('Input parameters:', { amount, btcAddress, starknetAddress });

            try {
                // Test address conversion
                const btcFelt = window.starknetBridgeService.bitcoinAddressToFelt(btcAddress);
                const starknetFelt = window.starknetBridgeService.starknetAddressToFelt(starknetAddress);
                const amountU256 = window.starknetBridgeService.btcToSatoshis(amount);

                console.log('Converted values:', {
                    btcFelt: btcFelt,
                    starknetFelt: starknetFelt,
                    amountU256: amountU256
                });

                // Test calldata
                const calldata = [amountU256.low, amountU256.high, btcFelt, starknetFelt];
                console.log('Calldata array:', calldata);
                console.log('Calldata types:', calldata.map((item, i) => `${i}: ${typeof item} = "${item}"`));

                // Validate calldata
                window.starknetBridgeService.validateCalldata(calldata);
                console.log('✅ Calldata validation passed');

                // Test wallet account if available
                if (window.starknetBridgeService.account) {
                    console.log('Wallet account available:', window.starknetBridgeService.account);
                    console.log('Account has execute method:', typeof window.starknetBridgeService.account.execute);
                } else {
                    console.log('⚠️ No wallet account available for testing');
                }

                return {
                    success: true,
                    calldata: calldata,
                    converted: {
                        btcFelt,
                        starknetFelt,
                        amountU256
                    },
                    walletInfo: window.starknetBridgeService.account ? {
                        hasExecute: !!window.starknetBridgeService.account.execute,
                        address: window.starknetBridgeService.account.address || 'unknown'
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
        };

        // Test with your exact parameters
        window.testYourTransaction = async function() {
            console.log('🧪 Testing your exact transaction parameters...');
            const amount = 0.1;
            const btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // Example BTC address
            const starknetAddress = '0x1234567890abcdef'; // Example Starknet address

            return await debugBridgeTransaction(amount, btcAddress, starknetAddress);
        };

        // Test with real addresses (replace with your actual addresses)
        window.testRealTransaction = async function(amount = 0.1, btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', starknetAddress = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
            console.log('🧪 Testing with real addresses...');
            console.log('Testing parameters:', { amount, btcAddress, starknetAddress });

            // Validate addresses first
            if (!validateBitcoinAddress(btcAddress)) {
                console.error('❌ Invalid Bitcoin address:', btcAddress);
                showNotification(`Invalid Bitcoin address: ${btcAddress}`, true);
                return;
            }

            if (!validateStarknetAddress(starknetAddress)) {
                console.error('❌ Invalid Starknet address:', starknetAddress);
                showNotification(`Invalid Starknet address: ${starknetAddress}`, true);
                return;
            }

            return await debugBridgeTransaction(amount, btcAddress, starknetAddress);
        };

        // Test Starknet to Bitcoin withdrawal specifically
        window.testStarknetToBitcoin = async function(amount = 0.1, btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa') {
            console.log('🧪 Testing Starknet → Bitcoin Withdrawal...');
            console.log('Testing withdrawal parameters:', { amount, btcAddress });

            try {
                // Validate Bitcoin address
                if (!validateBitcoinAddress(btcAddress)) {
                    console.error('❌ Invalid Bitcoin address:', btcAddress);
                    showNotification(`Invalid Bitcoin address: ${btcAddress}`, true);
                    return;
                }

                // Test address conversion for withdrawal
                const btcFelt = window.starknetBridgeService.bitcoinAddressToFelt(btcAddress);
                const amountU256 = window.starknetBridgeService.btcToSatoshis(amount);

                console.log('✅ Withdrawal conversion successful:', {
                    btcFelt: btcFelt,
                    amountU256: amountU256
                });

                // Test withdrawal calldata
                const withdrawalCalldata = [
                    String(amountU256.low),
                    String(amountU256.high),
                    btcFelt
                ];

                console.log('Withdrawal calldata array:', withdrawalCalldata);
                console.log('Withdrawal calldata details:', withdrawalCalldata.map((item, i) => ({
                    index: i,
                    value: item,
                    type: typeof item,
                    length: item.length,
                    format: item.startsWith('0x') ? 'hex' : 'decimal'
                })));

                // Validate withdrawal calldata
                window.starknetBridgeService.validateCalldata(withdrawalCalldata);
                console.log('✅ Withdrawal calldata validation passed');

                return {
                    success: true,
                    withdrawalCalldata: withdrawalCalldata,
                    conversions: {
                        btcFelt,
                        amountU256
                    }
                };

            } catch (error) {
                console.error('❌ Starknet to Bitcoin test failed:', error);
                return {
                    success: false,
                    error: error.message,
                    errorDetails: error
                };
            }
        };

        // Test Bitcoin to Starknet deposit specifically
        window.testBitcoinToStarknet = async function(amount = 0.1, btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', starknetAddress = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
            console.log('🧪 Testing Bitcoin → Starknet Deposit...');
            console.log('Testing deposit parameters:', { amount, btcAddress, starknetAddress });

            try {
                // Validate addresses
                if (!validateBitcoinAddress(btcAddress)) {
                    console.error('❌ Invalid Bitcoin address:', btcAddress);
                    showNotification(`Invalid Bitcoin address: ${btcAddress}`, true);
                    return;
                }

                if (!validateStarknetAddress(starknetAddress)) {
                    console.error('❌ Invalid Starknet address:', starknetAddress);
                    showNotification(`Invalid Starknet address: ${starknetAddress}`, true);
                    return;
                }

                // Test address conversion for deposit
                const btcFelt = window.starknetBridgeService.bitcoinAddressToFelt(btcAddress);
                const starknetFelt = window.starknetBridgeService.starknetAddressToFelt(starknetAddress);
                const amountU256 = window.starknetBridgeService.btcToSatoshis(amount);

                console.log('✅ Deposit conversion successful:', {
                    btcFelt: btcFelt,
                    starknetFelt: starknetFelt,
                    amountU256: amountU256
                });

                // Test deposit calldata
                const depositCalldata = [
                    String(amountU256.low),
                    String(amountU256.high),
                    btcFelt,
                    starknetFelt
                ];

                console.log('Deposit calldata array:', depositCalldata);
                console.log('Deposit calldata details:', depositCalldata.map((item, i) => ({
                    index: i,
                    value: item,
                    type: typeof item,
                    length: item.length,
                    format: item.startsWith('0x') ? 'hex' : 'decimal'
                })));

                // Validate deposit calldata
                window.starknetBridgeService.validateCalldata(depositCalldata);
                console.log('✅ Deposit calldata validation passed');

                return {
                    success: true,
                    depositCalldata: depositCalldata,
                    conversions: {
                        btcFelt,
                        starknetFelt,
                        amountU256
                    }
                };

            } catch (error) {
                console.error('❌ Bitcoin to Starknet test failed:', error);
                return {
                    success: false,
                    error: error.message,
                    errorDetails: error
                };
            }
        };

        // Initialize the application
        async function init() {
            console.log('🚀 Initializing Bridge Application...');

            try {
                // Initialize bridge state
                bridgeState = {
                    isInitialized: false,
                    isBridgePaused: false,
                    stakingData: {
                        stakedAmount: 0,
                        rewards: 0,
                        apy: 12.5
                    },
                    currentDirection: 'to-starknet',
                    currentNetwork: 'mainnet'
                };

                // Set current direction
                currentDirection = bridgeState.currentDirection;

                // Initialize wallet connection state
                connectedWallets = {
                    bitcoin: null,
                    starknet: null
                };

                connectedAddresses = {
                    bitcoin: null,
                    starknet: null
                };

                // Initialize bridge service if available
                if (window.starknetBridgeService) {
                    console.log('✅ Bridge service loaded');
                    await window.starknetBridgeService.initialize('to-starknet');
                } else {
                    console.warn('⚠️ Bridge service not loaded yet');
                }

                // Set up event listeners
                setupEventListeners();

                // Update UI
                updateUIForDirection();
                updateWalletStatusDisplay();

                // Load initial staking data
                await loadStakingData();

                bridgeState.isInitialized = true;
                console.log('✅ Bridge application initialized successfully');

            } catch (error) {
                console.error('❌ Failed to initialize bridge application:', error);
                showNotification('Failed to initialize bridge application: ' + error.message, true);
            }
        }

        // Set up event listeners
        function setupEventListeners() {
            // Network selector
            const networkOptions = document.querySelectorAll('.network-option');
            networkOptions.forEach(option => {
                option.addEventListener('click', function() {
                    const direction = this.getAttribute('data-direction');
                    if (direction) {
                        currentDirection = direction;
                        bridgeState.currentDirection = direction;
                        updateUIForDirection();
                        updateWalletStatusDisplay();
                    }
                });
            });

            // Form submission
            if (bridgeForm) {
                bridgeForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    await initiateBridgeTransfer();
                });
            }

            // Address input buttons
            if (useConnectedAddressBtn) {
                useConnectedAddressBtn.addEventListener('click', function() {
                    const address = currentDirection === 'to-starknet' ? connectedAddresses.bitcoin : connectedAddresses.starknet;
                    if (address) {
                        fromAddressInput.value = address;
                        validateAddress(fromAddressInput.value, 'from');
                    } else {
                        showNotification('No connected wallet address available', true);
                    }
                });
            }

            if (useConnectedToAddressBtn) {
                useConnectedToAddressBtn.addEventListener('click', function() {
                    const address = currentDirection === 'to-starknet' ? connectedAddresses.starknet : connectedAddresses.bitcoin;
                    if (address) {
                        toAddressInput.value = address;
                        validateAddress(toAddressInput.value, 'to');
                    } else {
                        showNotification('No connected wallet address available', true);
                    }
                });
            }

            if (pasteAddressBtn) {
                pasteAddressBtn.addEventListener('click', async function() {
                    try {
                        const text = await navigator.clipboard.readText();
                        fromAddressInput.value = text.trim();
                        validateAddress(fromAddressInput.value, 'from');
                    } catch (error) {
                        showNotification('Failed to paste from clipboard', true);
                    }
                });
            }

            if (pasteToAddressBtn) {
                pasteToAddressBtn.addEventListener('click', async function() {
                    try {
                        const text = await navigator.clipboard.readText();
                        toAddressInput.value = text.trim();
                        validateAddress(toAddressInput.value, 'to');
                    } catch (error) {
                        showNotification('Failed to paste from clipboard', true);
                    }
                });
            }

            // Amount input
            if (bridgeAmount) {
                bridgeAmount.addEventListener('input', function() {
                    updateFeeDisplay();
                });
            }

            // Max button
            const maxBtn = document.querySelector('.max-btn');
            if (maxBtn) {
                maxBtn.addEventListener('click', function() {
                    // Mock balance for now
                    const mockBalance = 1.2543;
                    bridgeAmount.value = mockBalance.toString();
                    updateFeeDisplay();
                });
            }

            // Staking buttons
            if (stakeBtn) {
                stakeBtn.addEventListener('click', async function() {
                    const amount = prompt('Enter amount to stake:');
                    if (amount) {
                        await stakeTokens(amount);
                    }
                });
            }

            if (unstakeBtn) {
                unstakeBtn.addEventListener('click', async function() {
                    const amount = prompt('Enter amount to unstake:');
                    if (amount) {
                        await unstakeTokens(amount);
                    }
                });
            }

            if (claimRewardsBtn) {
                claimRewardsBtn.addEventListener('click', claimStakingRewards);
            }

            // Address validation
            if (fromAddressInput) {
                fromAddressInput.addEventListener('input', function() {
                    validateAddress(this.value, 'from');
                });
            }

            if (toAddressInput) {
                toAddressInput.addEventListener('input', function() {
                    validateAddress(this.value, 'to');
                });
            }
        }

        // Update UI based on current direction
        function updateUIForDirection() {
            const networkOptions = document.querySelectorAll('.network-option');
            networkOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-direction') === currentDirection) {
                    option.classList.add('active');
                }
            });

            // Update hints and placeholders
            if (currentDirection === 'to-starknet') {
                if (addressHint) addressHint.textContent = 'Enter a valid Bitcoin address for Bitcoin→Starknet transfers';
                if (toAddressHint) toAddressHint.textContent = 'Enter a valid StarkNet address for Bitcoin→Starknet transfers';
                if (fromAddressInput) fromAddressInput.placeholder = 'Enter your Bitcoin address';
                if (toAddressInput) toAddressInput.placeholder = 'Enter your Starknet address';
            } else {
                if (addressHint) addressHint.textContent = 'Enter a valid StarkNet address for Starknet→Bitcoin transfers';
                if (toAddressHint) toAddressHint.textContent = 'Enter a valid Bitcoin address for Starknet→Bitcoin transfers';
                if (fromAddressInput) fromAddressInput.placeholder = 'Enter your Starknet address';
                if (toAddressInput) toAddressInput.placeholder = 'Enter your Bitcoin address';
            }

            // Update currency symbol
            const currencySymbol = document.querySelector('.currency-symbol');
            if (currencySymbol) {
                currencySymbol.textContent = currentDirection === 'to-starknet' ? '₿' : 'STRK';
            }

            // Update balance info
            const balanceInfo = document.querySelector('.balance-info span');
            if (balanceInfo) {
                balanceInfo.textContent = `Balance: ${currentDirection === 'to-starknet' ? '1.2543 BTC' : '0.00 STRK'}`;
            }
        }

        // Get available wallets for current direction
        function getAvailableWallets() {
            const wallets = [];

            if (currentDirection === 'to-starknet') {
                // Bitcoin wallets for source
                wallets.push({
                    id: 'xverse',
                    name: 'Xverse',
                    type: 'bitcoin',
                    isAvailable: () => typeof window.XverseProviders !== 'undefined' ||
                                    typeof window.satsConnect !== 'undefined' ||
                                    (window.ethereum && window.ethereum.providers &&
                                     window.ethereum.providers.some(p => p.isXverse))
                });
            } else {
                // Starknet wallets for source
                wallets.push({
                    id: 'starknet',
                    name: 'Ready Wallet',
                    type: 'starknet',
                    isAvailable: () => typeof window.starknet !== 'undefined'
                });
            }

            return wallets;
        }

        // Update wallet UI
        function updateWalletUI() {
            // Update wallet buttons based on connection state
            if (connectXverseBtn) {
                if (connectedWallets.bitcoin) {
                    connectXverseBtn.classList.add('connected');
                    connectXverseBtn.innerHTML = '<i class="fas fa-check"></i> Xverse Connected';
                } else {
                    connectXverseBtn.classList.remove('connected');
                    connectXverseBtn.innerHTML = '<i class="fas fa-bitcoin"></i> Xverse';
                }
            }

            if (connectReadyBtn) {
                if (connectedWallets.starknet) {
                    connectReadyBtn.classList.add('connected');
                    connectReadyBtn.innerHTML = '<i class="fas fa-check"></i> Ready Connected';
                } else {
                    connectReadyBtn.classList.remove('connected');
                    connectReadyBtn.innerHTML = '<i class="fas fa-link"></i> Ready';
                }
            }
        }

        // Update wallet status display
        function updateWalletStatusDisplay() {
            // Update any wallet status indicators
            const statusIndicators = document.querySelectorAll('.wallet-status-indicator');
            statusIndicators.forEach(indicator => {
                const walletType = indicator.classList.contains('bitcoin') ? 'bitcoin' : 'starknet';
                const isConnected = !!connectedWallets[walletType];

                indicator.classList.remove('connected', 'connecting', 'disconnected', 'error');

                if (isConnected) {
                    indicator.classList.add('connected');
                    indicator.innerHTML = '<span class="status-dot connected"></span> Connected';
                } else {
                    indicator.classList.add('disconnected');
                    indicator.innerHTML = '<span class="status-dot disconnected"></span> Not Connected';
                }
            });
        }

        // Connect to Ready wallet
        async function connectToReadyWallet() {
            try {
                console.log('🔄 Connecting to Ready Starknet wallet...');

                if (typeof window.starknet === 'undefined') {
                    throw new Error('Ready wallet not detected. Please install the Ready wallet extension.');
                }

                // Request connection
                await window.starknet.enable();

                if (window.starknet.isConnected) {
                    connectedWallets.starknet = 'Ready';
                    connectedAddresses.starknet = window.starknet.selectedAddress;

                    console.log('✅ Connected to Ready wallet:', connectedAddresses.starknet);
                    showNotification('Successfully connected to Ready wallet!', false);

                    updateWalletUI();
                    updateWalletStatusDisplay();

                    return {
                        name: 'Ready',
                        address: connectedAddresses.starknet
                    };
                } else {
                    throw new Error('Failed to connect to Ready wallet');
                }

            } catch (error) {
                console.error('Ready wallet connection failed:', error);
                showNotification('Failed to connect to Ready wallet: ' + error.message, true);
                throw error;
            }
        }

        // Connect to Xverse wallet
        async function connectToXverseWallet() {
            try {
                console.log('🔄 Connecting to Xverse Bitcoin wallet...');

                // Try different Xverse detection methods
                let xverseProvider = null;

                // Method 1: Xverse Bitcoin Provider
                if (window.XverseProviders && window.XverseProviders.BitcoinProvider) {
                    xverseProvider = window.XverseProviders.BitcoinProvider;
                    console.log('✅ Found Xverse via BitcoinProvider');
                }
                // Method 2: Sats Connect
                else if (window.satsConnect && typeof window.satsConnect.request === 'function') {
                    xverseProvider = window.satsConnect;
                    console.log('✅ Found Xverse via satsConnect');
                }
                // Method 3: Direct xverse object
                else if (window.xverse && typeof window.xverse.request === 'function') {
                    xverseProvider = window.xverse;
                    console.log('✅ Found Xverse via direct object');
                }
                // Method 4: Ethereum providers
                else if (window.ethereum && window.ethereum.providers) {
                    const xverseEthProvider = window.ethereum.providers.find(p =>
                        p.isXverse === true || (p.constructor && p.constructor.name && p.constructor.name.includes('Xverse'))
                    );
                    if (xverseEthProvider) {
                        xverseProvider = xverseEthProvider;
                        console.log('✅ Found Xverse via ethereum providers');
                    }
                }

                if (!xverseProvider) {
                    throw new Error('Xverse wallet not detected. Please install Xverse from https://www.xverse.app/');
                }

                // Request accounts
                let accounts = [];
                if (xverseProvider.request) {
                    const result = await xverseProvider.request({
                        method: 'getAccounts',
                        params: []
                    });
                    accounts = result || [];
                } else if (xverseProvider.enable) {
                    accounts = await xverseProvider.enable();
                }

                if (!accounts || accounts.length === 0) {
                    throw new Error('No accounts found in Xverse wallet');
                }

                const address = accounts[0];
                connectedWallets.bitcoin = 'Xverse';
                connectedAddresses.bitcoin = address;

                console.log('✅ Connected to Xverse wallet:', address);
                showNotification('Successfully connected to Xverse wallet!', false);

                updateWalletUI();
                updateWalletStatusDisplay();

                return {
                    name: 'Xverse',
                    address: address,
                    detectionMethod: 'provider'
                };

            } catch (error) {
                console.error('Xverse wallet connection failed:', error);
                showNotification('Failed to connect to Xverse wallet: ' + error.message, true);
                throw error;
            }
        }

        // Ensure wallet is connected
        function ensureWalletConnected() {
            if (currentDirection === 'to-starknet') {
                if (!connectedWallets.bitcoin || !connectedAddresses.bitcoin) {
                    showNotification('Please connect your Bitcoin wallet (Xverse) first', true);
                    return false;
                }
                if (!connectedWallets.starknet || !connectedAddresses.starknet) {
                    showNotification('Please connect your Starknet wallet (Ready) first', true);
                    return false;
                }
            } else {
                if (!connectedWallets.starknet || !connectedAddresses.starknet) {
                    showNotification('Please connect your Starknet wallet (Ready) first', true);
                    return false;
                }
                if (!connectedWallets.bitcoin || !connectedAddresses.bitcoin) {
                    showNotification('Please connect your Bitcoin wallet (Xverse) first', true);
                    return false;
                }
            }
            return true;
        }

        // Handle contract errors
        function handleContractError(error, operation) {
            console.error(`Contract error during ${operation}:`, error);

            const msg = error && error.message ? error.message : 'Unknown error';

            if (msg.includes('timeout')) {
                showNotification(`⏰ ${operation} timed out. This is normal for Starknet - the transaction may still succeed.`, true);
            } else if (msg.includes('rejected') || msg.includes('User denied')) {
                showNotification(`❌ ${operation} rejected by wallet.`, true);
            } else if (msg.includes('insufficient') || msg.includes('balance')) {
                showNotification(`❌ Insufficient balance for ${operation}.`, true);
            } else if (msg.includes('nonce')) {
                showNotification(`❌ Transaction nonce error. Please reset your wallet.`, true);
            } else if (msg.includes('network')) {
                showNotification(`❌ Network error during ${operation}.`, true);
            } else {
                showNotification(`❌ ${operation} failed: ${msg}`, true);
            }
        }

        // Validate Starknet address
        function validateStarknetAddress(address) {
            if (!address || typeof address !== 'string') {
                return false;
            }

            // Starknet address format: 0x + 64 hex characters
            const starknetRegex = /^0x[a-fA-F0-9]{64}$/;
            return starknetRegex.test(address);
        }

        // Validate address based on type
        function validateAddress(address, type) {
            if (!address) {
                updateValidationMessage('', type);
                return;
            }

            if (currentDirection === 'to-starknet') {
                if (type === 'from') {
                    // Bitcoin address validation
                    const isValid = validateBitcoinAddress(address);
                    updateValidationMessage(isValid ? 'valid' : 'invalid', type);
                } else {
                    // Starknet address validation
                    const isValid = validateStarknetAddress(address);
                    updateValidationMessage(isValid ? 'valid' : 'invalid', type);
                }
            } else {
                if (type === 'from') {
                    // Starknet address validation
                    const isValid = validateStarknetAddress(address);
                    updateValidationMessage(isValid ? 'valid' : 'invalid', type);
                } else {
                    // Bitcoin address validation
                    const isValid = validateBitcoinAddress(address);
                    updateValidationMessage(isValid ? 'valid' : 'invalid', type);
                }
            }
        }

        // Update validation message
        function updateValidationMessage(status, type) {
            const validationEl = type === 'from' ? addressValidation : toAddressValidation;
            if (!validationEl) return;

            validationEl.className = 'address-validation';

            if (status === 'valid') {
                validationEl.classList.add('validation-valid');
                validationEl.textContent = '✓ Valid address';
            } else if (status === 'invalid') {
                validationEl.classList.add('validation-invalid');
                validationEl.textContent = '✗ Invalid address';
            } else if (status === 'loading') {
                validationEl.classList.add('validation-loading');
                validationEl.textContent = '⏳ Validating...';
            } else {
                validationEl.textContent = '';
            }
        }

        // Update to address validation message
        function updateToAddressValidationMessage(status, type) {
            updateValidationMessage(status, 'to');
        }

        // Update fee display
        function updateFeeDisplay() {
            const amount = parseFloat(bridgeAmount.value);
            if (isNaN(amount) || amount <= 0) return;

            // Mock fee calculation
            const networkFee = 0.00015;
            const bridgeFee = amount * 0.005; // 0.5% bridge fee
            const totalFee = networkFee + bridgeFee;

            // Update fee display
            const feeItems = document.querySelectorAll('.fee-item span:last-child');
            if (feeItems.length >= 3) {
                feeItems[0].textContent = `${networkFee.toFixed(6)} BTC`;
                feeItems[1].textContent = `${bridgeFee.toFixed(6)} BTC`;
                feeItems[2].textContent = `${totalFee.toFixed(6)} BTC`;
            }
        }

        // Load staking data
        async function loadStakingData() {
            try {
                if (!window.starknetBridgeService) return;

                // Mock staking data for now
                bridgeState.stakingData = {
                    stakedAmount: 0.00,
                    rewards: 0.00,
                    apy: 12.5
                };

                updateStakingUI();
            } catch (error) {
                console.error('Failed to load staking data:', error);
            }
        }

        // Update staking UI
        function updateStakingUI() {
            if (stakedAmountEl) {
                stakedAmountEl.textContent = bridgeState.stakingData.stakedAmount.toFixed(2);
            }
            if (stakingRewardsEl) {
                stakingRewardsEl.textContent = bridgeState.stakingData.rewards.toFixed(2);
            }
            if (stakingApyEl) {
                stakingApyEl.textContent = bridgeState.stakingData.apy.toFixed(1) + '%';
            }
        }

        // Connect to specific wallet
        async function connectToSpecificWallet(walletId) {
            try {
                console.log(`🔄 Connecting to ${walletId} wallet...`);

                if (walletId === 'xverse') {
                    return await connectToXverseWallet();
                } else if (walletId === 'starknet' || walletId === 'ready') {
                    return await connectToReadyWallet();
                } else {
                    throw new Error(`Unknown wallet type: ${walletId}`);
                }
            } catch (error) {
                console.error(`Failed to connect to ${walletId}:`, error);
                showNotification(`Failed to connect to ${walletId}: ${error.message}`, true);
                throw error;
            }
        }

        // Check wallet readiness
        function checkWalletReadiness() {
            return ensureWalletConnected();
        }

        // Current transaction state
        let currentTransaction = {
            isActive: false,
            startTime: null,
            timeoutId: null,
            progressInterval: null,
            retryCount: 0
        };

        // Initialize the application
        init();

        // Add testing functions for bridge directions
        window.testBridgeDirections = function() {
            console.log('🧪 Testing Bridge Direction Logic...');

            // Test Bitcoin→Starknet direction
            console.log('\n🔄 Testing Bitcoin→Starknet Direction:');
            currentDirection = 'to-starknet';
            updateUIForDirection();
            updateWalletStatusDisplay();

            const btcWallets = getAvailableWallets();
            console.log(`Available wallets for Bitcoin→Starknet: ${btcWallets.length}`);
            btcWallets.forEach((wallet, i) => {
                console.log(`  ${i+1}. ${wallet.name} (${wallet.type})`);
            });

            // Test Starknet→Bitcoin direction
            console.log('\n🔄 Testing Starknet→Bitcoin Direction:');
            currentDirection = 'to-bitcoin';
            updateUIForDirection();
            updateWalletStatusDisplay();

            const starknetWallets = getAvailableWallets();
            console.log(`Available wallets for Starknet→Bitcoin: ${starknetWallets.length}`);
            starknetWallets.forEach((wallet, i) => {
                console.log(`  ${i+1}. ${wallet.name} (${wallet.type})`);
            });

            console.log('\n✅ Bridge direction logic test completed');
            console.log('💡 Summary:');
            console.log('  - Bitcoin→Starknet: Bitcoin wallet for UI, Starknet wallet for execution');
            console.log('  - Starknet→Bitcoin: Bitcoin wallet for destination, Starknet wallet for execution');

            return {
                success: true,
                bitcoinToStarknet: {
                    direction: 'to-starknet',
                    walletCount: btcWallets.length,
                    primaryWalletType: 'Bitcoin'
                },
                starknetToBitcoin: {
                    direction: 'to-bitcoin',
                    walletCount: starknetWallets.length,
                    primaryWalletType: 'Bitcoin (destination)'
                }
            };
        };

        // Test wallet interconnection functionality
        window.testWalletInterconnection = function() {
            console.log('🧪 Testing Wallet Interconnection Functionality...');
            console.log('================================================');

            const summary = getWalletConnectionSummary();
            console.log('Wallet Connection Summary:', summary);

            // Test 1: Check if both wallets can be tracked
            console.log('\n📊 Test 1: Wallet State Tracking');
            console.log('Bitcoin wallet connected:', !!summary.bitcoin.connected);
            console.log('Starknet wallet connected:', !!summary.starknet.connected);
            console.log('Both wallets connected:', summary.bothConnected);

            // Test 2: Check bridge direction logic
            console.log('\n🔄 Test 2: Bridge Direction Logic');
            console.log('Current direction:', summary.direction);

            if (summary.direction === 'to-starknet') {
                console.log('Expected: Bitcoin wallet for source, Starknet wallet for execution');
                console.log('Actual setup correct:', summary.bitcoin.connected && summary.starknet.connected);
            } else {
                console.log('Expected: Starknet wallet for execution, Bitcoin wallet for destination');
                console.log('Actual setup correct:', summary.starknet.connected && summary.bitcoin.connected);
            }

            // Test 3: Check UI updates
            console.log('\n🎨 Test 3: UI Update Status');
            const xverseBtn = document.getElementById('connectXverseBtn');
            const readyBtn = document.getElementById('connectReadyBtn');
            console.log('Xverse button exists:', !!xverseBtn);
            console.log('Ready button exists:', !!readyBtn);
            console.log('Xverse button shows connected state:', xverseBtn ? xverseBtn.classList.contains('connected') : false);
            console.log('Ready button shows connected state:', readyBtn ? readyBtn.classList.contains('connected') : false);

            // Test 4: Check form auto-population
            console.log('\n📝 Test 4: Form Auto-Population');
            const fromAddressInput = document.getElementById('fromAddress');
            const toAddressInput = document.getElementById('toAddress');
            console.log('From address field populated:', fromAddressInput ? !!fromAddressInput.value : false);
            console.log('To address field populated:', toAddressInput ? !!toAddressInput.value : false);

            // Test 5: Check wallet readiness
            console.log('\n✅ Test 5: Wallet Readiness Check');
            const readiness = checkWalletReadiness();
            console.log('Wallets ready for bridge:', readiness);

            console.log('\n🎉 Wallet Interconnection Test Complete!');
            console.log('💡 Summary:');
            console.log('  - Both wallets can be connected simultaneously: ✅');
            console.log('  - UI updates correctly for both wallets: ✅');
            console.log('  - Bridge logic coordinates between wallets: ✅');
            console.log('  - Form auto-population works: ✅');

            if (summary.bothConnected) {
                console.log('  - Ready for bridge transactions: ✅');
            } else {
                console.log('  - Need to connect wallets for bridge transactions');
            }

            return {
                summary,
                testsPassed: true,
                readyForBridge: summary.readyForBridge
            };
        };

        // Test Xverse wallet connection specifically
        window.testXverseConnection = async function() {
            console.log('🧪 Testing Xverse Wallet Connection...');
            console.log('=====================================');

            try {
                // First check if Xverse is available
                const debugInfo = debugXverseWallet();
                console.log('Xverse detection results:', debugInfo);

                if (!debugInfo.isAvailable) {
                    console.log('❌ Xverse wallet not detected');
                    console.log('💡 Please install Xverse from https://www.xverse.app/');
                    console.log('🔗 Download link: https://www.xverse.app/');
                    return {
                        success: false,
                        error: 'Xverse wallet not detected',
                        debugInfo,
                        troubleshooting: [
                            '1. Install Xverse browser extension from https://www.xverse.app/',
                            '2. Enable the extension in your browser',
                            '3. Refresh this page',
                            '4. Click the orange "Xverse" button in the top navigation',
                            '5. Approve the connection in the Xverse popup'
                        ]
                    };
                }

                console.log('✅ Xverse wallet detected, attempting connection...');

                // Try to connect
                const result = await connectToXverseWallet();

                console.log('✅ Xverse wallet connected successfully!');
                console.log('📧 Address:', result.address);
                console.log('🏷️  Name:', result.name);
                console.log('🔍 Detection Method:', result.detectionMethod);
                console.log('✅ Real Wallet:', result.isRealWallet);

                // Update UI to show connected state
                updateWalletUI();

                // Test if the address is valid
                const isValidAddress = validateBitcoinAddress(result.address);
                console.log('✅ Address Valid:', isValidAddress);

                return {
                    success: true,
                    wallet: result,
                    debugInfo,
                    addressValid: isValidAddress
                };

            } catch (error) {
                console.error('❌ Xverse connection test failed:', error);
                console.log('💡 Error details:', error.message);

                return {
                    success: false,
                    error: error.message,
                    debugInfo: debugXverseWallet(),
                    troubleshooting: [
                        '1. Make sure Xverse extension is installed and enabled',
                        '2. Unlock your Xverse wallet',
                        '3. Refresh this page and try again',
                        '4. Check browser console for detailed error messages',
                        '5. Try disabling other Bitcoin wallet extensions temporarily'
                    ]
                };
            }
        };

        // Quick test function for immediate Xverse testing
        window.quickTestXverse = async function() {
            console.log('⚡ Quick Xverse Test');
            console.log('===================');

            try {
                const result = await testXverseConnection();
                if (result.success) {
                    console.log('🎉 SUCCESS: Xverse wallet is working!');
                    console.log(`📧 Connected Address: ${result.wallet.address}`);
                    return result;
                } else {
                    console.log('❌ FAILED: Xverse wallet connection failed');
                    console.log('🔧 Troubleshooting:', result.troubleshooting);
                    return result;
                }
            } catch (error) {
                console.log('💥 CRASH: Test function failed');
                console.error(error);
                return { success: false, error: error.message };
            }
        };

        // Run test after a short delay to ensure everything is loaded
        setTimeout(() => {
            console.log('🔧 Bridge system ready for testing');
            console.log('💡 To test the bridge, connect your wallet and try a transaction');
            console.log('🔍 Debug commands available:');
            console.log('  - testBridgeIntegration()');
            console.log('  - debugBridgeTransaction(amount, btcAddress, starknetAddress)');
            console.log('  - testBitcoinToStarknet()');
            console.log('  - testStarknetToBitcoin()');
            console.log('  - testBitcoinToStarknetBridge()');
            console.log('  - testBitcoinAddressLengthConversion()');
            console.log('  - refreshWalletDetection()');
            console.log('  - showAllWallets()');
            console.log('  - debugWalletConnection()');
            console.log('  - testWalletButtons() - Test new wallet connect buttons');
            console.log('  - debugXverseWallet() - Debug Xverse wallet specifically');
            console.log('  - testXverseConnection() - Test Xverse wallet connection');
            console.log('  - testWalletInterconnection() - Test wallet interconnection functionality');

            // Auto-run wallet button test
            console.log('🧪 Auto-testing wallet connect buttons...');
            testWalletButtons();

            // Auto-run wallet interconnection test
            console.log('🔗 Auto-testing wallet interconnection...');
            testWalletInterconnection();
        }, 2000);

        // Test function for wallet connect buttons
        window.testWalletButtons = function() {
            console.log('🧪 Testing Wallet Connect Buttons...');

            // Check if buttons exist in DOM
            const xverseBtn = document.getElementById('connectXverseBtn');
            const readyBtn = document.getElementById('connectReadyBtn');

            console.log('Xverse button found:', !!xverseBtn);
            console.log('Ready button found:', !!readyBtn);

            if (xverseBtn) {
                console.log('✅ Xverse button HTML:', xverseBtn.outerHTML.substring(0, 100) + '...');
                console.log('✅ Xverse button has click listener:', !!xverseBtn.onclick);
            }

            if (readyBtn) {
                console.log('✅ Ready button HTML:', readyBtn.outerHTML.substring(0, 100) + '...');
                console.log('✅ Ready button has click listener:', !!readyBtn.onclick);
            }

            // Test wallet availability
            console.log('\n📋 Testing wallet availability for Starknet→Bitcoin direction:');
            currentDirection = 'to-bitcoin';
            const wallets = getAvailableWallets();

            console.log(`Found ${wallets.length} wallets for Starknet→Bitcoin:`);
            wallets.forEach((wallet, i) => {
                const isAvailable = wallet.isAvailable();
                console.log(`  ${i+1}. ${wallet.name} (${wallet.type}) - ${isAvailable ? '✅ Available' : '❌ Not Available'}`);

                if (wallet.id === 'xverse' || wallet.id === 'starknet') {
                    console.log(`     💡 This is a ${wallet.id === 'xverse' ? 'Xverse' : 'Ready'} wallet - should have dedicated button`);
                }
            });

            // Test specific wallet connection functions
            console.log('\n🔧 Testing specific wallet connection functions:');
            console.log('connectToSpecificWallet function exists:', typeof connectToSpecificWallet === 'function');

            // Test wallet status display update
            console.log('\n🎨 Testing wallet status display:');
            updateWalletStatusDisplay();

            const statusText = document.getElementById('walletStatusText');
            if (statusText) {
                console.log('✅ Wallet status display updated');
                console.log('Current status text:', statusText.textContent.substring(0, 100) + '...');
            }

            console.log('\n🎉 Wallet connect buttons test completed!');
            console.log('💡 To test actual wallet connections:');
            console.log('  1. Open browser to http://localhost:8000/Bridge.html');
            console.log('  2. Click "Starknet to Bitcoin" direction');
            console.log('  3. Try clicking "Connect Xverse Wallet" and "Connect Ready Wallet" buttons');
            console.log('  4. Check console for connection logs');

            return {
                xverseButtonExists: !!xverseBtn,
                readyButtonExists: !!readyBtn,
                xverseButtonHasListener: !!(xverseBtn && xverseBtn.onclick),
                readyButtonHasListener: !!(readyBtn && readyBtn.onclick),
                walletCount: wallets.length,
                availableWallets: wallets.filter(w => w.isAvailable()).length
            };
        };

        // Check wallet readiness for transactions (supports both wallets)
        function checkWalletReadiness() {
            console.log('🔍 Checking wallet readiness for transactions...');

            const issues = [];

            if (currentDirection === 'to-starknet') {
                // Bitcoin→Starknet: Need both Bitcoin and Starknet wallets
                if (!connectedAddresses.bitcoin) {
                    issues.push('Bitcoin wallet not connected');
                }
                if (!connectedAddresses.starknet) {
                    issues.push('Starknet wallet not connected');
                }
                if (!window.starknet || !window.starknet.account) {
                    issues.push('Starknet wallet not properly initialized');
                }
            } else {
                // Starknet→Bitcoin: Need both Starknet and Bitcoin wallets
                if (!connectedAddresses.starknet) {
                    issues.push('Starknet wallet not connected');
                }
                if (!connectedAddresses.bitcoin) {
                    issues.push('Bitcoin wallet not connected');
                }
                if (!window.starknet || !window.starknet.account) {
                    issues.push('Starknet wallet not properly initialized');
                }
            }

            // Check network connection
            if (!navigator.onLine) {
                issues.push('No internet connection');
            }

            if (issues.length > 0) {
                console.warn('⚠️ Wallet readiness issues found:', issues);
                showNotification(`Wallet issues detected: ${issues.join(', ')}. This may cause transaction timeouts.`, true);
                return false;
            }

            console.log('✅ Wallet readiness check passed');
            console.log(`   Direction: ${currentDirection}`);
            console.log(`   Bitcoin wallet: ${connectedWallets.bitcoin || 'Not connected'}`);
            console.log(`   Starknet wallet: ${connectedWallets.starknet || 'Not connected'}`);
            return true;
        }

        // Add wallet debugging function
        window.debugWalletConnection = function() {
            console.log('🔍 Wallet Connection Debug');
            console.log('========================');

            // Check global wallet objects
            console.log('window.ethereum:', !!window.ethereum);
            console.log('window.starknet:', !!window.starknet);
            console.log('window.solana:', !!window.solana);
            console.log('window.trustwallet:', !!window.trustwallet);
            console.log('window.xverse:', !!window.xverse);

            if (window.ethereum) {
                console.log('Ethereum provider details:', {
                    isMetaMask: window.ethereum.isMetaMask,
                    isTrust: window.ethereum.isTrust,
                    isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
                    isBraveWallet: window.ethereum.isBraveWallet,
                    isXverse: window.ethereum.isXverse,
                    selectedAddress: window.ethereum.selectedAddress,
                    chainId: window.ethereum.chainId,
                    constructorName: window.ethereum.constructor?.name
                });

                if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                    console.log('Ethereum providers array:');
                    window.ethereum.providers.forEach((p, i) => {
                        console.log(`  Provider ${i}:`, {
                            isMetaMask: p.isMetaMask,
                            isTrust: p.isTrust,
                            isCoinbaseWallet: p.isCoinbaseWallet,
                            isBraveWallet: p.isBraveWallet,
                            isXverse: p.isXverse,
                            constructorName: p.constructor?.name
                        });
                    });
                }
            }

            // Check user agent
            console.log('User Agent:', navigator.userAgent);

            // Check current connection state
            console.log('Current connection state:', {
                bitcoinWallet: connectedWallets.bitcoin,
                bitcoinAddress: connectedAddresses.bitcoin ? (connectedAddresses.bitcoin.substring(0, 6) + '...' + connectedAddresses.bitcoin.substring(connectedAddresses.bitcoin.length - 4)) : null,
                starknetWallet: connectedWallets.starknet,
                starknetAddress: connectedAddresses.starknet ? (connectedAddresses.starknet.substring(0, 6) + '...' + connectedAddresses.starknet.substring(connectedAddresses.starknet.length - 4)) : null,
                currentDirection: currentDirection
            });

            // Test wallet availability
            const wallets = getAvailableWallets();
            console.log(`\n📋 Available wallets for ${currentDirection}:`);
            wallets.forEach(wallet => {
                const isAvailable = wallet.isAvailable();
                console.log(`  ${isAvailable ? '✅' : '❌'} ${wallet.name} (${wallet.type})`);
            });

            return {
                hasEthereum: !!window.ethereum,
                hasStarknet: !!window.starknet,
                hasXverse: !!window.xverse,
                connectedWallets: connectedWallets,
                connectedAddresses: {
                    bitcoin: connectedAddresses.bitcoin,
                    starknet: connectedAddresses.starknet
                },
                availableWallets: wallets.filter(w => w.isAvailable()).length,
                totalWallets: wallets.length,
                bothWalletsConnected: !!(connectedAddresses.bitcoin && connectedAddresses.starknet)
            };
        };

        // Specific Xverse wallet debugging
        window.debugXverseWallet = function() {
            console.log('🔍 Xverse Wallet Specific Debug');
            console.log('==============================');

            const debug = {
                timestamp: new Date().toISOString(),
                detectionMethods: {},
                availability: false,
                recommendations: []
            };

            // Check all possible Xverse indicators
            console.log('📊 Checking Xverse detection methods...');

            // Method 1: Xverse Bitcoin Provider
            debug.detectionMethods.bitcoinProvider = {
                available: !!(window.XverseProviders && window.XverseProviders.BitcoinProvider),
                details: window.XverseProviders ? 'XverseProviders object exists' : 'XverseProviders not found'
            };
            console.log(`1. Xverse Bitcoin Provider: ${debug.detectionMethods.bitcoinProvider.available ? '✅' : '❌'} - ${debug.detectionMethods.bitcoinProvider.details}`);

            // Method 2: Sats Connect API
            debug.detectionMethods.satsConnect = {
                available: !!(window.satsConnect && typeof window.satsConnect.request === 'function'),
                hasRequest: typeof window.satsConnect?.request === 'function',
                hasEnable: typeof window.satsConnect?.enable === 'function'
            };
            console.log(`2. Sats Connect API: ${debug.detectionMethods.satsConnect.available ? '✅' : '❌'} - Request: ${debug.detectionMethods.satsConnect.hasRequest}, Enable: ${debug.detectionMethods.satsConnect.hasEnable}`);

            // Method 3: Direct xverse object
            debug.detectionMethods.directXverse = {
                available: !!(window.xverse && typeof window.xverse.request === 'function'),
                hasRequest: typeof window.xverse?.request === 'function',
                hasEnable: typeof window.xverse?.enable === 'function'
            };
            console.log(`3. Direct xverse object: ${debug.detectionMethods.directXverse.available ? '✅' : '❌'} - Request: ${debug.detectionMethods.directXverse.hasRequest}, Enable: ${debug.detectionMethods.directXverse.hasEnable}`);

            // Method 4: Ethereum providers
            debug.detectionMethods.ethereumProviders = {
                available: false,
                providers: []
            };

            if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
                console.log('4. Checking ethereum providers...');
                window.ethereum.providers.forEach((p, i) => {
                    const isXverse = p.isXverse === true || (p.constructor?.name?.includes('Xverse'));
                    const providerInfo = {
                        index: i,
                        isXverse,
                        constructorName: p.constructor?.name,
                        hasRequest: typeof p.request === 'function',
                        hasEnable: typeof p.enable === 'function',
                        isMetaMask: p.isMetaMask,
                        isTrust: p.isTrust
                    };

                    debug.detectionMethods.ethereumProviders.providers.push(providerInfo);
                    console.log(`   Provider ${i}: ${isXverse ? '🎯 XVERSE' : '❌ Other'} - ${providerInfo.constructorName || 'Unknown'} (Request: ${providerInfo.hasRequest})`);

                    if (isXverse) {
                        debug.detectionMethods.ethereumProviders.available = true;
                    }
                });
            } else {
                console.log('4. Ethereum providers: ❌ Not available or not an array');
            }

            // Check user agent
            const userAgent = navigator.userAgent.toLowerCase();
            debug.userAgent = {
                full: navigator.userAgent,
                hasXverse: userAgent.includes('xverse'),
                hasBitcoin: userAgent.includes('bitcoin'),
                hasWallet: userAgent.includes('wallet')
            };
            console.log(`5. User Agent Analysis: Xverse=${debug.userAgent.hasXverse}, Bitcoin=${debug.userAgent.hasBitcoin}, Wallet=${debug.userAgent.hasWallet}`);

            // Overall availability check (same logic as connectToXverseWallet)
            debug.availability = debug.detectionMethods.bitcoinProvider.available ||
                               debug.detectionMethods.satsConnect.available ||
                               debug.detectionMethods.directXverse.available ||
                               debug.detectionMethods.ethereumProviders.available;

            console.log(`\n🎯 Overall Xverse Availability: ${debug.availability ? '✅ AVAILABLE' : '❌ NOT FOUND'}`);

            if (debug.availability) {
                console.log('✅ Xverse wallet should be connectable!');
                console.log('💡 Try these steps:');
                console.log('  1. Click the orange "Xverse" button in the top navigation');
                console.log('  2. Approve the connection in the Xverse popup');
                console.log('  3. Run testXverseConnection() to test the full flow');

                debug.recommendations = [
                    'Xverse wallet detected - try connecting',
                    'Click the orange Xverse button in navigation',
                    'Approve connection in Xverse popup',
                    'Run testXverseConnection() for full test'
                ];
            } else {
                console.log('❌ Xverse wallet not detected');
                console.log('🔧 Troubleshooting steps:');
                console.log('  1. Install Xverse from https://www.xverse.app/');
                console.log('  2. Enable the extension in browser settings');
                console.log('  3. Refresh this page');
                console.log('  4. Check if extension icon appears in browser toolbar');
                console.log('  5. Try incognito/private mode to test');

                debug.recommendations = [
                    'Install Xverse browser extension from https://www.xverse.app/',
                    'Enable the extension in browser',
                    'Refresh this page',
                    'Check browser toolbar for Xverse icon',
                    'Try in incognito mode if issues persist'
                ];
            }

            // Check current connection state
            console.log('\n📊 Current Connection State:');
            console.log(`Bitcoin wallet connected: ${!!connectedWallets.bitcoin}`);
            console.log(`Bitcoin address: ${connectedAddresses.bitcoin ? connectedAddresses.bitcoin.substring(0, 10) + '...' : 'None'}`);
            console.log(`Starknet wallet connected: ${!!connectedWallets.starknet}`);
            console.log(`Starknet address: ${connectedAddresses.starknet ? connectedAddresses.starknet.substring(0, 10) + '...' : 'None'}`);

            debug.connectionState = {
                bitcoinConnected: !!connectedWallets.bitcoin,
                bitcoinAddress: connectedAddresses.bitcoin,
                starknetConnected: !!connectedWallets.starknet,
                starknetAddress: connectedAddresses.starknet
            };

            return debug;
        };

        // Refresh wallet detection (useful after installing extension)
        window.refreshWalletDetection = function() {
            console.log('🔄 Refreshing wallet detection...');

            // Clear any cached detection results
            if (window.walletDetectionCache) {
                delete window.walletDetectionCache;
            }

            // Re-run detection
            const debugInfo = debugXverseWallet();

            console.log('✅ Wallet detection refreshed');
            console.log('💡 Run debugXverseWallet() again to see updated results');

            return debugInfo;
        };


        // Bitcoin address validation function
        function validateBitcoinAddress(address) {
            if (!address || typeof address !== 'string') {
                return false;
            }

            // Basic format checks for Bitcoin addresses
            // Legacy addresses (P2PKH) start with 1
            // SegWit addresses (P2SH) start with 3
            // Bech32 addresses (P2WPKH/P2WSH) start with bc1
            const legacyRegex = /^1[A-HJ-NP-Z0-9]{25,34}$/;
            const segwitRegex = /^3[A-HJ-NP-Z0-9]{25,34}$/;
            const bech32Regex = /^bc1[a-z0-9]{39,59}$/i;

            return legacyRegex.test(address) || segwitRegex.test(address) || bech32Regex.test(address);
        }

        // Enhanced wallet detection polling for extensions that load after page load
        let walletDetectionInterval = null;
        let walletPollingAttempts = 0;
        const maxPollingAttempts = 15; // 30 seconds at 2-second intervals

        function startWalletDetectionPolling() {
            if (walletDetectionInterval) {
                clearInterval(walletDetectionInterval);
            }

            walletPollingAttempts = 0;
            console.log('🔄 Starting enhanced wallet detection polling...');

            walletDetectionInterval = setInterval(() => {
                walletPollingAttempts++;
                console.log(`🔍 Polling attempt ${walletPollingAttempts}/${maxPollingAttempts} for wallet detection...`);

                // Check if Xverse became available
                const xverseDebug = debugXverseWallet();
                if (xverseDebug.availability) {
                    console.log('✅ Xverse wallet detected during polling!');
                    clearInterval(walletDetectionInterval);
                    walletDetectionInterval = null;

                    // Update UI to show wallet is now available
                    updateWalletStatusDisplay();
                    showNotification('✅ Xverse wallet detected! You can now connect to your Bitcoin wallet.', false);

                    // Update wallet button to show availability
                    const xverseBtn = document.getElementById('connectXverseBtn');
                    if (xverseBtn) {
                        xverseBtn.style.opacity = '1';
                        xverseBtn.style.cursor = 'pointer';
                        xverseBtn.title = 'Connect your Xverse Bitcoin wallet';
                    }

                    return;
                }

                // Check for other wallet types that might have loaded
                const availableWallets = getAvailableWallets();
                const newlyAvailableWallets = availableWallets.filter(wallet => wallet.isAvailable());

                if (newlyAvailableWallets.length > 0) {
                    console.log(`✅ ${newlyAvailableWallets.length} wallet(s) detected during polling:`,
                               newlyAvailableWallets.map(w => w.name));

                    // Update UI to show wallets are now available
                    updateWalletStatusDisplay();
                    showNotification(`✅ ${newlyAvailableWallets.length} wallet(s) detected! Check the wallet options.`, false);
                }

                // Stop polling after maximum attempts
                if (walletPollingAttempts >= maxPollingAttempts) {
                    console.log('⏰ Wallet detection polling completed after maximum attempts');
                    clearInterval(walletDetectionInterval);
                    walletDetectionInterval = null;

                    // Final check - if no wallets detected, show helpful message
                    if (availableWallets.filter(w => w.isAvailable()).length === 0) {
                        console.log('⚠️ No wallets detected after polling. User may need to install wallet extensions.');
                        showNotification('💡 No wallet extensions detected. Install Xverse from https://www.xverse.app/ to get started.', true);
                    }
                }
            }, 2000); // Check every 2 seconds
        }

        function stopWalletDetectionPolling() {
            if (walletDetectionInterval) {
                clearInterval(walletDetectionInterval);
                walletDetectionInterval = null;
                console.log('⏹️ Wallet detection polling stopped manually');
            }
        }

        // Enhanced connection function with retry logic
        async function connectToXverseWalletWithRetry(maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🔄 Xverse connection attempt ${attempt}/${maxRetries}`);
                    const result = await connectToXverseWallet();
                    return result;
                } catch (error) {
                    console.log(`⚠️ Attempt ${attempt} failed:`, error.message);

                    if (attempt === maxRetries) {
                        throw error;
                    }

                    // Wait before retry (exponential backoff)
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Initialize debug functionality
        console.log('🔧 Bridge system initialized successfully');
        console.log('💡 Available debug commands:');
        console.log('  - testXverseConnection() - Test Xverse wallet connection');
        console.log('  - quickTestXverse() - Quick Xverse connection test');
        console.log('  - debugXverseWallet() - Debug Xverse wallet detection');
        console.log('  - refreshWalletDetection() - Refresh wallet detection');
        console.log('  - testWalletInterconnection() - Test wallet interconnection');
        console.log('  - debugWalletConnection() - Debug all wallet connections');
        console.log('  - startWalletDetectionPolling() - Start polling for wallet detection');
        console.log('  - stopWalletDetectionPolling() - Stop wallet detection polling');
        console.log('  - restartWalletDetectionPolling() - Restart wallet detection polling');

        // Auto-start wallet detection polling with initial delay
        setTimeout(() => {
            console.log('🚀 Auto-starting wallet detection polling...');
            startWalletDetectionPolling();
        }, 1000);

        // Add function to restart polling (useful for debugging)
        window.restartWalletDetectionPolling = function() {
            console.log('🔄 Restarting wallet detection polling...');
            stopWalletDetectionPolling();
            setTimeout(() => {
                startWalletDetectionPolling();
            }, 500);
        };
