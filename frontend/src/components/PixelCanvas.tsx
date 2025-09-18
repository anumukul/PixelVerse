import React, { useRef, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { useWalletStore } from '../stores/walletStore';

const CANVAS_SIZE = 1000;

interface PixelCanvasProps {
  onTransactionStart: (hash: string) => void;
  onTransactionUpdate: (hash: string, status: 'confirmed' | 'failed') => void;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({ 
  onTransactionStart, 
  onTransactionUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    pixels, 
    selectedColor, 
    viewPort, 
    dragStart,
    setDragStart,
    setViewPort,
    addPendingPixel,
    removePendingPixel
  } = useCanvasStore();
  const { paintPixel } = useWalletStore();
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const pendingPixels = useRef(new Map<string, {x: number, y: number, timeout: NodeJS.Timeout}>());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    pixels.forEach((pixel) => {
      if (pixel.painter === 'pending') {
        ctx.globalAlpha = 0.5; 
      } else {
        ctx.globalAlpha = 1.0;
      }
      
      ctx.fillStyle = pixel.color;
      const screenX = (pixel.x - viewPort.x) * viewPort.scale + canvas.width / 2;
      const screenY = (pixel.y - viewPort.y) * viewPort.scale + canvas.height / 2;
      
      const pixelSize = Math.max(2, viewPort.scale);
      ctx.fillRect(screenX, screenY, pixelSize, pixelSize);
    });
    
    ctx.globalAlpha = 1.0; 
  }, [pixels, viewPort]);

  useEffect(() => {
    draw();
  }, [draw]);

  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const relativeX = screenX - rect.left - canvas.width / 2;
    const relativeY = screenY - rect.top - canvas.height / 2;
    
    return {
      x: Math.floor(relativeX / viewPort.scale + viewPort.x),
      y: Math.floor(relativeY / viewPort.scale + viewPort.y)
    };
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (!isConnected) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      const pixelKey = `${x}-${y}`;
      
      if (pendingPixels.current.has(pixelKey)) {
        return;
      }

      try {
        addPendingPixel(x, y, selectedColor);
        
        const hash = await paintPixel(x, y, selectedColor, writeContract);
        if (hash && typeof hash === 'string') {
          onTransactionStart(hash);
          
          const timeout = setTimeout(() => {
            removePendingPixel(x, y);
            pendingPixels.current.delete(pixelKey);
          }, 30000);
          
          pendingPixels.current.set(pixelKey, { x, y, timeout });
        }
      } catch (error) {
        console.error('Paint failed:', error);
        removePendingPixel(x, y);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, viewPort.scale * scaleChange));
      setViewPort(viewPort.x, viewPort.y, newScale);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [viewPort, setViewPort]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart) {
      const deltaX = (e.clientX - dragStart.x) / viewPort.scale;
      const deltaY = (e.clientY - dragStart.y) / viewPort.scale;
      setViewPort(viewPort.x - deltaX, viewPort.y - deltaY, viewPort.scale);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  useEffect(() => {
    const cleanup = () => {
      pendingPixels.current.forEach(({ timeout }) => {
        clearTimeout(timeout);
      });
      pendingPixels.current.clear();
    };

    const interval = setInterval(() => {
      pendingPixels.current.forEach(({ x, y, timeout }, key) => {
        const actualPixel = pixels.get(`${x}-${y}`);
        if (actualPixel && actualPixel.painter !== 'pending') {
          clearTimeout(timeout);
          pendingPixels.current.delete(key);
        }
      });
    }, 1000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [pixels]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border border-gray-300 cursor-crosshair select-none"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
    />
  );
};