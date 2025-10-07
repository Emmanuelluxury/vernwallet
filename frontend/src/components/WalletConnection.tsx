'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
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
      // Try to connect to popular Starknet wallets
      const walletTypes = ['braavos', 'argentx', 'okx'];

      for (const walletType of walletTypes) {
        try {
          await window.vernWalletIntegration.connectStarknetWallet(walletType);
          return;
        } catch (err) {
          console.log(`Failed to connect to ${walletType}:`, err);
          continue;
        }
      }

      // If no specific wallet worked, try generic connection
      await window.vernWalletIntegration.connectStarknetWallet('generic');
    } catch (err: any) {
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