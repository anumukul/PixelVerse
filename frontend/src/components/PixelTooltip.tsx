import React from 'react';
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
  if (!visible || !pixel) return null;

  const formatAddress = (address: string) => {
    if (address === 'pending') return 'Pending...';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div
      className="absolute z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="space-y-1">
        <div className="font-medium">
          Pixel ({pixel.x}, {pixel.y})
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded border border-gray-500"
            style={{ backgroundColor: pixel.color }}
          />
          <span className="text-gray-300">{pixel.color}</span>
        </div>
        <div className="text-gray-300">
          Owner: {formatAddress(pixel.painter)}
        </div>
        {pixel.painter !== 'pending' && (
          <>
            <div className="text-gray-400 text-xs">
              Painted: {formatTimestamp(pixel.timestamp)}
            </div>
            <div className="text-gray-400 text-xs">
              Version: {pixel.version}
            </div>
          </>
        )}
      </div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
    </div>
  );
};