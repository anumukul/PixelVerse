import React from 'react';
import { useAccount } from 'wagmi';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { Pixel } from '../types';

interface PixelTooltipProps {
  pixel: Pixel | null;
  position: { x: number; y: number };
  visible: boolean;
}

export const PixelTooltip: React.FC<PixelTooltipProps> = ({ 
  pixel, 
  position, 
  visible 
}) => {
  const { address } = useAccount();
  const { isUserPixel } = usePortfolioStore();

  if (!visible || !pixel) return null;

  const formatAddress = (address: string) => {
    if (address === 'pending') return 'Pending...';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isOwned = address && isUserPixel(pixel, address);

  return (
    <div
      className={`absolute z-50 px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none ${
        isOwned 
          ? 'bg-green-900 text-white border border-green-600' 
          : 'bg-gray-900 text-white'
      }`}
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="space-y-1">
        <div className="font-medium flex items-center gap-2">
          <span>Pixel ({pixel.x}, {pixel.y})</span>
          {isOwned && (
            <span className="text-xs bg-green-600 px-1 rounded">YOURS</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-gray-500"
            style={{ backgroundColor: pixel.color }}
          />
          <span className="text-gray-300">{pixel.color}</span>
        </div>
        <div className={isOwned ? 'text-green-200' : 'text-gray-300'}>
          Owner: {formatAddress(pixel.painter)}
        </div>
        {pixel.painter !== 'pending' && (
          <>
            <div className="text-gray-400 text-xs">
              Painted: {formatTimestamp(pixel.timestamp)}
            </div>
            <div className="text-gray-400 text-xs">
              Version: {pixel.version} • Value: 0.001 STT
            </div>
          </>
        )}
        {isOwned && (
          <div className="text-green-300 text-xs font-medium">
            Your NFT Pixel
          </div>
        )}
      </div>
      <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
        isOwned ? 'border-t-green-900' : 'border-t-gray-900'
      }`} />
    </div>
  );
};