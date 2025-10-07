'use client';

import { useState, useEffect } from 'react';
import WalletConnection from '@/components/WalletConnection';
import BridgeInterface from '@/components/BridgeInterface';
import Dashboard from '@/components/Dashboard';
import StakingInterface from '@/components/StakingInterface';
import SwapInterface from '@/components/SwapInterface';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    // Load vern wallet integration script
    const script = document.createElement('script');
    script.src = '/frontend-integration.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleWalletConnected = (address: string) => {
    setIsWalletConnected(true);
    setWalletAddress(address);
  };

  const handleWalletDisconnected = () => {
    setIsWalletConnected(false);
    setWalletAddress('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">VernWallet</h1>
              <span className="ml-2 text-sm text-purple-300">Bitcoin ↔ Starknet Bridge</span>
            </div>
            <WalletConnection
              isConnected={isWalletConnected}
              walletAddress={walletAddress}
              onConnected={handleWalletConnected}
              onDisconnected={handleWalletDisconnected}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isWalletConnected ? (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold text-white mb-4">Welcome to VernWallet</h2>
            <p className="text-gray-300 mb-8">Connect your Starknet wallet to start bridging between Bitcoin and Starknet</p>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex space-x-1 mb-8 bg-black/20 p-1 rounded-lg backdrop-blur-sm">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'bridge', label: 'Bridge' },
                { id: 'swap', label: 'Swap' },
                { id: 'staking', label: 'Staking' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-black/20 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              {activeTab === 'dashboard' && <Dashboard walletAddress={walletAddress} />}
              {activeTab === 'bridge' && <BridgeInterface walletAddress={walletAddress} />}
              {activeTab === 'swap' && <SwapInterface walletAddress={walletAddress} />}
              {activeTab === 'staking' && <StakingInterface walletAddress={walletAddress} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
