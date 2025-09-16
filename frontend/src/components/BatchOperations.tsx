// frontend/src/components/BatchOperations.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS } from '../config/contract';
import { pixelCanvasV2ABI } from '../config/abi';

interface BatchPixel {
  x: number;
  y: number;
  color: string;
}

interface Props {
  onBatchComplete?: (pixels: BatchPixel[]) => void;
  className?: string;
}

type DrawingTool = 'pencil' | 'rectangle' | 'circle' | 'line' | 'flood' | 'text';

export const BatchOperations: React.FC<Props> = ({ onBatchComplete, className }) => {
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('rectangle');
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [batchPixels, setBatchPixels] = useState<BatchPixel[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [previewPixels, setPreviewPixels] = useState<BatchPixel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { address, isConnected } = useAccount();

  const { data: pixelPrice } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: pixelCanvasV2ABI,
    functionName: 'pixelPrice',
  });

  const { writeContractAsync: batchPaintPixels } = useWriteContract();

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

  // Drawing functions
  const drawRectangle = useCallback((x1: number, y1: number, x2: number, y2: number, fill: boolean = false): BatchPixel[] => {
    const pixels: BatchPixel[] = [];
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    if (fill) {
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          pixels.push({ x, y, color: selectedColor });
        }
      }
    } else {
      // Draw border
      for (let x = minX; x <= maxX; x++) {
        pixels.push({ x, y: minY, color: selectedColor });
        pixels.push({ x, y: maxY, color: selectedColor });
      }
      for (let y = minY; y <= maxY; y++) {
        pixels.push({ x: minX, y, color: selectedColor });
        pixels.push({ x: maxX, y, color: selectedColor });
      }
    }

    return pixels.filter(p => p.x >= 0 && p.x < GRID_WIDTH && p.y >= 0 && p.y < GRID_HEIGHT);
  }, [selectedColor]);

  const drawCircle = useCallback((centerX: number, centerY: number, radius: number, fill: boolean = false): BatchPixel[] => {
    const pixels: BatchPixel[] = [];
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (fill ? distance <= radius : Math.abs(distance - radius) < 0.8) {
          if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
            pixels.push({ x, y, color: selectedColor });
          }
        }
      }
    }

    return pixels;
  }, [selectedColor]);

  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number): BatchPixel[] => {
    const pixels: BatchPixel[] = [];
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let currentX = x1;
    let currentY = y1;

    while (true) {
      if (currentX >= 0 && currentX < GRID_WIDTH && currentY >= 0 && currentY < GRID_HEIGHT) {
        pixels.push({ x: currentX, y: currentY, color: selectedColor });
      }

      if (currentX === x2 && currentY === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currentX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currentY += sy;
      }
    }

    return pixels;
  }, [selectedColor]);

  const drawText = useCallback((startX: number, startY: number, text: string): BatchPixel[] => {
    const pixels: BatchPixel[] = [];
    
    // Simple bitmap font - 5x7 characters
    const font: { [key: string]: boolean[][] } = {
      'A': [
        [false, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, true, true, true, true],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, false, false, false, true]
      ],
      'B': [
        [true, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, true, true, true, false]
      ],
      'C': [
        [false, true, true, true, false],
        [true, false, false, false, true],
        [true, false, false, false, false],
        [true, false, false, false, false],
        [true, false, false, false, false],
        [true, false, false, false, true],
        [false, true, true, true, false]
      ],
      ' ': Array(7).fill(Array(5).fill(false))
    };

    let currentX = startX;
    
    for (const char of text.toUpperCase()) {
      const charPattern = font[char] || font[' '];
      
      for (let row = 0; row < charPattern.length; row++) {
        for (let col = 0; col < charPattern[row].length; col++) {
          if (charPattern[row][col]) {
            const x = currentX + col;
            const y = startY + row;
            if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
              pixels.push({ x, y, color: selectedColor });
            }
          }
        }
      }
      
      currentX += 6; // Character width + spacing
    }

    return pixels;
  }, [selectedColor]);

  // Canvas event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isConnected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    setIsDrawing(true);
    setStartPos({ x, y });

    if (selectedTool === 'pencil') {
      const newPixel = { x, y, color: selectedColor };
      setBatchPixels(prev => [...prev, newPixel]);
    }
  }, [isConnected, selectedTool, selectedColor]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const currentY = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    let preview: BatchPixel[] = [];

    switch (selectedTool) {
      case 'rectangle':
        preview = drawRectangle(startPos.x, startPos.y, currentX, currentY);
        break;
      case 'circle':
        const radius = Math.sqrt((currentX - startPos.x) ** 2 + (currentY - startPos.y) ** 2);
        preview = drawCircle(startPos.x, startPos.y, Math.round(radius));
        break;
      case 'line':
        preview = drawLine(startPos.x, startPos.y, currentX, currentY);
        break;
      case 'pencil':
        const newPixel = { x: currentX, y: currentY, color: selectedColor };
        setBatchPixels(prev => [...prev, newPixel]);
        break;
    }

    setPreviewPixels(preview);
  }, [isDrawing, startPos, selectedTool, drawRectangle, drawCircle, drawLine, selectedColor]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPos) return;

    if (selectedTool !== 'pencil') {
      setBatchPixels(prev => [...prev, ...previewPixels]);
      setPreviewPixels([]);
    }

    setIsDrawing(false);
    setStartPos(null);
  }, [isDrawing, startPos, selectedTool, previewPixels]);

  // Handle text tool
  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;

    const textPixels = drawText(5, 5, textInput);
    setBatchPixels(prev => [...prev, ...textPixels]);
    setTextInput('');
  }, [textInput, drawText]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
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

    // Draw batch pixels
    [...batchPixels, ...previewPixels].forEach(pixel => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * PIXEL_SIZE + 1,
        pixel.y * PIXEL_SIZE + 1,
        PIXEL_SIZE - 2,
        PIXEL_SIZE - 2
      );
    });

    // Draw preview pixels with transparency
    if (previewPixels.length > 0) {
      ctx.globalAlpha = 0.5;
      previewPixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
          pixel.x * PIXEL_SIZE + 1,
          pixel.y * PIXEL_SIZE + 1,
          PIXEL_SIZE - 2,
          PIXEL_SIZE - 2
        );
      });
      ctx.globalAlpha = 1.0;
    }
  }, [batchPixels, previewPixels]);

  React.useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Submit batch operation
  const handleSubmitBatch = async () => {
    if (!isConnected || !address || !pixelPrice || batchPixels.length === 0) {
      alert("Please connect wallet and add some pixels to batch");
      return;
    }

    if (batchPixels.length > 50) {
      alert("Batch size limited to 50 pixels. Please reduce your selection.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Remove duplicates
      const uniquePixels = Array.from(
        new Map(batchPixels.map(p => [`${p.x}-${p.y}`, p])).values()
      );

      const xCoords = uniquePixels.map(p => p.x);
      const yCoords = uniquePixels.map(p => p.y);
      const colors = uniquePixels.map(p => parseInt(p.color.replace('#', ''), 16));
      const totalCost = pixelPrice * BigInt(uniquePixels.length);

      console.log('Submitting batch:', { 
        pixelCount: uniquePixels.length, 
        totalCost: totalCost.toString()
      });

      const tx = await batchPaintPixels({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: pixelCanvasV2ABI,
        functionName: 'batchPaintPixels',
        args: [xCoords, yCoords, colors],
        value: totalCost,
      });

      console.log('Batch transaction sent:', tx);
      
      // Notify parent component
      onBatchComplete?.(uniquePixels);
      
      // Clear batch
      setBatchPixels([]);
      setPreviewPixels([]);

      alert(`Successfully submitted batch of ${uniquePixels.length} pixels!`);

    } catch (error: any) {
      console.error('Error submitting batch:', error);
      alert(`Batch failed: ${error.message || "Transaction failed"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearBatch = () => {
    setBatchPixels([]);
    setPreviewPixels([]);
  };

  const totalCost = pixelPrice ? (pixelPrice * BigInt(batchPixels.length)) : BigInt(0);

  return (
    <div className={`batch-operations ${className || ''}`}>
      <div className="batch-header">
        <h3>🎨 Batch Drawing Tools</h3>
        <div className="batch-info">
          <span className="pixel-count">{batchPixels.length} pixels</span>
          <span className="total-cost">
            Cost: {Number(totalCost) / 1e18} STT
          </span>
        </div>
      </div>

      {/* Tool Selection */}
      <div className="tool-selection">
        <div className="tools-grid">
          {[
            { tool: 'pencil', icon: '✏️', label: 'Pencil' },
            { tool: 'rectangle', icon: '⬜', label: 'Rectangle' },
            { tool: 'circle', icon: '⭕', label: 'Circle' },
            { tool: 'line', icon: '📏', label: 'Line' },
            { tool: 'text', icon: '🔤', label: 'Text' },
          ].map(({ tool, icon, label }) => (
            <button
              key={tool}
              className={`tool-btn ${selectedTool === tool ? 'active' : ''}`}
              onClick={() => setSelectedTool(tool as DrawingTool)}
              title={label}
            >
              <span className="tool-icon">{icon}</span>
              <span className="tool-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Input for Text Tool */}
      {selectedTool === 'text' && (
        <div className="text-input-section">
          <div className="text-input-group">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value.substring(0, 10))}
              placeholder="Enter text (max 10 chars)"
              className="text-input"
              maxLength={10}
            />
            <button onClick={handleAddText} className="add-text-btn">
              Add Text
            </button>
          </div>
          <small className="text-hint">Text will be added at position (5, 5)</small>
        </div>
      )}

      {/* Color Palette */}
      <div className="color-section">
        <label>Selected Color:</label>
        <div className="color-palette">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-section">
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="batch-canvas"
            style={{
              cursor: isConnected ? 
                (selectedTool === 'pencil' ? 'crosshair' : 'pointer') : 
                'not-allowed'
            }}
          />
          
          {isSubmitting && (
            <div className="canvas-overlay">
              <div className="overlay-content">
                <div className="spinner"></div>
                <p>Submitting batch transaction...</p>
              </div>
            </div>
          )}
        </div>

        <div className="canvas-instructions">
          <p>
            <strong>Instructions:</strong> 
            {selectedTool === 'pencil' && " Click and drag to draw freehand"}
            {selectedTool === 'rectangle' && " Click and drag to draw a rectangle"}
            {selectedTool === 'circle' && " Click and drag from center to edge"}
            {selectedTool === 'line' && " Click and drag to draw a line"}
            {selectedTool === 'text' && " Enter text above and click 'Add Text'"}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          onClick={clearBatch}
          className="clear-btn"
          disabled={batchPixels.length === 0}
        >
          🗑️ Clear All ({batchPixels.length})
        </button>
        
        <button
          onClick={handleSubmitBatch}
          className="submit-btn"
          disabled={!isConnected || batchPixels.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              Submitting...
            </>
          ) : (
            <>
              🚀 Submit Batch ({batchPixels.length} pixels)
            </>
          )}
        </button>
      </div>

      {/* Usage Stats */}
      <div className="usage-stats">
        <div className="stat-item">
          <span className="stat-label">Max Batch Size:</span>
          <span className="stat-value">50 pixels</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Current Batch:</span>
          <span className="stat-value">{batchPixels.length} pixels</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Estimated Gas:</span>
          <span className="stat-value">{(batchPixels.length * 100000).toLocaleString()}</span>
        </div>
      </div>

      <style jsx>{`
        .batch-operations {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-width: 600px;
        }

        .batch-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }

        .batch-header h3 {
          margin: 0;
          color: #2d3748;
          font-size: 20px;
        }

        .batch-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .pixel-count {
          background: #4299e1;
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .total-cost {
          background: #48bb78;
          color: white;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .tool-selection {
          margin-bottom: 20px;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 8px;
        }

        .tool-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tool-btn:hover {
          border-color: #cbd5e0;
          background: #f7fafc;
        }

        .tool-btn.active {
          border-color: #4299e1;
          background: #ebf8ff;
          color: #2b6cb0;
        }

        .tool-icon {
          font-size: 20px;
          margin-bottom: 4px;
        }

        .tool-label {
          font-size: 12px;
          font-weight: 500;
        }

        .text-input-section {
          margin-bottom: 20px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .text-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .text-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 14px;
        }

        .add-text-btn {
          padding: 8px 16px;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .text-hint {
          color: #718096;
          font-style: italic;
        }

        .color-section {
          margin-bottom: 20px;
        }

        .color-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #2d3748;
        }

        .color-palette {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .color-btn {
          width: 32px;
          height: 32px;
          border: 3px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-btn:hover {
          transform: scale(1.1);
        }

        .color-btn.selected {
          border-color: #2d3748;
          transform: scale(1.1);
        }

        .canvas-section {
          margin-bottom: 20px;
        }

        .canvas-container {
          position: relative;
          display: inline-block;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .batch-canvas {
          display: block;
          image-rendering: pixelated;
        }

        .canvas-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .overlay-content {
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        .canvas-instructions {
          margin-top: 12px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 6px;
        }

        .canvas-instructions p {
          margin: 0;
          font-size: 14px;
          color: #4a5568;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .clear-btn, .submit-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .clear-btn {
          background: #fed7d7;
          color: #c53030;
        }

        .clear-btn:hover:not(:disabled) {
          background: #fbb6ce;
        }

        .clear-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .submit-btn {
          background: #48bb78;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #38a169;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .usage-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: #718096;
          font-size: 14px;
        }

        .stat-value {
          font-weight: 600;
          color: #2d3748;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};