// frontend/src/components/EnhancedCanvas.tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ADDRESS } from '../config/contract';
import { pixelCanvasV2ABI } from '../config/abi';
import { WebSocketService, UserCursor, RealtimePixelUpdate } from '../services/websocket';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIXEL_SIZE = 2; // Smaller pixels for more detail
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFFFFF', '#000000', '#808080', '#800000', '#008000', '#000080',
  '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#87CEEB', '#DDA0DD',
  '#98FB98', '#F0E68C', '#DEB887', '#CD853F', '#D2691E', '#FF69B4'
];

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner: string;
  timestamp: number;
  version: number;
}

interface CanvasStats {
  activeUsers: number;
  pixelsPerSecond: number;
  totalPixels: number;
  myPixels: number;
}

interface Props {
  className?: string;
}

export const EnhancedCanvas: React.FC<Props> = ({ className }) => {
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCursor, setCurrentCursor] = useState({ x: 0, y: 0 });
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());
  const [canvasStats, setCanvasStats] = useState<CanvasStats>({
    activeUsers: 0,
    pixelsPerSecond: 0,
    totalPixels: 0,
    myPixels: 0
  });
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocketService | null>(null);
  const animationFrameRef = useRef<number>();
  const { address, isConnected } = useAccount();

  // Contract reads
  const { data: pixelPrice } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'pixelPrice',
  });

  const { data: contractStats } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'getCanvasStats',
  });

  const { writeContractAsync: paintPixel } = useWriteContract();
  const { writeContractAsync: updateCursor } = useWriteContract();

  // Initialize WebSocket connection
  useEffect(() => {
    wsRef.current = new WebSocketService('ws://localhost:3001'); // Replace with your WebSocket server
    
    wsRef.current.on('connection', (data: any) => {
      setConnectionStatus(data.status);
    });

    wsRef.current.on('pixelUpdate', (update: RealtimePixelUpdate) => {
      const newPixel: Pixel = {
        x: update.x,
        y: update.y,
        color: update.color,
        owner: update.owner,
        timestamp: update.timestamp,
        version: 1
      };
      
      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${update.x}-${update.y}`, newPixel);
        return newPixels;
      });
    });

    wsRef.current.on('cursorUpdate', (cursor: UserCursor) => {
      if (cursor.userId !== address) { // Don't show our own cursor
        setUserCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.set(cursor.userId, cursor);
          return newCursors;
        });
      }
    });

    wsRef.current.on('userLeft', (data: any) => {
      setUserCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    });

    return () => {
      wsRef.current?.disconnect();
    };
  }, [address]);

  // Watch for blockchain events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
      logs.forEach((log: any) => {
        const { x, y, color, painter, timestamp, version } = log.args;
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

        // Update stats
        setCanvasStats(prev => ({
          ...prev,
          totalPixels: prev.totalPixels + 1,
          myPixels: painter === address ? prev.myPixels + 1 : prev.myPixels
        }));
      });
    },
  });

  // Optimized rendering with viewport culling
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Calculate visible region
    const startX = Math.floor(viewportOffset.x / PIXEL_SIZE / zoom);
    const startY = Math.floor(viewportOffset.y / PIXEL_SIZE / zoom);
    const endX = Math.ceil((viewportOffset.x + CANVAS_WIDTH) / PIXEL_SIZE / zoom);
    const endY = Math.ceil((viewportOffset.y + CANVAS_HEIGHT) / PIXEL_SIZE / zoom);

    // Draw grid (only visible portion)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    for (let x = Math.max(0, startX); x <= Math.min(GRID_WIDTH, endX); x++) {
      const screenX = (x * PIXEL_SIZE * zoom) - viewportOffset.x;
      if (screenX >= -PIXEL_SIZE && screenX <= CANVAS_WIDTH + PIXEL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, CANVAS_HEIGHT);
        ctx.stroke();
      }
    }
    
    for (let y = Math.max(0, startY); y <= Math.min(GRID_HEIGHT, endY); y++) {
      const screenY = (y * PIXEL_SIZE * zoom) - viewportOffset.y;
      if (screenY >= -PIXEL_SIZE && screenY <= CANVAS_HEIGHT + PIXEL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(CANVAS_WIDTH, screenY);
        ctx.stroke();
      }
    }

    // Draw pixels (only visible ones)
    pixels.forEach((pixel) => {
      const screenX = (pixel.x * PIXEL_SIZE * zoom) - viewportOffset.x;
      const screenY = (pixel.y * PIXEL_SIZE * zoom) - viewportOffset.y;
      
      if (screenX >= -PIXEL_SIZE && screenX <= CANVAS_WIDTH && 
          screenY >= -PIXEL_SIZE && screenY <= CANVAS_HEIGHT) {
        
        ctx.fillStyle = pixel.color;
        ctx.fillRect(screenX + 1, screenY + 1, PIXEL_SIZE * zoom - 2, PIXEL_SIZE * zoom - 2);

        // Highlight owned pixels
        if (pixel.owner === address) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, screenY, PIXEL_SIZE * zoom, PIXEL_SIZE * zoom);
        }
      }
    });

    // Draw other users' cursors
    userCursors.forEach((cursor, userId) => {
      const screenX = (cursor.x * PIXEL_SIZE * zoom) - viewportOffset.x;
      const screenY = (cursor.y * PIXEL_SIZE * zoom) - viewportOffset.y;
      
      if (screenX >= -20 && screenX <= CANVAS_WIDTH && screenY >= -20 && screenY <= CANVAS_HEIGHT) {
        // Draw cursor
        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.arc(screenX + PIXEL_SIZE * zoom / 2, screenY + PIXEL_SIZE * zoom / 2, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw user indicator
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = '12px Arial';
        ctx.fillText(userId.substring(0, 8), screenX + 15, screenY - 5);
      }
    });

    // Draw current position indicator
    if (isConnected) {
      const screenX = (currentCursor.x * PIXEL_SIZE * zoom) - viewportOffset.x;
      const screenY = (currentCursor.y * PIXEL_SIZE * zoom) - viewportOffset.y;
      
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, PIXEL_SIZE * zoom, PIXEL_SIZE * zoom);
    }

  }, [pixels, userCursors, currentCursor, selectedColor, viewportOffset, zoom, address, isConnected]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (isDragging) {
      const deltaX = mouseX - dragStart.x;
      const deltaY = mouseY - dragStart.y;
      
      setViewportOffset(prev => ({
        x: Math.max(0, Math.min(prev.x - deltaX, GRID_WIDTH * PIXEL_SIZE * zoom - CANVAS_WIDTH)),
        y: Math.max(0, Math.min(prev.y - deltaY, GRID_HEIGHT * PIXEL_SIZE * zoom - CANVAS_HEIGHT))
      }));
      
      setDragStart({ x: mouseX, y: mouseY });
      return;
    }

    const x = Math.floor((mouseX + viewportOffset.x) / (PIXEL_SIZE * zoom));
    const y = Math.floor((mouseY + viewportOffset.y) / (PIXEL_SIZE * zoom));

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      setCurrentCursor({ x, y });
      
      // Send cursor position to other users
      if (wsRef.current && isConnected) {
        wsRef.current.sendCursorUpdate(x, y, selectedColor);
      }
    }
  }, [isDragging, dragStart, viewportOffset, zoom, selectedColor, isConnected]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (event.button === 2) { // Right click for panning
      setIsDragging(true);
      setDragStart({ x: mouseX, y: mouseY });
      return;
    }

    // Left click for painting
    const x = Math.floor((mouseX + viewportOffset.x) / (PIXEL_SIZE * zoom));
    const y = Math.floor((mouseY + viewportOffset.y) / (PIXEL_SIZE * zoom));

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      handlePixelPaint(x, y);
    }
  }, [viewportOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(prev * zoomFactor, 4)));
  }, []);

  // Paint pixel function
  const handlePixelPaint = async (x: number, y: number) => {
    if (!isConnected || !address || !pixelPrice) {
      alert("Please connect your wallet and wait for contract to load");
      return;
    }

    setIsLoading(true);
    try {
      const colorValue = parseInt(selectedColor.replace('#', ''), 16);
      
      const tx = await paintPixel({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelCanvasV2ABI,
        functionName: 'paintPixel',
        args: [x, y, colorValue],
        value: pixelPrice as bigint,
      });

      // Optimistic update
      const newPixel: Pixel = {
        x, y, color: selectedColor, owner: address,
        timestamp: Date.now(), version: 1
      };

      setPixels(prev => {
        const newPixels = new Map(prev);
        newPixels.set(`${x}-${y}`, newPixel);
        return newPixels;
      });

      // Notify other users
      if (wsRef.current) {
        wsRef.current.sendPixelUpdate(x, y, selectedColor, tx);
      }

    } catch (error: any) {
      console.error('Error painting pixel:', error);
      alert(`Failed: ${error.message || "Transaction failed"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`pixel-canvas-container ${className || ''}`}>
      {/* Status Bar */}
      <div className="status-bar">
        <div className={`connection-status ${connectionStatus}`}>
          <span className="status-indicator" />
          {connectionStatus === 'connected' ? 'Live Updates Active' : 
           connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </div>
        
        <div className="stats">
          <span>👥 {canvasStats.activeUsers} users</span>
          <span>🎨 {canvasStats.totalPixels} pixels</span>
          <span>⚡ {canvasStats.pixelsPerSecond.toFixed(1)}/sec</span>
          <span>🏆 {canvasStats.myPixels} mine</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="pixel-canvas"
          style={{
            cursor: isDragging ? 'grabbing' : isConnected ? 'crosshair' : 'not-allowed'
          }}
        />
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">Painting pixel...</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls">
        {/* Color Palette */}
        <div className="color-palette">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(4, prev * 1.25))}>+</button>
          <button onClick={() => { setZoom(1); setViewportOffset({ x: 0, y: 0 }); }}>Reset</button>
        </div>
      </div>

      <style jsx>{`
        .pixel-canvas-container {
          display: flex;
          flex-direction: column;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #f8f9fa;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background: #2d3748;
          color: white;
          font-size: 14px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #48bb78;
        }

        .connection-status.connecting .status-indicator {
          background: #ed8936;
          animation: pulse 1s infinite;
        }

        .connection-status.disconnected .status-indicator {
          background: #f56565;
        }

        .stats {
          display: flex;
          gap: 16px;
        }

        .canvas-wrapper {
          position: relative;
          display: inline-block;
        }

        .pixel-canvas {
          display: block;
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }

        .loading-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          font-weight: 500;
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: white;
        }

        .color-palette {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .color-swatch {
          width: 32px;
          height: 32px;
          border: 2px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-swatch.selected {
          border-color: #2d3748;
          transform: scale(1.1);
        }

        .color-swatch:hover {
          transform: scale(1.05);
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zoom-controls button {
          padding: 4px 12px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .zoom-controls button:hover {
          background: #f7fafc;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};