import React from 'react';
import { useCanvasStore } from '../stores/canvasStore';

export const CanvasControls: React.FC = () => {
  const { viewPort, setViewPort } = useCanvasStore();

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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Controls</h3>
      
      <div className="space-y-2">
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
        
        <button
          onClick={centerView}
          className="w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
        >
          Center
        </button>
        
        <button
          onClick={resetView}
          className="w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
        >
          Reset View
        </button>
      </div>

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs space-y-1">
        <div>Zoom: {(viewPort.scale * 100).toFixed(0)}%</div>
        <div>Position: {viewPort.x}, {viewPort.y}</div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <div>Left click: Paint pixel</div>
        <div>Right drag: Pan canvas</div>
        <div>Scroll: Zoom in/out</div>
      </div>
    </div>
  );
};