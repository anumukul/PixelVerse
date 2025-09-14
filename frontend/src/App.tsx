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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { address, isConnected } = useAccount();

  // Contract reads - FIXED
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

  // Load canvas region using useReadContract
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

  // ADDED: Debugging useEffect
  useEffect(() => {
    console.log('Contract read status:', {
      pixelPrice,
      priceLoading,
      priceError,
      isConnected,
      CONTRACT_ADDRESS
    });
  }, [pixelPrice, priceLoading, priceError, isConnected]);

  // Process loaded region data
  useEffect(() => {
    if (regionData && Array.isArray(regionData)) {
      console.log(`Loading ${regionData.length} pixels from blockchain`);
      const loadedPixels = new Map<string, Pixel>();
      
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
      });
      
      setPixels(loadedPixels);
      console.log(`Loaded ${loadedPixels.size} pixels from blockchain`);
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
          return newPixels;
        });
        
        console.log('Real-time pixel update:', newPixel);
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
      alert("Please connect your wallet to paint pixels");
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

  // Paint a single pixel - FIXED
  const paintSinglePixel = async (x: number, y: number, color: string) => {
    console.log('Debug - pixelPrice value:', pixelPrice);
    console.log('Debug - pixelPrice type:', typeof pixelPrice);
    console.log('Debug - pixelPrice === undefined:', pixelPrice === undefined);

    if (!pixelPrice || priceLoading) {
      console.log('Price not ready:', { pixelPrice, priceLoading });
      alert("Loading contract data, please wait...");
      return;
    }

    setIsLoading(true);
    try {
      // Convert color to uint32
      const colorValue = parseInt(color.replace('#', ''), 16);
      
      console.log('Painting pixel:', { x, y, color, colorValue });
      
      const tx = await paintPixel({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelCanvasV2ABI,
        functionName: 'paintPixel',
        args: [x, y, colorValue],
        value: pixelPrice as bigint,
      });

      // Optimistic update - pixel will also be updated via event listener
      const newPixel: Pixel = {
        x,
        y,
        color,
        owner: address!,
        timestamp: Date.now(),
        version: 1
      };

      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${x}-${y}`, newPixel);
        return newPixels;
      });

      setPaintCount(prev => prev + 1);
      console.log('Transaction sent:', tx);

    } catch (error: any) {
      console.error('Error painting pixel:', error);
      alert(`Failed: ${error.message || "Transaction failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh canvas data
  const refreshCanvas = () => {
    refetchRegion();
  };

  return (
    <div style={{ marginTop: '20px' }}>
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
      <div style={{ marginTop: '15px', fontSize: '14px' }}>
        <p><strong>Canvas Size:</strong> {GRID_WIDTH} x {GRID_HEIGHT} pixels</p>
        <p><strong>Pixels in View:</strong> {pixels.size}</p>
        <p><strong>My Pixels Painted:</strong> {paintCount}</p>
        <p><strong>Total Blockchain Pixels:</strong> {canvasStats ? String(canvasStats[2]) : 'Loading...'}</p>
        <p><strong>Pixel Price:</strong> {pixelPrice ? `${Number(pixelPrice) / 1e18} STT` : 'Loading...'}</p>
        <p><strong>Price Loading:</strong> {priceLoading ? 'Yes' : 'No'}</p>
        <p><strong>Selected Color:</strong> 
          <span style={{backgroundColor: selectedColor, padding: '2px 8px', border: '1px solid black', marginLeft: '5px'}}>
            {selectedColor}
          </span>
        </p>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
        <strong>Enhanced Features:</strong>
        <ul>
          <li>✅ Pixels now persist after page refresh</li>
          <li>✅ Real-time updates from other users via blockchain events</li>
          <li>✅ Canvas loads existing pixel data on startup</li>
          <li>✅ Visual feedback with loading states</li>
          <li>✅ Your owned pixels highlighted in gold</li>
          <li>✅ Manual refresh button to reload from blockchain</li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px' }}>
            <h1>🎨 PixelVerse V2 - Real-Time NFT Canvas</h1>
            <p><strong>Contract:</strong> {CONTRACT_ADDRESS}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <ConnectButton />
            </div>

            <div style={{ backgroundColor: '#f3e5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3>⚡ Enhanced with Persistent Storage</h3>
              <p>Pixels now persist after page refresh and load from blockchain automatically!</p>
            </div>

            <EnhancedPixelCanvas />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;