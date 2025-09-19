import React, { useRef, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useWalletStore } from '../stores/walletStore';
import { PixelTooltip } from './PixelTooltip';
import type { Pixel, UserCursor } from '../types';

const CANVAS_SIZE = 1000;
const CURSOR_BLOCKCHAIN_THROTTLE = 3000;

interface PixelCanvasProps {
  onTransactionStart: (hash: string) => void;
  onTransactionUpdate: (hash: string, status: 'confirmed' | 'failed') => void;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({ 
  onTransactionStart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    pixels, 
    cursors,
    selectedColor, 
    viewPort, 
    dragStart,
    batchMode,
    selection,
    shapeMode,
    freehandPath,
    hoveredPixel,
    tooltipPosition,
    showTooltip,
    showGrid,
    setDragStart,
    setViewPort,
    addPendingPixel,
    removePendingPixel,
    updateCursor,
    startSelection,
    updateSelection,
    endSelection,
    addToFreehandPath,
    clearFreehandPath,
    setHoveredPixel,
    hideTooltip,
    getPixelAt
  } = useCanvasStore();
  const { 
    showOwnedPixels, 
    updateOwnedPixels,
    isUserPixel 
  } = usePortfolioStore();
  const { paintPixel, updateCursorOnBlockchain } = useWalletStore();
  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const pendingPixels = useRef(new Map<string, {x: number, y: number, timeout: NodeJS.Timeout}>());
  const lastBlockchainCursorUpdate = useRef(0);
  const lastCursorPosition = useRef({ x: -1, y: -1 });
  const isDrawingFreehand = useRef(false);

  useEffect(() => {
    if (address && isConnected) {
      updateOwnedPixels(address, pixels);
    }
  }, [pixels, address, isConnected, updateOwnedPixels]);

  const getRandomColor = (address: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308', 
      '#84CC16', '#22C55E', '#10B981', '#14B8A6',
      '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
      '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
    ];
    
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const drawShapePreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!batchMode || !selection) return;

    const { startX, startY, endX, endY } = selection;
    
