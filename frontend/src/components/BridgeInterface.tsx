'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
  }
}

interface BridgeInterfaceProps {
  walletAddress: string;
}

type BridgeDirection = 'bitcoin-to-starknet' | 'starknet-to-bitcoin';

export default function BridgeInterface({ walletAddress }: BridgeInterfaceProps) {
  const [direction, setDirection] = useState<BridgeDirection>('bitcoin-to-starknet');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estimatedGas, setEstimatedGas] = useState('');

  useEffect(() => {
    if (walletAddress) {
      setRecipientAddress(walletAddress);
    }
  }, [walletAddress]);

  const handleBridge = async () => {
    if (!amount || !recipientAddress) {
      setError('Please fill in all required fields');
      return;
    }

    if (!window.vernWalletIntegration) {
      setError('VernWallet integration not loaded');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const bridgeParams = {
        direction,
        amount: parseFloat(amount),
        fromAddress: direction === 'bitcoin-to-starknet' ? '' : walletAddress,
        toAddress: recipientAddress,
        walletAddress
      };

      const response = await window.vernWalletIntegration.initiateBridgeTransfer(bridgeParams);

      if (response.success) {
        setSuccess(`Bridge transfer initiated! Transaction ID: ${response.data.depositId || response.data.withdrawalId}`);
        setAmount('');
        setRecipientAddress(walletAddress);
      }
    } catch (err: any) {
      setError(err.message || 'Bridge transfer failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const switchDirection = () => {
    setDirection(prev =>
      prev === 'bitcoin-to-starknet' ? 'starknet-to-bitcoin' : 'bitcoin-to-starknet'
    );
    setRecipientAddress(walletAddress);
  };

  const validateAddress = (address: string) => {
    if (direction === 'bitcoin-to-starknet') {
      return window.vernWalletIntegration?.validateBitcoinAddress(address);
    } else {
      return window.vernWalletIntegration?.validateStarknetAddress(address);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Bridge Transfer</h2>
        <p className="text-gray-300">Transfer assets between Bitcoin and Starknet</p>
      </div>

      {/* Direction Selector */}
      <div className="bg-black/20 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setDirection('bitcoin-to-starknet')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              direction === 'bitcoin-to-starknet'
                ? 'bg-orange-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            🔴 Bitcoin → Starknet
          </button>
          <button
            onClick={switchDirection}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-md text-white"
          >
            ⇅
          </button>
          <button
            onClick={() => setDirection('starknet-to-bitcoin')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              direction === 'starknet-to-bitcoin'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Starknet → 🔴 Bitcoin
          </button>
        </div>
      </div>

      {/* Transfer Form */}
      <div className="bg-black/20 rounded-lg p-6 border border-white/10 space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount {direction === 'bitcoin-to-starknet' ? '(BTC)' : '(ETH)'}
          </label>
          <input
            type="number"
            step="0.00000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Address ({direction === 'bitcoin-to-starknet' ? 'Starknet' : 'Bitcoin'})
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder={direction === 'bitcoin-to-starknet' ? '0x...' : 'bc1...'}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>

        {/* Gas Estimate */}
        {estimatedGas && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
            <div className="text-sm text-blue-300">
              Estimated Gas: {estimatedGas}
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
            <div className="text-sm text-green-400">{success}</div>
          </div>
        )}

        {/* Bridge Button */}
        <button
          onClick={handleBridge}
          disabled={isProcessing || !amount || !recipientAddress}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing && (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
          <span>
            {isProcessing
              ? 'Processing...'
              : `Bridge ${direction.replace('-', ' to ')}`
            }
          </span>
        </button>

        {/* Bridge Info */}
        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-white/10">
          <div>• Bridge transfers typically take 10-60 minutes to complete</div>
          <div>• Minimum amount: {direction === 'bitcoin-to-starknet' ? '0.0001 BTC' : '0.001 ETH'}</div>
          <div>• You'll be notified when the transfer completes</div>
        </div>
      </div>
    </div>
  );
}