import React, { useRef, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { useWalletStore } from '../stores/walletStore';

const CANVAS_SIZE = 1000;

export const PixelCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    pixels, 
    cursors, 
    selectedColor, 
    viewPort, 
    dragStart,
    setDragStart,
    setViewPort,
    getPixelAt 
  } = useCanvasStore();
  const { paintPixel } = useWalletStore();
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
const draw = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  
  pixels.forEach((pixel) => {
    ctx.fillStyle = pixel.color;
    const screenX = (pixel.x - viewPort.x) * viewPort.scale + canvas.width / 2;
    const screenY = (pixel.y - viewPort.y) * viewPort.scale + canvas.height / 2;
    
    
    const pixelSize = Math.max(2, viewPort.scale);
    ctx.fillRect(screenX, screenY, pixelSize, pixelSize);
    
    console.log('Drawing pixel at screen coords:', { screenX, screenY, pixel }); 
  });
}, [pixels, viewPort]);




  useEffect(() => {
    draw();
  }, [draw]);

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
  console.log('Canvas click at:', { x, y }); 
  
  if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
    try {
      await paintPixel(x, y, selectedColor, writeContract);
    } catch (error) {
      console.error('Paint failed:', error);
    }
  }
};

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