import { useEffect, useRef } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import type { Pixel } from '../types/index';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

export const useContractEvents = () => {
  const publicClient = usePublicClient();
  const { setPixel, getPixelAt } = useCanvasStore();
  const processedEvents = useRef(new Set<string>());
  const loadedRegions = useRef(new Set<string>());

  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
      console.log('PixelPainted event received:', logs.length);
      logs.forEach((log) => {
        const eventId = `${log.transactionHash}-${log.logIndex}`;
        
      
        if (processedEvents.current.has(eventId)) {
          return;
        }
        
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
          
         
          const existing = getPixelAt(pixel.x, pixel.y);
          if (!existing || existing.version < pixel.version) {
            console.log('Adding new pixel:', pixel);
            setPixel(pixel);
            processedEvents.current.add(eventId);
          }
        }
      });
    },
  });

  const loadCanvasRegion = async (startX: number, startY: number, width: number, height: number) => {
    if (!publicClient) return;

    const regionKey = `${startX}-${startY}-${width}-${height}`;
    if (loadedRegions.current.has(regionKey)) {
      console.log('Region already loaded:', regionKey);
      return;
    }

    try {
      const regionPixels = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getCanvasRegion',
        args: [startX, startY, width, height]
      });

      console.log('Loaded region pixels:', regionPixels.length);
      (regionPixels as any[]).forEach((pixelData) => {
        const pixel: Pixel = {
          x: Number(pixelData.x),
          y: Number(pixelData.y),
          color: `#${Number(pixelData.color).toString(16).padStart(6, '0')}`,
          painter: pixelData.painter,
          timestamp: Number(pixelData.timestamp),
          version: Number(pixelData.version)
        };
        
       
        const existing = getPixelAt(pixel.x, pixel.y);
        if (!existing || existing.version < pixel.version) {
          setPixel(pixel);
        }
      });
      
      loadedRegions.current.add(regionKey);
    } catch (error) {
      console.error('Failed to load region:', error);
    }
  };

  const refreshCanvas = async () => {
    loadedRegions.current.clear(); 
    await loadCanvasRegion(400, 400, 100, 100);
    await loadCanvasRegion(450, 450, 100, 100);
    await loadCanvasRegion(0, 0, 100, 100);
  };

  return { loadCanvasRegion, refreshCanvas };
};