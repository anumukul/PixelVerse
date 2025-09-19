import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useCanvasStore } from '../stores/canvasStore';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

interface MarketplaceItem {
  tokenId: string;
  price: string;
  seller: string;
  pixel: {
    x: number;
    y: number;
    color: string;
    version: number;
  };
}

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

export const MarketplacePanel: React.FC = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract } = useWriteContract();
  const { setViewPort } = useCanvasStore();
  
  const [activeTab, setActiveTab] = useState<'browse' | 'selling'>('browse');
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellModal, setSellModal] = useState<{
    isOpen: boolean;
    tokenId: string;
    pixel: any;
  }>({ isOpen: false, tokenId: '', pixel: null });

  useEffect(() => {
    if (isConnected && publicClient) {
      loadMarketplaceData();
    }
  }, [isConnected, activeTab, publicClient]);

  const loadMarketplaceData = async () => {
    if (!publicClient) return;
    
    setLoading(true);
    try {
      const [tokens, prices, total] = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getTokensForSale',
        args: [0n, 50n]
      });

      const items: MarketplaceItem[] = [];
      
      for (let i = 0; i < tokens.length; i++) {
        try {
          const pixelData = await publicClient.readContract({
            address: deploymentInfo.contractAddress as `0x${string}`,
            abi: PixelCanvasABI,
            functionName: 'pixels',
            args: [tokens[i]]
          });

          const [isForSale, price, seller] = await publicClient.readContract({
            address: deploymentInfo.contractAddress as `0x${string}`,
            abi: PixelCanvasABI,
            functionName: 'getPixelSaleInfo',
            args: [tokens[i]]
          });

          if (isForSale) {
            items.push({
              tokenId: tokens[i].toString(),
              price: formatEther(price),
              seller: seller as string,
              pixel: {
                x: Number(pixelData[0]),
                y: Number(pixelData[1]),
                color: `#${Number(pixelData[2]).toString(16).padStart(6, '0')}`,
                version: Number(pixelData[5])
              }
            });
          }
        } catch (error) {
          console.error('Error loading marketplace item:', error);
        }
      }

      setMarketplaceItems(items);
      
      if (activeTab === 'selling' && address) {
        const myItems = items.filter(item => 
          item.seller.toLowerCase() === address.toLowerCase()
        );
        setMyListings(myItems);
      }
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPixel = async (tokenId: string, price: string) => {
    if (!publicClient) return;
    
    try {
      console.log('Attempting to buy pixel:', tokenId, 'for', price, 'STT');
      
      const hash = await writeContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'buyPixel',
        args: [BigInt(tokenId)],
        value: parseEther(price)
      });
      
      console.log('Purchase transaction hash:', hash);
      
      // Wait longer for transaction confirmation
      setTimeout(() => {
        console.log('Reloading marketplace data...');
        loadMarketplaceData();
      }, 3000);
      
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handleListPixel = async (tokenId: string, price: string) => {
    try {
      console.log('Listing pixel:', tokenId, 'for', price, 'STT');
      
      const hash = await writeContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'listPixelForSale',
        args: [BigInt(tokenId), parseEther(price)]
      });
      
      console.log('Listing transaction hash:', hash);
      
      setTimeout(() => {
        loadMarketplaceData();
      }, 3000);
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
      
      console.log('Remove listing transaction hash:', hash);
      
      setTimeout(() => {
        loadMarketplaceData();
      }, 3000);
    } catch (error) {
      console.error('Remove listing failed:', error);
    }
  };

  const navigateToPixel = (x: number, y: number) => {
    setViewPort(x, y, Math.max(4, 1));
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Marketplace</h3>
        <div className="text-center py-4">
          <div className="text-gray-500 text-sm">Connect wallet to access marketplace</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Marketplace</h3>
      
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'browse'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setActiveTab('selling')}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'selling'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          My Listings
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Loading marketplace...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'browse' && (
            <>
              {marketplaceItems.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-gray-500 text-sm">No pixels for sale</div>
                  <button
                    onClick={loadMarketplaceData}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                    <span>{marketplaceItems.length} pixels available</span>
                    <button
                      onClick={loadMarketplaceData}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {marketplaceItems.map((item) => (
                      <div
                        key={item.tokenId}
                        className="p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                              style={{ backgroundColor: item.pixel.color }}
                              onClick={() => navigateToPixel(item.pixel.x, item.pixel.y)}
                              title="Click to view on canvas"
                            />
                            <div>
                              <div className="font-medium text-sm">
                                ({item.pixel.x}, {item.pixel.y})
                              </div>
                              <div className="text-xs text-gray-500">
                                by {formatAddress(item.seller)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {parseFloat(item.price).toFixed(3)} STT
                            </div>
                            <button
                              onClick={() => handleBuyPixel(item.tokenId, item.price)}
                              disabled={item.seller.toLowerCase() === address?.toLowerCase()}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {item.seller.toLowerCase() === address?.toLowerCase() ? 'Yours' : 'Buy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'selling' && (
            <>
              {myListings.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-gray-500 text-sm mb-2">No active listings</div>
                  <div className="text-xs text-gray-400">
                    Use $ buttons in "My Pixels" to list pixels for sale
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    {myListings.length} active listings
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {myListings.map((item) => (
                      <div
                        key={item.tokenId}
                        className="p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                              style={{ backgroundColor: item.pixel.color }}
                              onClick={() => navigateToPixel(item.pixel.x, item.pixel.y)}
                            />
                            <div>
                              <div className="font-medium text-sm">
                                ({item.pixel.x}, {item.pixel.y})
                              </div>
                              <div className="text-xs text-gray-500">
                                Listed for {parseFloat(item.price).toFixed(3)} STT
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromSale(item.tokenId)}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Use $ buttons in "My Pixels" to list for sale</div>
          <div>Marketplace fee: 2.5%</div>
          <div>Click pixel colors to navigate to them</div>
        </div>
      </div>

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