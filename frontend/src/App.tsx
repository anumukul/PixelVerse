import React from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from './components/WalletConnect';

function App() {
  const { isConnected } = useAccount();

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
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">Canvas Loading...</h2>
                  <p className="text-gray-500">Setting up PixelVerse components...</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <WalletConnect />
            
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Canvas Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Canvas Size</span>
                  <span className="font-mono">1000×1000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pixels Painted</span>
                  <span className="font-mono">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;