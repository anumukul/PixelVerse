import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { somniaTestnet } from '../config/wagmi';

export const WalletConnect: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: somniaTestnet.id,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Wallet</h3>
      
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button 
                      onClick={openConnectModal} 
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button 
                      onClick={openChainModal} 
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Wrong Network
                    </button>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Chain</span>
                      <button
                        onClick={openChainModal}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {chain.name}
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Address</span>
                      <button
                        onClick={openAccountModal}
                        className="text-xs font-mono text-gray-900"
                      >
                        {account.displayName}
                      </button>
                    </div>
                    
                    {balance && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Balance</span>
                        <span className="text-xs font-mono">
                          {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {!isConnected && (
        <p className="text-xs text-gray-500 mt-2">
          Connect to MetaMask to start painting pixels
        </p>
      )}
    </div>
  );
};