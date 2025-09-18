import { useEffect, useRef, useCallback } from 'react';
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
  const isLoadingRegion = useRef(new Set<string>());
  const paintedPixelCoords = useRef(new Set<string>());

  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'PixelPainted',
    onLogs(logs) {
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
            setPixel(pixel);
            processedEvents.current.add(eventId);
            paintedPixelCoords.current.add(`${pixel.x}-${pixel.y}`);
          }
        }
      });
    },
  });

  const loadCanvasRegion = useCallback(async (startX: number, startY: number, width: number, height: number) => {
    if (!publicClient) return;

    const regionKey = `${startX}-${startY}-${width}-${height}`;
    
    if (loadedRegions.current.has(regionKey) || isLoadingRegion.current.has(regionKey)) {
      return;
    }

    isLoadingRegion.current.add(regionKey);

    try {
      const regionPixels = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getCanvasRegion',
        args: [startX, startY, width, height]
      });

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
          paintedPixelCoords.current.add(`${pixel.x}-${pixel.y}`);
        }
      });
      
      loadedRegions.current.add(regionKey);
    } catch (error) {
      console.error('Failed to load region:', error);
    } finally {
      isLoadingRegion.current.delete(regionKey);
    }
  }, [publicClient, setPixel, getPixelAt]);

  const refreshCanvas = useCallback(async () => {
    if (!publicClient) return;

    const regionsToLoad = new Set<string>();
    
    const baseRegions = [
      '0-0-100-100',
      '100-100-100-100', 
      '200-200-100-100',
      '300-300-100-100',
      '400-400-100-100',
      '500-500-100-100',
      '600-600-100-100',
      '700-700-100-100',
      '800-800-100-100',
      '900-900-100-100',
      '450-450-100-100'
    ];
    
    baseRegions.forEach(region => regionsToLoad.add(region));
    
    paintedPixelCoords.current.forEach(coordKey => {
      const [x, y] = coordKey.split('-').map(Number);
      const regionStartX = Math.floor(x / 100) * 100;
      const regionStartY = Math.floor(y / 100) * 100;
      regionsToLoad.add(`${regionStartX}-${regionStartY}-100-100`);
    });

    const loadPromises = Array.from(regionsToLoad).map(regionKey => {
      const [startX, startY, width, height] = regionKey.split('-').map(Number);
      return loadCanvasRegion(startX, startY, width, height);
    });

    await Promise.all(loadPromises);
  }, [loadCanvasRegion, publicClient]);

  return { loadCanvasRegion, refreshCanvas };
};