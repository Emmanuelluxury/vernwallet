'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
  }
}

interface SwapInterfaceProps {
  walletAddress: string;
}

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export default function SwapInterface({ walletAddress }: SwapInterfaceProps) {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState('');
  const [priceImpact, setPriceImpact] = useState('');

  // Common tokens on Starknet
  const availableTokens: Token[] = [
    { symbol: 'ETH', name: 'Ethereum', address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decimals: 18 },
    { symbol: 'USDC', name: 'USD Coin', address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', address: '0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8', decimals: 6 },
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3', decimals: 18 },
  ];

  const handleSwap = async () => {
    if (!amount || !fromToken || !toToken) {
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
      const fromTokenInfo = availableTokens.find(t => t.symbol === fromToken);
      const toTokenInfo = availableTokens.find(t => t.symbol === toToken);

      if (!fromTokenInfo || !toTokenInfo) {
        throw new Error('Token information not found');
      }

      const swapParams = {
        fromToken: fromTokenInfo.address,
        toToken: toTokenInfo.address,
        amount: amount,
        minAmountOut: estimatedOutput ? (parseFloat(estimatedOutput) * 0.95).toString() : '0', // 5% slippage
        walletAddress
      };

      const response = await window.vernWalletIntegration.executeSwap(swapParams);

      if (response.success) {
        setSuccess(`Swap completed successfully!`);
        setAmount('');
        setEstimatedOutput('');
        setPriceImpact('');
      }
    } catch (err: any) {
      setError(err.message || 'Swap failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const estimateSwap = async () => {
    if (!amount || !fromToken || !toToken || !window.vernWalletIntegration) return;

    try {
      const fromTokenInfo = availableTokens.find(t => t.symbol === fromToken);
      const toTokenInfo = availableTokens.find(t => t.symbol === toToken);

      if (!fromTokenInfo || !toTokenInfo) return;

      // This would typically call an API to get swap rates
      // For now, we'll simulate with a simple calculation
      const mockRate = fromToken === 'ETH' && toToken === 'USDC' ? 2000 : 0.0005;
      const estimated = (parseFloat(amount) * mockRate).toFixed(6);

      setEstimatedOutput(estimated);
      setPriceImpact('0.1%'); // Mock price impact
    } catch (error) {
      console.error('Failed to estimate swap:', error);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      estimateSwap();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [amount, fromToken, toToken]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Token Swap</h2>
        <p className="text-gray-300">Swap tokens on Starknet</p>
      </div>

      {/* Swap Interface */}
      <div className="bg-black/20 rounded-lg p-6 border border-white/10 space-y-4">
        {/* From Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
          <div className="flex space-x-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              const temp = fromToken;
              setFromToken(toToken);
              setToToken(temp);
              setAmount('');
              setEstimatedOutput('');
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            ⇅
          </button>
        </div>

        {/* To Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
          <div className="flex space-x-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white font-mono text-sm flex items-center">
              {estimatedOutput || '0.00'}
            </div>
          </div>
        </div>

        {/* Swap Info */}
        {estimatedOutput && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-300">Estimated Output:</span>
              <span className="text-white font-mono">{estimatedOutput} {toToken}</span>
            </div>
            {priceImpact && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-300">Price Impact:</span>
                <span className="text-white">{priceImpact}</span>
              </div>
            )}
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

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isProcessing || !amount || !estimatedOutput}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing && (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
          <span>
            {isProcessing
              ? 'Swapping...'
              : `Swap ${fromToken} for ${toToken}`
            }
          </span>
        </button>

        {/* Swap Info */}
        <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-white/10">
          <div>• Minimum received: {estimatedOutput ? (parseFloat(estimatedOutput) * 0.95).toFixed(6) : '0'} {toToken} (5% slippage)</div>
          <div>• Price updates every few seconds</div>
        </div>
      </div>
    </div>
  );
}