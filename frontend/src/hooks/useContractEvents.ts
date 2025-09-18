import { useEffect, useRef, useCallback } from 'react';
import { usePublicClient, useWatchContractEvent, useAccount } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import type { Pixel, UserCursor } from '../types/index';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

export const useContractEvents = () => {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { setPixel, getPixelAt, updateCursor, clearCursors } = useCanvasStore();
  const processedEvents = useRef(new Set<string>());
  const loadedRegions = useRef(new Set<string>());
  const isLoadingRegion = useRef(new Set<string>());
  const paintedPixelCoords = useRef(new Set<string>());
  const userPixelsLoaded = useRef(false);
  const cursorCleanupInterval = useRef<NodeJS.Timeout>();

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

  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'UserCursorMoved',
    onLogs(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args && args.user !== address) {
          const cursor: UserCursor = {
            address: args.user as string,
            x: Number(args.x),
            y: Number(args.y),
            timestamp: Number(args.timestamp)
          };
          updateCursor(cursor);
        }
      });
    },
  });

  useEffect(() => {
    cursorCleanupInterval.current = setInterval(() => {
      clearCursors();
    }, 5000);

    return () => {
      if (cursorCleanupInterval.current) {
        clearInterval(cursorCleanupInterval.current);
      }
    };
  }, [clearCursors]);

  const loadUserPixels = useCallback(async (userAddress: string) => {
    if (!publicClient || userPixelsLoaded.current) return;

    try {
      console.log('Loading user pixels for:', userAddress);
      
      // Get all pixels owned by the user
      const userPixelIds = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getUserPixels',
        args: [userAddress]
      });

      console.log('User pixel IDs:', userPixelIds);

      // Load pixel data for each owned pixel
      for (const tokenId of userPixelIds as bigint[]) {
        try {
          const pixelData = await publicClient.readContract({
            address: deploymentInfo.contractAddress as `0x${string}`,
            abi: PixelCanvasABI,
            functionName: 'pixels',
            args: [tokenId]
          });

          if (pixelData && pixelData[3] !== '0x0000000000000000000000000000000000000000') {
            const pixel: Pixel = {
              x: Number(pixelData[0]),
              y: Number(pixelData[1]),
              color: `#${Number(pixelData[2]).toString(16).padStart(6, '0')}`,
              painter: pixelData[3] as string,
              timestamp: Number(pixelData[4]),
              version: Number(pixelData[5])
            };

            const existing = getPixelAt(pixel.x, pixel.y);
            if (!existing || existing.version < pixel.version) {
              setPixel(pixel);
              paintedPixelCoords.current.add(`${pixel.x}-${pixel.y}`);
            }
          }
        } catch (error) {
          console.error('Error loading pixel data for token:', tokenId, error);
        }
      }

      userPixelsLoaded.current = true;
      console.log('User pixels loaded successfully');
    } catch (error) {
      console.error('Failed to load user pixels:', error);
    }
  }, [publicClient, setPixel, getPixelAt]);

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

    // Reset loading state
    userPixelsLoaded.current = false;

    // Load user pixels first if connected
    if (address) {
      await loadUserPixels(address);
    }

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
    
    // Add regions for painted pixels
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
  }, [loadCanvasRegion, loadUserPixels, publicClient, address]);

  
  useEffect(() => {
    if (address && publicClient) {
      userPixelsLoaded.current = false;
      loadUserPixels(address);
    }
  }, [address, loadUserPixels, publicClient]);

  return { loadCanvasRegion, refreshCanvas, loadUserPixels };
};