import React from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore.ts';
import { useWalletStore } from '../stores/walletStore';

interface BatchPaintControlsProps {
  onTransactionStart: (hash: string) => void;
}

type ShapeType = 'rectangle' | 'circle' | 'line' | 'freehand';

export const BatchPaintControls: React.FC<BatchPaintControlsProps> = ({
  onTransactionStart
}) => {
  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const { 
    batchMode, 
    selectedColor,
    shapeMode,
    setBatchMode,
    clearSelection,
    getSelectedPixels,
    getSelectionCost,
    setShapeMode
  } = useCanvasStore();
  const { batchPaintPixels } = useWalletStore();

  const selectedPixels = getSelectedPixels();
  const totalCost = getSelectionCost();
  const hasSelection = selectedPixels.length > 0;

  const handleToggleBatchMode = () => {
    setBatchMode(!batchMode);
    if (batchMode) {
      setShapeMode('rectangle');
    }
  };

  const handleShapeSelect = (shape: ShapeType) => {
    setShapeMode(shape);
    clearSelection();
  };

  const handleClearSelection = () => {
    clearSelection();
  };

  const handleBatchPaint = async () => {
    if (!hasSelection || !isConnected) return;

    try {
      const pixelsToPaint = selectedPixels.map(({ x, y }) => ({
        x,
        y,
        color: selectedColor
      }));

      const hash = await batchPaintPixels(pixelsToPaint, writeContract);
      if (hash && typeof hash === 'string') {
        onTransactionStart(hash);
        clearSelection();
      }
    } catch (error) {
      console.error('Batch paint failed:', error);
    }
  };

  if (!isConnected) return null;

  const getShapeInstructions = (shape: ShapeType): string => {
    switch (shape) {
      case 'rectangle': return 'Click and drag to select area';
      case 'circle': return 'Click center, drag to set radius';
      case 'line': return 'Click start point, drag to end';
      case 'freehand': return 'Click and drag to draw freely';
      default: return 'Select a shape tool';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Batch Paint</h3>
      
      <div className="space-y-3">
        <button
          onClick={handleToggleBatchMode}
          className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
            batchMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {batchMode ? 'Exit Batch Mode' : 'Enter Batch Mode'}
        </button>

        {batchMode && (
          <>
            <div className="grid grid-cols-2 gap-1">
              {(['rectangle', 'circle', 'line', 'freehand'] as ShapeType[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleShapeSelect(shape)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    shapeMode === shape
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {shape === 'rectangle' && '□ Rect'}
                  {shape === 'circle' && '○ Circle'}
                  {shape === 'line' && '╱ Line'}
                  {shape === 'freehand' && '✎ Free'}
                </button>
              ))}
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800 mb-2">
                {getShapeInstructions(shapeMode)}
              </p>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Selected: {selectedPixels.length} pixels</div>
                <div>Cost: {totalCost.toFixed(4)} STT</div>
                {selectedPixels.length > 1 && (
                  <div className="font-medium">
                    Savings: {((selectedPixels.length * 0.001) - totalCost).toFixed(4)} STT
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearSelection}
                disabled={!hasSelection}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
              >
                Clear
              </button>
              
              <button
                onClick={handleBatchPaint}
                disabled={!hasSelection}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                Paint All
              </button>
            </div>

            {hasSelection && (
              <div className="text-xs text-gray-500">
                <div>Shape: {shapeMode}</div>
                <div>Single cost: {(selectedPixels.length * 0.001).toFixed(4)} STT</div>
                <div>Batch cost: {totalCost.toFixed(4)} STT</div>
              </div>
            )}
          </>
        )}

        {!batchMode && (
          <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
            <div>Single Paint Mode</div>
            <div>Click pixels to paint individually</div>
          </div>
        )}
      </div>
    </div>
  );
};