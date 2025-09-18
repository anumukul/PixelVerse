import { useEffect } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import type { Pixel } from '../types/index';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

export const useContractEvents = () => {
  const publicClient = usePublicClient();
  const { setPixel, updateCursor } = useCanvasStore();

  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
      console.log('PixelPainted event received:', logs);
      logs.forEach((log) => {
        const { args } = log;
        if (args) {
          const pixel: Pixel = {
            x: Number(args.x),
            y: Number(args.y),
            color: `#${Number(args.color).toString(16).padStart(6, '0')}`,
            painter: args.painter as string,
            timestamp: Number(args.timestamp),
            version: Number(args.version)
          };
          console.log('Adding pixel to store:', pixel);
          setPixel(pixel);
        }
      });
    },
  });

  const loadCanvasRegion = async (startX: number, startY: number, width: number, height: number) => {
    if (!publicClient) return;

    try {
      const regionPixels = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getCanvasRegion',
        args: [startX, startY, width, height]
      });

      console.log('Loaded region pixels:', regionPixels);
      (regionPixels as any[]).forEach((pixelData) => {
        const pixel: Pixel = {
          x: Number(pixelData.x),
          y: Number(pixelData.y),
          color: `#${Number(pixelData.color).toString(16).padStart(6, '0')}`,
          painter: pixelData.painter,
          timestamp: Number(pixelData.timestamp),
          version: Number(pixelData.version)
        };
        setPixel(pixel);
      });
    } catch (error) {
      console.error('Failed to load region:', error);
    }
  };

 const refreshCanvas = async () => {
  
  await loadCanvasRegion(700, 0, 100, 100); 
 
  await loadCanvasRegion(400, 400, 100, 100);
  await loadCanvasRegion(0, 0, 100, 100);
};

  return { loadCanvasRegion, refreshCanvas };
};