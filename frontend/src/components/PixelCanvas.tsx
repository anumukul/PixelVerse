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

    const visibleStartX = Math.max(0, Math.floor(viewPort.x - canvas.width / (2 * viewPort.scale)));
    const visibleEndX = Math.min(CANVAS_SIZE, Math.ceil(viewPort.x + canvas.width / (2 * viewPort.scale)));
    const visibleStartY = Math.max(0, Math.floor(viewPort.y - canvas.height / (2 * viewPort.scale)));
    const visibleEndY = Math.min(CANVAS_SIZE, Math.ceil(viewPort.y + canvas.height / (2 * viewPort.scale)));

    for (let x = visibleStartX; x < visibleEndX; x++) {
      for (let y = visibleStartY; y < visibleEndY; y++) {
        const pixel = getPixelAt(x, y);
        if (pixel) {
          ctx.fillStyle = pixel.color;
          const screenX = (x - viewPort.x) * viewPort.scale + canvas.width / 2;
          const screenY = (y - viewPort.y) * viewPort.scale + canvas.height / 2;
          ctx.fillRect(screenX, screenY, viewPort.scale, viewPort.scale);
        }
      }
    }

    cursors.forEach(cursor => {
      if (cursor.address !== address) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        const screenX = (cursor.x - viewPort.x) * viewPort.scale + canvas.width / 2;
        const screenY = (cursor.y - viewPort.y) * viewPort.scale + canvas.height / 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [pixels, cursors, viewPort, getPixelAt, address]);

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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, viewPort.scale * scaleChange));
    setViewPort(viewPort.x, viewPort.y, newScale);
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
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
    />
  );
};