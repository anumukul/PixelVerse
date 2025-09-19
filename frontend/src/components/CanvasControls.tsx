import React, { useState } from 'react';
import { useCanvasStore } from '../stores/canvasStore.ts';
import { useContractEvents } from '../hooks/useContractEvents';
import type { Pixel } from '../types';

export const CanvasControls: React.FC = () => {
  const { viewPort, pixels, setViewPort, showGrid, setShowGrid } = useCanvasStore();
  const { refreshCanvas } = useContractEvents();
  const [jumpCoords, setJumpCoords] = useState({ x: '', y: '' });

  const zoomIn = () => {
    const newScale = Math.min(10, viewPort.scale * 1.2);
    setViewPort(viewPort.x, viewPort.y, newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(0.1, viewPort.scale * 0.8);
    setViewPort(viewPort.x, viewPort.y, newScale);
  };

  const resetView = () => {
    setViewPort(500, 500, 1);
  };

  const centerView = () => {
    setViewPort(500, 500, viewPort.scale);
  };

  const fitToContent = () => {
    const validPixels = Array.from(pixels.values()).filter((p: Pixel) => p.painter !== 'pending');
    
    if (validPixels.length === 0) {
      centerView();
      return;
    }

    let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
    validPixels.forEach((pixel: Pixel) => {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = maxX - minX + 20;
    const height = maxY - minY + 20;
    const scale = Math.min(800 / width, 600 / height, 5);

    setViewPort(centerX, centerY, Math.max(0.5, scale));
  };

  const jumpToCoordinate = () => {
    const x = parseInt(jumpCoords.x);
    const y = parseInt(jumpCoords.y);
    
    if (isNaN(x) || isNaN(y) || x < 0 || x >= 1000 || y < 0 || y >= 1000) {
      alert('Please enter valid coordinates (0-999)');
      return;
    }
    
    setViewPort(x, y, Math.max(2, viewPort.scale));
    setJumpCoords({ x: '', y: '' });
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Controls</h3>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={zoomIn}
            className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Zoom +
          </button>
          <button
            onClick={zoomOut}
            className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Zoom -
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={centerView}
            className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Center
          </button>
          <button
            onClick={fitToContent}
            className="flex-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
          >
            Fit Art
          </button>
        </div>

        <button
          onClick={toggleGrid}
          className={`w-full px-3 py-1 rounded text-sm transition-colors ${
            showGrid
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        
        <button
          onClick={resetView}
          className="w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
        >
          Reset View
        </button>

        <button
          onClick={refreshCanvas}
          className="w-full px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm transition-colors"
        >
          Refresh Canvas
        </button>

        <div className="border-t pt-3">
          <div className="text-xs text-gray-600 mb-2">Jump to Coordinate</div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              placeholder="X (0-999)"
              value={jumpCoords.x}
              onChange={(e) => setJumpCoords({ ...jumpCoords, x: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
              min="0"
              max="999"
            />
            <input
              type="number"
              placeholder="Y (0-999)"
              value={jumpCoords.y}
              onChange={(e) => setJumpCoords({ ...jumpCoords, y: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
              min="0"
              max="999"
            />
          </div>
          <button
            onClick={jumpToCoordinate}
            disabled={!jumpCoords.x || !jumpCoords.y}
            className="w-full px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs transition-colors"
          >
            Jump
          </button>
        </div>
      </div>

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
        <div>Zoom: {(viewPort.scale * 100).toFixed(0)}%</div>
        <div>Position: {Math.round(viewPort.x)}, {Math.round(viewPort.y)}</div>
        <div>Pixels: {Array.from(pixels.values()).filter((p: Pixel) => p.painter !== 'pending').length}</div>
        <div>Grid: {showGrid ? 'Visible' : 'Hidden'}</div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <div>Left click: Paint pixel</div>
        <div>Right drag: Pan canvas</div>
        <div>Scroll: Zoom in/out</div>
        <div>Hover: View pixel info</div>
        <div>Grid auto-shows at 2x+ zoom</div>
      </div>
    </div>
  );
};