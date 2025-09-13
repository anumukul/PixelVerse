import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';

import { wagmiConfig } from './config/wagmi';
import { CONTRACT_ADDRESS } from './config/contract';
import { pixelNFTABI } from './config/abi';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const PIXEL_SIZE = 4;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080'
];

function PixelCanvas() {
  const [pixels, setPixels] = useState<Map<string, any>>(new Map());
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [isLoading, setIsLoading] = useState(false);
  const [paintCount, setPaintCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { address, isConnected } = useAccount();

  const { data: pixelPrice } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelNFTABI,
    functionName: 'pixelPrice',
  });

  const { writeContractAsync: paintPixel } = useWriteContract();

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

    // Draw pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * PIXEL_SIZE + 1,
        pixel.y * PIXEL_SIZE + 1,
        PIXEL_SIZE - 2,
        PIXEL_SIZE - 2
      );

      // Highlight owned pixels
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
    });
  }, [pixels, address]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

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

    if (!pixelPrice) {
      alert("Contract not ready, please wait...");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Painting pixel:', { x, y, color: selectedColor });
      
      const tx = await paintPixel({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelNFTABI,
        functionName: 'paintPixel',
        args: [BigInt(x), BigInt(y), selectedColor],
        value: pixelPrice as bigint,
      });

      // Optimistic update
      const newPixel = {
        x,
        y,
        color: selectedColor,
        owner: address,
        timestamp: Date.now()
      };

      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${x}-${y}`, newPixel);
        return newPixels;
      });

      setPaintCount(prev => prev + 1);
      alert(`SUCCESS! Painted pixel at (${x}, ${y})`);

    } catch (error: any) {
      console.error('Error painting pixel:', error);
      alert(`Failed: ${error.message || "Transaction failed"}`);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, selectedColor, pixelPrice, paintPixel]);

  return (
    <div style={{ marginTop: '20px' }}>
      <h2>Interactive Canvas</h2>
      
      {/* Connection Status */}
      <p style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
        {isConnected ? '✅ Wallet Connected - Click pixels to paint!' : '❌ Connect wallet to start painting'}
      </p>

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
        <p><strong>Pixels Painted:</strong> {paintCount}</p>
        <p><strong>Pixel Price:</strong> {pixelPrice ? `${Number(pixelPrice) / 1e18} STT` : 'Loading...'}</p>
        <p><strong>Selected Color:</strong> <span style={{backgroundColor: selectedColor, padding: '2px 8px', border: '1px solid black'}}>{selectedColor}</span></p>
      </div>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
        <strong>How to use:</strong> Select a color above and click on any pixel to paint it as an NFT. 
        Each pixel becomes your property on the blockchain instantly!
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
            <h1>🎨 PixelVerse - Collaborative NFT Canvas</h1>
            <p><strong>Contract:</strong> {CONTRACT_ADDRESS}</p>
            
            <div style={{ marginBottom: '20px' }}>
              <ConnectButton />
            </div>

            <div style={{ backgroundColor: '#f3e5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3>⚡ Powered by Somnia's 1M+ TPS</h3>
              <p>This real-time collaborative canvas is impossible on other blockchains due to gas costs and speed limitations. 
              Each pixel is an NFT with instant ownership transfer!</p>
            </div>

            <PixelCanvas />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;