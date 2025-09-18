import React, { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasStats } from '../types';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';
import { formatEther } from 'viem';

export const LiveStats: React.FC = () => {
  const publicClient = usePublicClient();
  const { pixels, getActiveCursorsCount } = useCanvasStore();
  const [stats, setStats] = useState<CanvasStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!publicClient) return;
      
      try {
        const result = await publicClient.readContract({
          address: deploymentInfo.contractAddress as `0x${string}`,
          abi: PixelCanvasABI,
          functionName: 'getCanvasStats'
        });

        setStats({
          width: Number(result[0]),
          height: Number(result[1]),
          totalPixels: Number(result[2]),
          pixelPrice: formatEther(result[3]),
          totalSupply: Number(result[4])
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-3">Live Stats</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Live Stats</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Canvas Size</span>
          <span className="font-mono">{stats.width}×{stats.height}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Pixels Painted</span>
          <span className="font-mono">{stats.totalPixels.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Total Supply</span>
          <span className="font-mono">{stats.totalSupply.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Pixel Price</span>
          <span className="font-mono">{parseFloat(stats.pixelPrice).toFixed(4)} STT</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Local Pixels</span>
          <span className="font-mono">{pixels.size.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Active Users</span>
          <span className="font-mono">{getActiveCursorsCount()}</span>
        </div>
      </div>
    </div>
  );
};