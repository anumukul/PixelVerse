import React from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { useWalletStore } from '../stores/walletStore';

interface BatchPaintControlsProps {
  onTransactionStart: (hash: string) => void;
}

export const BatchPaintControls: React.FC<BatchPaintControlsProps> = ({
  onTransactionStart
}) => {
  const { isConnected } = useAccount();
  const { writeContract } = useWriteContract();
  const { 
    batchMode, 
    selection,
    selectedColor,
    setBatchMode,
    clearSelection,
    getSelectedPixels,
    getSelectionCost
  } = useCanvasStore();
  const { batchPaintPixels } = useWalletStore();

  const selectedPixels = getSelectedPixels();
  const totalCost = getSelectionCost();
  const hasSelection = selectedPixels.length > 0;

  const handleToggleBatchMode = () => {
    setBatchMode(!batchMode);
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
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800 mb-2">
                Click and drag to select area
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
                <div>Area: {Math.abs((selection?.endX || 0) - (selection?.startX || 0) + 1)} × {Math.abs((selection?.endY || 0) - (selection?.startY || 0) + 1)}</div>
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