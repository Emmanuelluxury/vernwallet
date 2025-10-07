'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
  }
}

interface DashboardProps {
  walletAddress: string;
}

interface Balance {
  token: string;
  amount: string;
  symbol: string;
  usdValue?: string;
}

interface Transaction {
  id: string;
  type: 'bridge' | 'swap' | 'staking' | 'transfer';
  amount: string;
  token: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  txHash?: string;
}

export default function Dashboard({ walletAddress }: DashboardProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  useEffect(() => {
    if (walletAddress && window.vernWalletIntegration) {
      loadBalances();
      loadTransactions();
    }
  }, [walletAddress]);

  const loadBalances = async () => {
    try {
      setIsLoadingBalances(true);
      const response = await window.vernWalletIntegration.getUserBalances(walletAddress);

      if (response.success) {
        setBalances(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      const response = await window.vernWalletIntegration.getTransactionHistory(walletAddress, 10);

      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const formatAmount = (amount: string, decimals: number = 6) => {
    return parseFloat(amount).toFixed(decimals);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bridge': return '🌉';
      case 'swap': return '🔄';
      case 'staking': return '🏦';
      case 'transfer': return '💸';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <button
          onClick={() => {
            loadBalances();
            loadTransactions();
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Balances */}
      <div className="bg-black/20 rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Balances</h3>
        {isLoadingBalances ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : balances.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No balances found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((balance, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{balance.symbol}</div>
                    <div className="text-gray-400 text-sm">{balance.token}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">{formatAmount(balance.amount)}</div>
                    {balance.usdValue && (
                      <div className="text-gray-400 text-sm">${balance.usdValue}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-black/20 rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
        {isLoadingTransactions ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getTypeIcon(tx.type)}</div>
                  <div>
                    <div className="text-white font-medium capitalize">
                      {tx.type} {tx.token}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {formatTime(tx.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono">
                    {formatAmount(tx.amount)} {tx.token}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}