    switch (shapeMode) {
      case 'rectangle': {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        
        const screenStartX = (minX - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
        const screenStartY = (minY - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
        const screenEndX = (maxX + 1 - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
        const screenEndY = (maxY + 1 - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
        
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(screenStartX, screenStartY, screenEndX - screenStartX, screenEndY - screenStartY);
        
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(screenStartX, screenStartY, screenEndX - screenStartX, screenEndY - screenStartY);
        break;
      }
      
      case 'circle': {
        const centerX = startX;
        const centerY = startY;
        const radius = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
        
        const screenCenterX = (centerX - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
        const screenCenterY = (centerY - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
        const screenRadius = radius * viewPort.scale;
        
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(screenCenterX, screenCenterY, screenRadius, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        break;
      }
      
      case 'line': {
        const screenStartX = (startX - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
        const screenStartY = (startY - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
        const screenEndX = (endX - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
        const screenEndY = (endY - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
        
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(screenStartX, screenStartY);
        ctx.lineTo(screenEndX, screenEndY);
        ctx.stroke();
        break;
      }
    }
  }, [batchMode, selection, shapeMode, selectedColor, viewPort]);

  const drawFreehandPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (shapeMode !== 'freehand' || freehandPath.length === 0) return;

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();

    freehandPath.forEach((point: {x: number, y: number}, index: number) => {
      const screenX = (point.x - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
      const screenY = (point.y - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
      
      if (index === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    });
    
    ctx.stroke();

    freehandPath.forEach((point: {x: number, y: number}) => {
      const screenX = (point.x - viewPort.x) * viewPort.scale + ctx.canvas.width / 2;
      const screenY = (point.y - viewPort.y) * viewPort.scale + ctx.canvas.height / 2;
      const pixelSize = Math.max(2, viewPort.scale);
      
      ctx.fillStyle = selectedColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(screenX, screenY, pixelSize, pixelSize);
    });
  }, [shapeMode, freehandPath, selectedColor, viewPort]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid when zoomed in or when explicitly enabled
    if ((viewPort.scale >= 2 && showGrid) || (showGrid && viewPort.scale >= 1)) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      
      const startX = Math.floor(viewPort.x - canvas.width / 2 / viewPort.scale);
      const endX = Math.ceil(viewPort.x + canvas.width / 2 / viewPort.scale);
      const startY = Math.floor(viewPort.y - canvas.height / 2 / viewPort.scale);
      const endY = Math.ceil(viewPort.y + canvas.height / 2 / viewPort.scale);
      
      for (let x = startX; x <= endX; x++) {
        const screenX = (x - viewPort.x) * viewPort.scale + canvas.width / 2;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
      }
      
      for (let y = startY; y <= endY; y++) {
        const screenY = (y - viewPort.y) * viewPort.scale + canvas.height / 2;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1.0;
    }

    // Draw pixels
    pixels.forEach((pixel: Pixel) => {
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

      // Add ownership indicators
      if (address && isUserPixel(pixel, address)) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = Math.max(1, viewPort.scale * 0.2);
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(screenX - 1, screenY - 1, pixelSize + 2, pixelSize + 2);
        
        if (viewPort.scale >= 3) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(screenX + pixelSize - 2, screenY, 2, 2);
        }
      }

      // Highlight owned pixels when feature is active
      if (showOwnedPixels && address && isUserPixel(pixel, address)) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = Math.max(2, viewPort.scale * 0.3);
        ctx.globalAlpha = 1.0;
        ctx.strokeRect(screenX - 2, screenY - 2, pixelSize + 4, pixelSize + 4);
        
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = Math.max(2, viewPort.scale * 0.5);
        ctx.strokeRect(screenX - 1, screenY - 1, pixelSize + 2, pixelSize + 2);
        ctx.shadowBlur = 0;
      }

      // Hover highlight
      if (hoveredPixel && pixel.x === hoveredPixel.x && pixel.y === hoveredPixel.y) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(screenX - 1, screenY - 1, pixelSize + 2, pixelSize + 2);
      }
    });

    // Draw shape previews
    if (batchMode) {
      drawShapePreview(ctx);
      drawFreehandPreview(ctx);
    }

    // User cursors
    cursors.forEach((cursor: UserCursor) => {
      if (cursor.address === address) return;
      
      const screenX = (cursor.x - viewPort.x) * viewPort.scale + canvas.width / 2;
      const screenY = (cursor.y - viewPort.y) * viewPort.scale + canvas.height / 2;
      
      if (screenX >= -20 && screenX <= canvas.width + 20 && 
          screenY >= -20 && screenY <= canvas.height + 20) {
        
        const cursorColor = getRandomColor(cursor.address);
        
        ctx.fillStyle = cursorColor;
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        ctx.arc(screenX + 2, screenY + 2, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX + 2, screenY + 2, 2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = cursorColor;
        ctx.font = '10px sans-serif';
        ctx.globalAlpha = 0.9;
        ctx.fillText(
          cursor.address.slice(0, 6) + '...',
          screenX + 8,
          screenY - 2
        );
      }
    });
    
    ctx.globalAlpha = 1.0; 
  }, [pixels, cursors, viewPort, address, batchMode, hoveredPixel, showOwnedPixels, isUserPixel, drawShapePreview, drawFreehandPreview]);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragStart && !batchMode) {
      const deltaX = (e.clientX - dragStart.x) / viewPort.scale;
      const deltaY = (e.clientY - dragStart.y) / viewPort.scale;
      setViewPort(viewPort.x - deltaX, viewPort.y - deltaY, viewPort.scale);
      setDragStart({ x: e.clientX, y: e.clientY });
      hideTooltip();
    } else if (batchMode && selection?.isSelecting) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        if (shapeMode === 'freehand' && isDrawingFreehand.current) {
          addToFreehandPath(x, y);
        } else {
          updateSelection(x, y);
        }
      }
      hideTooltip();
    } else if (isConnected && address) {
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        updateCursor({
          address,
          x,
          y,
          timestamp: Date.now()
        });

        const existingPixel = getPixelAt(x, y);
        if (existingPixel && !batchMode) {
          const canvas = canvasRef.current;
          const rect = canvas?.getBoundingClientRect();
          if (rect) {
            setHoveredPixel(existingPixel, {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            });
          }
        } else {
          hideTooltip();
        }

        const now = Date.now();
        const hasPositionChanged = lastCursorPosition.current.x !== x || lastCursorPosition.current.y !== y;
        
        if (hasPositionChanged && now - lastBlockchainCursorUpdate.current > CURSOR_BLOCKCHAIN_THROTTLE) {
          updateCursorOnBlockchain(x, y);
          lastBlockchainCursorUpdate.current = now;
          lastCursorPosition.current = { x, y };
        }
      } else {
        hideTooltip();
      }
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
    setDragStart(null);
    isDrawingFreehand.current = false;
  };

  const handleClick = async (e: React.MouseEvent) => {
    if (!isConnected) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      if (batchMode) return;
      
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

    hideTooltip();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    if (e.button === 2 && !batchMode) {
      setDragStart({ x: e.clientX, y: e.clientY });
      hideTooltip();
    } else if (batchMode && e.button === 0) {
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        if (shapeMode === 'freehand') {
          isDrawingFreehand.current = true;
          clearFreehandPath();
          addToFreehandPath(x, y);
        } else {
          startSelection(x, y);
        }
      }
      hideTooltip();
    }
  };

  const handleMouseUp = () => {
    if (batchMode && selection?.isSelecting) {
      endSelection();
    } else {
      setDragStart(null);
    }
    isDrawingFreehand.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, viewPort.scale * scaleChange));
      setViewPort(viewPort.x, viewPort.y, newScale);
      hideTooltip();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [viewPort, setViewPort, hideTooltip]);

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

  const cursorClass = batchMode ? 'cursor-crosshair' : 'cursor-crosshair';

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={`border border-gray-300 select-none ${cursorClass}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={e => e.preventDefault()}
      />
      
      <PixelTooltip 
        pixel={hoveredPixel}
        position={tooltipPosition}
        visible={showTooltip}
      />
    </div>
  );
};