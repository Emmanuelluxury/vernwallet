'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    vernWalletIntegration: any;
  }
}

interface StakingInterfaceProps {
  walletAddress: string;
}

interface StakingPosition {
  tokenAddress: string;
  amount: string;
  rewards: string;
  lockPeriod: number;
  startTime: string;
  endTime: string;
}

export default function StakingInterface({ walletAddress }: StakingInterfaceProps) {
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [stakingRewards, setStakingRewards] = useState('0');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('30');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('stake');

  const availableTokens = [
    { symbol: 'ETH', name: 'Ethereum', address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' },
    { symbol: 'STRK', name: 'Starknet', address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d' },
  ];

  const lockPeriodOptions = [
    { value: '30', label: '30 days', apy: '5%' },
    { value: '90', label: '90 days', apy: '8%' },
    { value: '180', label: '180 days', apy: '12%' },
    { value: '365', label: '365 days', apy: '15%' },
  ];

  useEffect(() => {
    if (walletAddress && window.vernWalletIntegration) {
      loadStakingData();
    }
  }, [walletAddress]);

  const loadStakingData = async () => {
    try {
      // Load staking positions
      for (const token of availableTokens) {
        const response = await window.vernWalletIntegration.getStakingPosition(walletAddress, token.address);
        if (response.success && response.data) {
          setStakingPositions(prev => [...prev, {
            tokenAddress: token.address,
            amount: response.data.amount,
            rewards: response.data.rewards,
            lockPeriod: response.data.lockPeriod,
            startTime: response.data.startTime,
            endTime: response.data.endTime,
          }]);
        }
      }

      // Load total rewards
      const rewardsResponse = await window.vernWalletIntegration.getStakingRewards(walletAddress);
      if (rewardsResponse.success) {
        setStakingRewards(rewardsResponse.data.totalRewards || '0');
      }
    } catch (error) {
      console.error('Failed to load staking data:', error);
    }
  };

  const handleStake = async () => {
    if (!stakeAmount || !selectedToken || !lockPeriod) {
      setError('Please fill in all required fields');
      return;
    }

    if (!window.vernWalletIntegration) {
      setError('VernWallet integration not loaded');
      return;
    }

    setIsStaking(true);
    setError('');
    setSuccess('');

    try {
      const token = availableTokens.find(t => t.symbol === selectedToken);
      if (!token) throw new Error('Token not found');

      const stakeParams = {
        tokenAddress: token.address,
        amount: stakeAmount,
        lockPeriod: parseInt(lockPeriod),
        walletAddress
      };

      const response = await window.vernWalletIntegration.executeStake(stakeParams);

      if (response.success) {
        setSuccess(`Successfully staked ${stakeAmount} ${selectedToken}`);
        setStakeAmount('');
        await loadStakingData(); // Refresh data
      }
    } catch (err: any) {
      setError(err.message || 'Staking failed');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (tokenAddress: string, amount: string) => {
    if (!window.vernWalletIntegration) {
      setError('VernWallet integration not loaded');
      return;
    }

    setIsUnstaking(true);
    setError('');
    setSuccess('');

    try {
      const unstakeParams = {
        tokenAddress,
        amount,
        walletAddress
      };

      const response = await window.vernWalletIntegration.executeUnstake(unstakeParams);

      if (response.success) {
        setSuccess(`Successfully unstaked ${amount}`);
        await loadStakingData(); // Refresh data
      }
    } catch (err: any) {
      setError(err.message || 'Unstaking failed');
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimRewards = async (tokenAddress: string) => {
    if (!window.vernWalletIntegration) {
      setError('VernWallet integration not loaded');
      return;
    }

    setIsClaiming(true);
    setError('');
    setSuccess('');

    try {
      const claimParams = {
        tokenAddress,
        walletAddress
      };

      const response = await window.vernWalletIntegration.executeClaimRewards(claimParams);

      if (response.success) {
        setSuccess('Successfully claimed rewards');
        await loadStakingData(); // Refresh data
      }
    } catch (err: any) {
      setError(err.message || 'Claim rewards failed');
    } finally {
      setIsClaiming(false);
    }
  };

  const selectedLockPeriod = lockPeriodOptions.find(p => p.value === lockPeriod);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Staking</h2>
        <p className="text-gray-300">Stake your tokens to earn rewards</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
        {[
          { id: 'stake', label: 'Stake' },
          { id: 'positions', label: 'My Positions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {activeTab === 'stake' && (
        <div className="bg-black/20 rounded-lg p-6 border border-white/10 space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Token to Stake</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {availableTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <input
              type="number"
              step="0.000001"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Lock Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lock Period</label>
            <select
              value={lockPeriod}
              onChange={(e) => setLockPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {lockPeriodOptions.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label} - APY: {period.apy}
                </option>
              ))}
            </select>
          </div>

          {/* Stake Button */}
          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
          >
            {isStaking && (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            <span>{isStaking ? 'Staking...' : `Stake ${selectedToken}`}</span>
          </button>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-4">
          {/* Total Rewards */}
          <div className="bg-black/20 rounded-lg p-4 border border-white/10">
            <div className="text-center">
              <div className="text-gray-400 text-sm">Total Rewards Earned</div>
              <div className="text-2xl font-bold text-white">{stakingRewards} ETH</div>
            </div>
          </div>

          {/* Staking Positions */}
          {stakingPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No staking positions found
            </div>
          ) : (
            stakingPositions.map((position, index) => {
              const token = availableTokens.find(t => t.address === position.tokenAddress);
              const isActive = new Date(position.endTime) > new Date();

              return (
                <div key={index} className="bg-black/20 rounded-lg p-6 border border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-white font-medium">{token?.symbol} Staking</div>
                      <div className="text-gray-400 text-sm">
                        Staked: {position.amount} {token?.symbol}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {isActive ? 'Active' : 'Completed'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-400">Rewards Earned</div>
                      <div className="text-white font-mono">{position.rewards} {token?.symbol}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Lock Period</div>
                      <div className="text-white">{position.lockPeriod} days</div>
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleClaimRewards(position.tokenAddress)}
                        disabled={isClaiming}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                      </button>
                      <button
                        onClick={() => handleUnstake(position.tokenAddress, position.amount)}
                        disabled={isUnstaking}
                        className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-sm font-medium rounded-md transition-colors"
                      >
                        {isUnstaking ? 'Unstaking...' : 'Unstake'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}