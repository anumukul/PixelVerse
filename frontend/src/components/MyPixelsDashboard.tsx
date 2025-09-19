import React, { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useCanvasStore } from '../stores/canvasStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

interface SellModalProps {
  tokenId: string;
  pixel: any;
  isOpen: boolean;
  onClose: () => void;
  onList: (tokenId: string, price: string) => void;
}

const SellModal: React.FC<SellModalProps> = ({ tokenId, pixel, isOpen, onClose, onList }) => {
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (price && parseFloat(price) > 0) {
      onList(tokenId, price);
      setPrice('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">List Pixel for Sale</h3>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded border border-gray-300"
              style={{ backgroundColor: pixel?.color }}
            />
            <div>
              <div className="font-medium">Pixel ({pixel?.x}, {pixel?.y})</div>
              <div className="text-sm text-gray-500">{pixel?.color}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (STT)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.001"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Minimum: 0.001 STT • Marketplace fee: 2.5%
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              List for Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MyPixelsDashboard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract } = useWriteContract();
  const { pixels, setViewPort } = useCanvasStore();
  const { 
    ownedPixels, 
    userStats, 
    showOwnedPixels,
    setShowOwnedPixels,
    updateOwnedPixels 
  } = usePortfolioStore();
  
  const [sellModal, setSellModal] = useState<{
    isOpen: boolean;
    tokenId: string;
    pixel: any;
  }>({ isOpen: false, tokenId: '', pixel: null });
  
  const [pixelSaleData, setPixelSaleData] = useState<Map<string, { 
    isForSale: boolean; 
    price: string; 
  }>>(new Map());

  useEffect(() => {
    if (address && isConnected) {
      updateOwnedPixels(address, pixels);
      loadPixelSaleData();
    }
  }, [address, isConnected, pixels, updateOwnedPixels]);

  const loadPixelSaleData = async () => {
    if (!publicClient || !address) return;

    try {
      const userTokenIds = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getUserPixels',
        args: [address]
      });

      const saleDataMap = new Map();
      
      for (const tokenId of userTokenIds as bigint[]) {
        try {
          const saleInfo = await publicClient.readContract({
            address: deploymentInfo.contractAddress as `0x${string}`,
            abi: PixelCanvasABI,
            functionName: 'getPixelSaleInfo',
            args: [tokenId]
          });

          saleDataMap.set(tokenId.toString(), {
            isForSale: saleInfo[0],
            price: saleInfo[0] ? formatEther(saleInfo[1]) : '0'
          });
        } catch (error) {
          console.error('Error loading sale info for token:', tokenId, error);
        }
      }
      
      setPixelSaleData(saleDataMap);
    } catch (error) {
      console.error('Failed to load pixel sale data:', error);
    }
  };

  const handleListPixel = async (tokenId: string, price: string) => {
    try {
      const hash = await writeContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'listPixelForSale',
        args: [BigInt(tokenId), parseEther(price)]
      });
      
      console.log('Listing transaction:', hash);
      setTimeout(loadPixelSaleData, 2000);
    } catch (error) {
      console.error('Listing failed:', error);
    }
  };

  const handleRemoveFromSale = async (tokenId: string) => {
    try {
      const hash = await writeContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'removeFromSale',
        args: [BigInt(tokenId)]
      });
      
      console.log('Remove listing transaction:', hash);
      setTimeout(loadPixelSaleData, 2000);
    } catch (error) {
      console.error('Remove listing failed:', error);
    }
  };

  const getTokenIdForPixel = async (pixel: any) => {
    if (!publicClient) return null;
    
    try {
      const pixelData = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getPixelByCoordinates',
        args: [pixel.x, pixel.y]
      });
      
      const coordHash = `${pixel.x}-${pixel.y}`;
      const allTokenIds = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getUserPixels',
        args: [address]
      });
      
      for (const tokenId of allTokenIds as bigint[]) {
        const tokenPixelData = await publicClient.readContract({
          address: deploymentInfo.contractAddress as `0x${string}`,
          abi: PixelCanvasABI,
          functionName: 'pixels',
          args: [tokenId]
        });
        
        if (Number(tokenPixelData[0]) === pixel.x && Number(tokenPixelData[1]) === pixel.y) {
          return tokenId.toString();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding token ID:', error);
      return null;
    }
  };

  const handlePixelAction = async (pixel: any, action: 'sell' | 'remove') => {
    const tokenId = await getTokenIdForPixel(pixel);
    if (!tokenId) return;

    if (action === 'sell') {
      setSellModal({
        isOpen: true,
        tokenId,
        pixel
      });
    } else if (action === 'remove') {
      handleRemoveFromSale(tokenId);
    }
  };

  const navigateToPixel = (pixel: any) => {
    setViewPort(pixel.x, pixel.y, Math.max(4, 1));
  };

  const toggleHighlight = () => {
    setShowOwnedPixels(!showOwnedPixels);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getPixelSaleStatus = async (pixel: any) => {
    const tokenId = await getTokenIdForPixel(pixel);
    if (!tokenId) return { isForSale: false, price: '0' };
    
    return pixelSaleData.get(tokenId) || { isForSale: false, price: '0' };
  };

  if (!isConnected) return null;

  const forSaleCount = Array.from(pixelSaleData.values()).filter(data => data.isForSale).length;
  const totalListingValue = Array.from(pixelSaleData.values())
    .filter(data => data.isForSale)
    .reduce((sum, data) => sum + parseFloat(data.price), 0);

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
              <div className="font-medium text-purple-900">{forSaleCount}</div>
              <div className="text-purple-700">For Sale</div>
            </div>
            <div className="bg-amber-50 p-2 rounded">
              <div className="font-medium text-amber-900">{totalListingValue.toFixed(3)} STT</div>
              <div className="text-amber-700">Listing Value</div>
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
              {ownedPixels.slice(0, 8).map((pixel) => {
                return (
                  <div
                    key={`${pixel.x}-${pixel.y}`}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded text-xs transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded border border-gray-300 cursor-pointer"
                      style={{ backgroundColor: pixel.color }}
                      onClick={() => navigateToPixel(pixel)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">({pixel.x}, {pixel.y})</div>
                    </div>
                    <div className="text-gray-500">{formatDate(pixel.timestamp)}</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePixelAction(pixel, 'sell')}
                        className="px-1 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        title="List for sale"
                      >
                        $
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {ownedPixels.length > 8 && (
              <div className="text-xs text-gray-400 mt-1 text-center">
                +{ownedPixels.length - 8} more pixels
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <div>💡 Your pixels have green borders on canvas</div>
            <div>💡 Click $ button to list pixels for sale</div>
            <div>💡 Use highlight to easily find all your pixels</div>
            <div>💡 Marketplace fee: 2.5% per sale</div>
          </div>
        </div>
      )}

      <SellModal
        tokenId={sellModal.tokenId}
        pixel={sellModal.pixel}
        isOpen={sellModal.isOpen}
        onClose={() => setSellModal({ isOpen: false, tokenId: '', pixel: null })}
        onList={handleListPixel}
      />
    </div>
  );
};