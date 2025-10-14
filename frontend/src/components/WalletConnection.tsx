'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
    starknet: any;
    ethereum: any;
  }
}

interface WalletConnectionProps {
  isConnected: boolean;
  walletAddress: string;
  onConnected: (address: string) => void;
  onDisconnected: () => void;
}

export default function WalletConnection({
  isConnected,
  walletAddress,
  onConnected,
  onDisconnected
}: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Listen for wallet events
    if (window.vernWalletIntegration) {
      window.vernWalletIntegration.on('walletConnected', (data: any) => {
        onConnected(data.address);
        setIsConnecting(false);
        setError('');
      });

      window.vernWalletIntegration.on('walletDisconnected', () => {
        onDisconnected();
        setIsConnecting(false);
        setError('');
      });

      window.vernWalletIntegration.on('error', (error: any) => {
        setError(error.message || 'Connection failed');
        setIsConnecting(false);
      });
    }
  }, [onConnected, onDisconnected]);

  const connectWallet = async () => {
    if (!window.vernWalletIntegration) {
      setError('VernWallet integration not loaded');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log('🔍 Starting wallet connection process...');

      // Priority 1: Check if Braavos is already active
      if (window.starknet) {
        const isBraavos = window.starknet.id === 'braavos' ||
                          window.starknet.name === 'Braavos' ||
                          window.starknet.name?.toLowerCase().includes('braavos') ||
                          window.starknet.isBraavos === true ||
                          window.starknet.constructor?.name === 'BraavosWallet' ||
                          window.starknet.constructor?.name?.includes('Braavos') ||
                          window.starknet.constructor?.toString().toLowerCase().includes('braavos');

        if (isBraavos) {
          console.log('✅ Braavos already active, connecting...');
          await window.vernWalletIntegration.connectStarknetWallet('braavos');
          return;
        }
      }

      // Priority 2: Check starknet.providers for Braavos (most common location)
      if (window.starknet && window.starknet.providers && Array.isArray(window.starknet.providers)) {
        console.log('🔍 Checking starknet.providers for Braavos...');
        const braavosProvider = window.starknet.providers.find((p: any) =>
          p.id === 'braavos' ||
          p.name === 'Braavos' ||
          p.name?.toLowerCase().includes('braavos') ||
          p.isBraavos === true ||
          p.constructor?.name === 'BraavosWallet' ||
          p.constructor?.name?.includes('Braavos') ||
          p.constructor?.toString().toLowerCase().includes('braavos')
        );

        if (braavosProvider) {
          console.log('✅ Found Braavos in starknet.providers, switching and connecting...');
          const originalProvider = window.starknet;
          window.starknet = braavosProvider;
          try {
            await window.vernWalletIntegration.connectStarknetWallet('braavos');
            return;
          } catch (switchError) {
            console.warn('Braavos provider switch failed, restoring original:', switchError);
            window.starknet = originalProvider;
            throw switchError;
          }
        }
      }

      // Priority 3: Check ethereum.providers for Braavos
      if (window.ethereum && window.ethereum.providers) {
        console.log('🔍 Checking ethereum.providers for Braavos...');
        const braavosProvider = window.ethereum.providers.find((p: any) =>
          p.id === 'braavos' ||
          p.name === 'Braavos' ||
          p.name?.toLowerCase().includes('braavos') ||
          p.isBraavos === true ||
          p.constructor?.name === 'BraavosWallet' ||
          p.constructor?.name?.includes('Braavos') ||
          p.constructor?.toString().toLowerCase().includes('braavos')
        );

        if (braavosProvider) {
          console.log('✅ Found Braavos in ethereum.providers, switching and connecting...');
          const originalStarknet = window.starknet;
          window.starknet = braavosProvider;
          try {
            await window.vernWalletIntegration.connectStarknetWallet('braavos');
            return;
          } catch (switchError) {
            console.warn('Braavos provider switch failed, restoring original:', switchError);
            if (originalStarknet) window.starknet = originalStarknet;
            throw switchError;
          }
        }
      }

      // Priority 4: Check for Braavos-specific globals
      if ((window as any).starknet_braavos) {
        console.log('✅ Found starknet_braavos global, using it...');
        const originalStarknet = window.starknet;
        window.starknet = (window as any).starknet_braavos;
        try {
          await window.vernWalletIntegration.connectStarknetWallet('braavos');
          return;
        } catch (switchError) {
          console.warn('Braavos global switch failed, restoring original:', switchError);
          if (originalStarknet) window.starknet = originalStarknet;
          throw switchError;
        }
      }

      // Priority 5: Try direct Braavos objects
      if ((window as any).BraavosWallet || (window as any).braavos) {
        console.log('✅ Found direct Braavos object, attempting connection...');
        const braavosWallet = (window as any).BraavosWallet || (window as any).braavos;
        if (braavosWallet && braavosWallet.enable) {
          const originalStarknet = window.starknet;
          window.starknet = braavosWallet;
          try {
            await window.vernWalletIntegration.connectStarknetWallet('braavos');
            return;
          } catch (directError) {
            console.warn('Direct Braavos connection failed, restoring original:', directError);
            if (originalStarknet) window.starknet = originalStarknet;
            throw directError;
          }
        }
      }

      // Fallback: Try other wallets if Braavos not found
      console.log('⚠️ Braavos not found, trying other Starknet wallets...');
      const walletTypes = ['argentx', 'okx'];

      for (const walletType of walletTypes) {
        try {
          console.log(`🔄 Attempting to connect to ${walletType}...`);
          await window.vernWalletIntegration.connectStarknetWallet(walletType);
          return;
        } catch (err) {
          console.log(`❌ Failed to connect to ${walletType}:`, err);
          continue;
        }
      }

      // Last resort: generic connection
      console.log('🔄 Trying generic Starknet wallet connection...');
      await window.vernWalletIntegration.connectStarknetWallet('generic');

    } catch (err: any) {
      console.error('💥 Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (!window.vernWalletIntegration || !walletAddress) return;

    try {
      await window.vernWalletIntegration.disconnectWallet(walletAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  if (isConnected && walletAddress) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm font-medium">Connected</span>
        </div>
        <div className="text-white text-sm">
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
        <button
          onClick={disconnectWallet}
          className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/50 rounded-md transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 px-3 py-1 rounded-md">
          {error}
        </div>
      )}
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
      >
        {isConnecting && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        )}
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    </div>
  );
}