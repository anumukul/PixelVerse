// frontend/src/App.tsx
import React, { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

import { wagmiConfig } from './config/wagmi';
import { CONTRACT_ADDRESS } from './config/contract';

import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { BatchOperations } from './components/BatchOperations';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { WelcomeBanner } from './components/WelcomeBanner';
import { StatusBar } from './components/StatusBar';
import { NotificationSystem } from './components/NotificationSystem';

import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

const queryClient = new QueryClient();

type ViewMode = 'analytics' | 'batch' | 'split';

function PixelVerseApp() {
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: number;
  }>>([]);
  
  const { address, isConnected } = useAccount();

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleBatchComplete = (pixels: any[]) => {
    addNotification(`Successfully painted ${pixels.length} pixels in batch!`, 'success');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'analytics':
        return <AnalyticsDashboard className="full-width" />;
      
      case 'batch':
        return <BatchOperations onBatchComplete={handleBatchComplete} className="full-width" />;
      
      case 'split':
        return (
          <div className="split-layout">
            <div className="split-left">
              <div className="section">
                <h3 className="section-title">Batch Tools</h3>
                <BatchOperations onBatchComplete={handleBatchComplete} />
              </div>
            </div>
            
            <div className="split-right">
              <div className="section">
                <h3 className="section-title">Real-Time Analytics</h3>
                <AnalyticsDashboard />
              </div>
            </div>
          </div>
        );
      
      default:
        return <AnalyticsDashboard className="full-width" />;
    }
  };

  return (
    <div className="app">
      <Header contractAddress={CONTRACT_ADDRESS} />
      
      <div className="connect-section">
        <ConnectButton />
      </div>

      <StatusBar />

      <Navigation viewMode={viewMode} onViewModeChange={setViewMode} />

      <main className="main-content">
        {!isConnected && <WelcomeBanner />}
        
        <div className="content-wrapper">
          {renderContent()}
        </div>
      </main>

      <NotificationSystem 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <PixelVerseApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;