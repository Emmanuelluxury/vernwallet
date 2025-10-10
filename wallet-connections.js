// Wallet Connection Functions
// Provides connection methods for different wallet types

/**
 * Connect to Ready Wallet (Starknet)
 * @returns {Promise<Object>} Wallet connection info
 */
async function connectToReadyWallet() {
    try {
        if (!window.starknet) {
            throw new Error('Ready wallet not detected. Please install Argent X, Braavos, or another Starknet wallet.');
        }

        if (typeof window.starknet.enable !== 'function') {
            throw new Error('Starknet wallet does not support connection. Please update your wallet.');
        }

        console.log('🔄 Connecting to Starknet wallet...');

        // Enable the wallet
        await window.starknet.enable();

        if (!window.starknet.selectedAddress) {
            throw new Error('No Starknet address selected');
        }

        return {
            address: window.starknet.selectedAddress,
            name: 'Ready Wallet',
            provider: window.starknet,
            type: 'starknet'
        };

    } catch (error) {
        console.error('Ready wallet connection error:', error);

        if (error.message.includes('rejected') || error.code === 4001) {
            throw new Error('Wallet connection rejected by user');
        }

        throw error;
    }
}

/**
 * Connect to Xverse Wallet (Bitcoin) - Real implementation
 * @returns {Promise<Object>} Wallet connection info
 */
async function connectToXverseWallet() {
    const walletName = 'Xverse Wallet';

    try {
        // Check if Sats Connect is available and has request method
        if (window.satsConnect && typeof window.satsConnect.request === 'function') {
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
                    provider: window.satsConnect,
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
        if (window.unisat && typeof window.unisat.requestAccounts === 'function') {
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
        if (window.ethereum && typeof window.ethereum.request === 'function') {
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

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        connectToReadyWallet,
        connectToXverseWallet
    };
}