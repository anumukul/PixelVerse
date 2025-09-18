import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { usePortfolioStore } from '../stores/portfolioStore';

export const MyPixelsDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { pixels, setViewPort } = useCanvasStore();
  const { 
    ownedPixels, 
    userStats, 
    showOwnedPixels,
    setShowOwnedPixels,
    updateOwnedPixels 
  } = usePortfolioStore();

  useEffect(() => {
    if (address && isConnected) {
      updateOwnedPixels(address, pixels);
    }
  }, [address, isConnected, pixels, updateOwnedPixels]);

  const navigateToPixel = (pixel: any) => {
    setViewPort(pixel.x, pixel.y, Math.max(4, 1));
  };

  const toggleHighlight = () => {
    setShowOwnedPixels(!showOwnedPixels);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!isConnected) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">My Pixels</h3>
      
      {userStats.totalPixels === 0 ? (
        <div className="text-center py-4">
          <div className="text-gray-500 text-sm">No pixels owned yet</div>
          <div className="text-gray-400 text-xs mt-1">Paint your first pixel to start collecting!</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded">
              <div className="font-medium text-blue-900">{userStats.totalPixels}</div>
              <div className="text-blue-700">Pixels Owned</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="font-medium text-green-900">{userStats.totalSpent.toFixed(3)} STT</div>
              <div className="text-green-700">Total Spent</div>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <div className="font-medium text-purple-900">{userStats.uniqueColors}</div>
              <div className="text-purple-700">Colors Used</div>
            </div>
            <div className="bg-amber-50 p-2 rounded flex items-center">
              <div
                className="w-3 h-3 rounded mr-1 border border-gray-400"
                style={{ backgroundColor: userStats.favoriteColor }}
              />
              <div>
                <div className="font-medium text-amber-900 text-xs">Favorite</div>
                <div className="text-amber-700 text-xs">Color</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={toggleHighlight}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                showOwnedPixels
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {showOwnedPixels ? 'Hide My Pixels' : 'Highlight My Pixels'}
            </button>
          </div>

          {userStats.firstPixelDate && (
            <div className="text-xs text-gray-500 border-t pt-2">
              <div>First pixel: {formatDate(userStats.firstPixelDate)}</div>
              {userStats.lastPixelDate !== userStats.firstPixelDate && (
                <div>Latest: {formatDate(userStats.lastPixelDate!)}</div>
              )}
            </div>
          )}

          <div className="border-t pt-3">
            <div className="text-xs text-gray-600 mb-2">Recent Pixels</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {ownedPixels.slice(0, 8).map((pixel) => (
                <button
                  key={`${pixel.x}-${pixel.y}`}
                  onClick={() => navigateToPixel(pixel)}
                  className="w-full flex items-center gap-2 p-1 hover:bg-gray-50 rounded text-xs transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded border border-gray-300"
                    style={{ backgroundColor: pixel.color }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">({pixel.x}, {pixel.y})</div>
                  </div>
                  <div className="text-gray-500">{formatDate(pixel.timestamp)}</div>
                </button>
              ))}
            </div>
            
            {ownedPixels.length > 8 && (
              <div className="text-xs text-gray-400 mt-1 text-center">
                +{ownedPixels.length - 8} more pixels
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div>💡 Your pixels have green borders on the canvas</div>
            <div>💡 Click any pixel above to navigate to it</div>
            <div>💡 Use highlight to easily find all your pixels</div>
          </div>
        </div>
      )}
    </div>
  );
};