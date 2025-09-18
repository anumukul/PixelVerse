import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from './components/WalletConnect';
import { ColorPalette } from './components/ColorPalette';
import { CanvasControls } from './components/CanvasControls';
import { PixelCanvas } from './components/PixelCanvas';
import { LiveStats } from './components/LiveStats';
import { TransactionToast } from './components/TransactionToast';
import { BatchPaintControls } from './components/BatchPaintControls';
import { useContractEvents } from './hooks/useContractEvents';

interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'paint';
  timestamp: number;
}

function App() {
  const { isConnected } = useAccount();
  const { refreshCanvas } = useContractEvents();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (isConnected) {
      refreshCanvas();
    }
  }, [isConnected, refreshCanvas]);

  const addTransaction = (hash: string) => {
    setTransactions(prev => [...prev, {
      hash,
      status: 'pending',
      type: 'paint',
      timestamp: Date.now()
    }]);
  };

  const updateTransactionStatus = (hash: string, status: 'confirmed' | 'failed') => {
    setTransactions(prev => 
      prev.map(tx => tx.hash === hash ? { ...tx, status } : tx)
    );
  };

  const removeTransaction = (hash: string) => {
    setTransactions(prev => prev.filter(tx => tx.hash !== hash));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PixelVerse</h1>
              <p className="text-gray-600 mt-1">Collaborative NFT Canvas on Somnia</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected to Somnia' : 'Not Connected'}
              </span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex justify-center">
                <PixelCanvas 
                  onTransactionStart={addTransaction}
                  onTransactionUpdate={updateTransactionStatus}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <WalletConnect />
            
            {isConnected && (
              <>
                <ColorPalette />
                <BatchPaintControls 
                  onTransactionStart={addTransaction}
                />
                <CanvasControls />
                <LiveStats />
              </>
            )}
          </div>
        </div>

        {!isConnected && (
          <div className="mt-8 text-center">
            <div className="bg-blue-50 rounded-xl p-8 max-w-md mx-auto border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Welcome to PixelVerse
              </h3>
              <p className="text-blue-700 mb-4">
                Connect your wallet to start painting pixels and creating NFTs on the Somnia blockchain.
              </p>
              <ul className="text-sm text-blue-600 space-y-1 text-left">
                <li>• Each pixel becomes an NFT</li>
                <li>• Real-time collaborative canvas</li>
                <li>• High-speed Somnia blockchain</li>
                <li>• Batch painting for efficiency</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <TransactionToast 
        transactions={transactions}
        onRemove={removeTransaction}
      />
    </div>
  );
}

export default App;