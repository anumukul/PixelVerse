import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';

import { wagmiConfig } from './config/wagmi';
import { CONTRACT_ADDRESS } from './config/contract';
import { pixelCanvasV2ABI } from './config/abi';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const PIXEL_SIZE = 4;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080',
  '#FFA500', '#800080', '#FFC0CB', '#A52A2A'
];

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
  version: number;
}

function EnhancedPixelCanvas() {
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [isLoading, setIsLoading] = useState(false);
  const [paintCount, setPaintCount] = useState(0);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [uniqueUsers, setUniqueUsers] = useState(1);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  }>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const notificationIdRef = useRef(0);
  const { address, isConnected } = useAccount();

  // Contract reads
  const { data: pixelPrice, isLoading: priceLoading, error: priceError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'pixelPrice',
    query: {
      enabled: !!CONTRACT_ADDRESS, 
      retry: 3,
    },
  });

  const { data: canvasStats } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'getCanvasStats',
  });

  const { data: regionData, refetch: refetchRegion } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'getCanvasRegion',
    args: [0, 0, GRID_WIDTH, GRID_HEIGHT],
    query: {
      enabled: isConnected,
    },
  });

  const { writeContractAsync: paintPixel } = useWriteContract();

  // WebSocket connection
  useEffect(() => {
    if (!isConnected) return;

    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:3001/ws');
        
        wsRef.current.onopen = () => {
          console.log('Connected to WebSocket server');
          setWsStatus('connected');
          wsRef.current?.send(JSON.stringify({
            type: 'identify',
            payload: { address }
          }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'welcome') {
              setOnlineUsers(data.payload.activeUsers);
              // Calculate unique users from pixel data
              const uniqueAddresses = new Set();
              if (data.payload.recentPixels) {
                data.payload.recentPixels.forEach((pixel: any) => {
                  if (pixel.owner) uniqueAddresses.add(pixel.owner);
                });
              }
              setUniqueUsers(uniqueAddresses.size || 1);
              addNotification('Connected to real-time server', 'success');
            } else if (data.type === 'user_joined' || data.type === 'user_left') {
              // Handle user presence updates if needed
            } else if (data.type === 'pixel_painted') {
              // Handle real-time pixel updates from other users
              const newPixel: Pixel = {
                x: data.payload.x,
                y: data.payload.y,
                color: data.payload.color,
                owner: data.payload.owner,
                timestamp: data.payload.timestamp,
                version: 1
              };
              
              setPixels(prev => {
                const newPixels = new Map(prev);
                newPixels.set(`${newPixel.x}-${newPixel.y}`, newPixel);
                return newPixels;
              });
            } else if (data.type === 'canvas_stats') {
              // Update stats from WebSocket server
              if (data.payload.uniqueArtists) {
                setUniqueUsers(data.payload.uniqueArtists);
              }
              if (data.payload.activeUsers) {
                setOnlineUsers(data.payload.activeUsers);
              }
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setWsStatus('disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsStatus('disconnected');
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setWsStatus('disconnected');
        // Retry connection after 5 seconds
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isConnected, address]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = {
      id: notificationIdRef.current++,
      message,
      type
    };
    
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Process loaded region data and calculate unique users
  useEffect(() => {
    if (regionData && Array.isArray(regionData)) {
      console.log(`Loading ${regionData.length} pixels from blockchain`);
      const loadedPixels = new Map<string, Pixel>();
      const uniqueAddresses = new Set<string>();
      
      regionData.forEach((pixelData: any) => {
        const pixel: Pixel = {
          x: Number(pixelData.x),
          y: Number(pixelData.y),
          color: `#${pixelData.color.toString(16).padStart(6, '0')}`,
          owner: pixelData.painter,
          timestamp: Number(pixelData.timestamp),
          version: Number(pixelData.version)
        };
        loadedPixels.set(`${pixel.x}-${pixel.y}`, pixel);
        uniqueAddresses.add(pixel.owner);
      });
      
      setPixels(loadedPixels);
      setUniqueUsers(uniqueAddresses.size || 1);
      console.log(`Loaded ${loadedPixels.size} pixels from ${uniqueAddresses.size} unique users`);
    }
  }, [regionData]);

  // Real-time event listening
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        const { tokenId, painter, x, y, color, timestamp, version } = log.args;
        const newPixel: Pixel = {
          x: Number(x),
          y: Number(y),
          color: `#${color.toString(16).padStart(6, '0')}`,
          owner: painter,
          timestamp: Number(timestamp),
          version: Number(version)
        };
        
        setPixels(prev => {
          const newPixels = new Map(prev);
          newPixels.set(`${x}-${y}`, newPixel);
          
          // Update unique users count
          const uniqueAddresses = new Set<string>();
          newPixels.forEach(pixel => uniqueAddresses.add(pixel.owner));
          setUniqueUsers(uniqueAddresses.size);
          
          return newPixels;
        });
        
        console.log('Real-time pixel update:', newPixel);
        
        // Notify other users via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'pixel_painted',
            payload: newPixel
          }));
        }
      });
    },
  });

  // Draw canvas with all pixels
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw all pixels
    pixels.forEach((pixel) => {
      if (pixel.x < GRID_WIDTH && pixel.y < GRID_HEIGHT) {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
          pixel.x * PIXEL_SIZE + 1,
          pixel.y * PIXEL_SIZE + 1,
          PIXEL_SIZE - 2,
          PIXEL_SIZE - 2
        );

        // Highlight owned pixels with gold border
        if (pixel.owner === address) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            pixel.x * PIXEL_SIZE,
            pixel.y * PIXEL_SIZE,
            PIXEL_SIZE,
            PIXEL_SIZE
          );
        }
      }
    });
  }, [pixels, address]);

  // Redraw canvas when pixels change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle canvas click
  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected || !address) {
      addNotification("Please connect your wallet to paint pixels", "error");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;

    await paintSinglePixel(x, y, selectedColor);
  }, [isConnected, address, selectedColor]);

  // Paint a single pixel
  const paintSinglePixel = async (x: number, y: number, color: string) => {
    if (!pixelPrice || priceLoading) {
      addNotification("Loading contract data, please wait...", "info");
      return;
    }

    setIsLoading(true);
    try {
      const colorValue = parseInt(color.replace('#', ''), 16);
      
      console.log('Painting pixel:', { x, y, color, colorValue });
      
      const tx = await paintPixel({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelCanvasV2ABI,
        functionName: 'paintPixel',
        args: [x, y, colorValue],
        value: pixelPrice as bigint,
      });

      // Optimistic update
      const newPixel: Pixel = {
        x, y, color, owner: address!, timestamp: Date.now(), version: 1
      };

      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${x}-${y}`, newPixel);
        return newPixels;
      });

      setPaintCount(prev => prev + 1);
      addNotification(`Painted pixel at (${x}, ${y})!`, "success");
      console.log('Transaction sent:', tx);

    } catch (error: any) {
      console.error('Error painting pixel:', error);
      addNotification(`Failed: ${error.message || "Transaction failed"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCanvas = () => {
    refetchRegion();
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h1 style={{ margin: 0, fontSize: '36px' }}>🎨 PixelVerse</h1>
        <p style={{ margin: '8px 0 16px 0', fontSize: '18px' }}>
          Real-Time Collaborative NFT Canvas
        </p>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
          <a 
            href={`https://shannon-explorer.somnia.network/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'white', marginLeft: '8px' }}
          >
            🔗
          </a>
        </div>
      </header>

      {/* Connect Button */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <ConnectButton />
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#2d3748',
        color: 'white',
        padding: '12px 20px',
        marginBottom: '20px',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: wsStatus === 'connected' ? '#48bb78' : 
                       wsStatus === 'connecting' ? '#ed8936' : '#f56565'
          }} />
          <span>
            {wsStatus === 'connected' ? 'Live Updates Active' : 
             wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>👥 {uniqueUsers} artists</span>
          <span>🔗 {onlineUsers} connections</span>
          <span>🎨 {pixels.size} pixels</span>
          <span>🏆 {paintCount} mine</span>
        </div>
      </div>

      {/* Welcome Banner */}
      {!isConnected && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>🌟 Welcome to PixelVerse!</h2>
          <p style={{ fontSize: '16px', color: '#4a5568', marginBottom: '24px' }}>
            A revolutionary real-time collaborative NFT canvas built on Somnia blockchain. 
            Paint pixels, own NFTs, and collaborate with artists worldwide in real-time!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{
              background: '#e6fffa',
              color: '#234e52',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>⚡ Lightning-fast transactions</span>
            <span style={{
              background: '#e6fffa',
              color: '#234e52',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>🎨 Real-time collaboration</span>
            <span style={{
              background: '#e6fffa',
              color: '#234e52',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>💎 Each pixel is an NFT</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2>Enhanced Interactive Canvas</h2>
        
        {/* Status */}
        <div style={{ marginBottom: '15px' }}>
          <p style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
            {isConnected ? '✅ Wallet Connected - Real-time updates active!' : '❌ Connect wallet to start painting'}
          </p>
          {loadingRegion && <p style={{ color: 'blue' }}>🔄 Loading canvas data from blockchain...</p>}
          {priceLoading && <p style={{ color: 'orange' }}>🔄 Loading contract data...</p>}
        </div>

        {/* Canvas */}
        <div style={{ border: '2px solid #333', display: 'inline-block', position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            style={{
              display: 'block',
              cursor: isConnected ? 'crosshair' : 'not-allowed',
              imageRendering: 'pixelated'
            }}
          />
          
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '10px',
              borderRadius: '5px'
            }}>
              Painting pixel...
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: '15px' }}>
          <button 
            onClick={refreshCanvas}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Canvas
          </button>
        </div>

        {/* Color Palette */}
        <div style={{ marginTop: '15px' }}>
          <h3>Select Color:</h3>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {COLOR_PALETTE.map((color) => (
              <div
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  border: selectedColor === color ? '3px solid black' : '1px solid gray',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          marginTop: '15px', 
          fontSize: '14px',
          background: 'rgba(45, 55, 72, 0.9)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <p><strong>Canvas Size:</strong> {GRID_WIDTH} x {GRID_HEIGHT} pixels</p>
          <p><strong>Pixels in View:</strong> {pixels.size}</p>
          <p><strong>My Pixels Painted:</strong> {paintCount}</p>
          <p><strong>Unique Artists:</strong> {uniqueUsers}</p>
          <p><strong>Active Connections:</strong> {onlineUsers}</p>
          <p><strong>WebSocket Status:</strong> {wsStatus}</p>
          <p><strong>Total Blockchain Pixels:</strong> {canvasStats ? String(canvasStats[2]) : 'Loading...'}</p>
          <p><strong>Pixel Price:</strong> {pixelPrice ? `${Number(pixelPrice) / 1e18} STT` : 'Loading...'}</p>
          <p><strong>Selected Color:</strong> 
            <span style={{
              backgroundColor: selectedColor, 
              padding: '2px 8px', 
              border: '1px solid white', 
              marginLeft: '5px'
            }}>
              {selectedColor}
            </span>
          </p>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
          <strong>Enhanced Features:</strong>
          <ul>
            <li>✅ Pixels persist after page refresh</li>
            <li>✅ Real-time updates from blockchain events</li>
            <li>✅ WebSocket connection for live user presence</li>
            <li>✅ Visual feedback with loading states</li>
            <li>✅ Your owned pixels highlighted in gold</li>
            <li>✅ Live user count and connection status</li>
            <li>✅ Unique artist count based on wallet addresses</li>
          </ul>
        </div>
      </div>

      {/* Notifications */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px'
      }}>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              borderLeft: `4px solid ${
                notification.type === 'success' ? '#48bb78' :
                notification.type === 'error' ? '#f56565' : '#4299e1'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => removeNotification(notification.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'info' && 'ℹ️'}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {notification.message}
              </span>
            </div>
            <button 
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                color: '#a0aec0',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div style={{
            minHeight: '100vh',
            background: '#f0f2f5',
            padding: '0',
            margin: '0'
          }}>
            <EnhancedPixelCanvas />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;