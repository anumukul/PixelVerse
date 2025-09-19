import { useEffect, useRef, useCallback } from 'react';
import { usePublicClient, useWatchContractEvent, useAccount } from 'wagmi';
import { useCanvasStore } from '../stores/canvasStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { Pixel, UserCursor } from '../types/index';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

export const useContractEvents = () => {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { setPixel, getPixelAt, updateCursor, clearCursors } = useCanvasStore();
  const { forceRefresh } = usePortfolioStore();
  const processedEvents = useRef(new Set<string>());
  const loadedRegions = useRef(new Set<string>());
  const isLoadingRegion = useRef(new Set<string>());
  const paintedPixelCoords = useRef(new Set<string>());
  const userPixelsLoaded = useRef(false);
  const cursorCleanupInterval = useRef<NodeJS.Timeout | null>(null);

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
            
            if (address && pixel.painter.toLowerCase() === address.toLowerCase()) {
              setTimeout(() => loadUserPixels(address), 500);
            }
          }
        }
      });
    },
  });

  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'PixelSold',
    onLogs(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args) {
          console.log('PixelSold event detected:', {
            tokenId: args.tokenId?.toString(),
            seller: args.seller,
            buyer: args.buyer,
            price: args.price?.toString()
          });
          
          // Update pixel ownership after sale
          setTimeout(async () => {
            try {
              const pixelData = await publicClient?.readContract({
                address: deploymentInfo.contractAddress as `0x${string}`,
                abi: PixelCanvasABI,
                functionName: 'pixels',
                args: [args.tokenId!]
              }) as readonly [number, number, number, string, number, number];

              if (pixelData) {
                const updatedPixel: Pixel = {
                  x: Number(pixelData[0]),
                  y: Number(pixelData[1]),
                  color: `#${Number(pixelData[2]).toString(16).padStart(6, '0')}`,
                  painter: args.buyer as string, // Should now be updated to buyer
                  timestamp: Number(pixelData[4]),
                  version: Number(pixelData[5])
                };
                
                setPixel(updatedPixel);
                console.log('Updated pixel ownership after sale:', updatedPixel);
              }
            } catch (error) {
              console.error('Error updating pixel after sale:', error);
            }
            
            // Reload pixels for both seller and buyer
            if (address && (
              args.seller?.toLowerCase() === address.toLowerCase() || 
              args.buyer?.toLowerCase() === address.toLowerCase()
            )) {
              console.log('Reloading pixels due to PixelSold event for current user');
              setTimeout(() => loadUserPixels(address), 1000);
            }
          }, 500);
        }
      });
    },
  });

  // NEW: Add Transfer event listener to catch all NFT transfers
  useWatchContractEvent({
    address: deploymentInfo.contractAddress as `0x${string}`,
    abi: PixelCanvasABI,
    eventName: 'Transfer',
    onLogs(logs) {
      logs.forEach((log) => {
        const { args } = log;
        // Only handle marketplace transfers (not minting)
        if (args && args.from !== '0x0000000000000000000000000000000000000000') {
          console.log('Transfer event detected:', {
            from: args.from,
            to: args.to,
            tokenId: args.tokenId?.toString()
          });
          
          // Update pixel ownership for transfers
          setTimeout(async () => {
            try {
              const pixelData = await publicClient?.readContract({
                address: deploymentInfo.contractAddress as `0x${string}`,
                abi: PixelCanvasABI,
                functionName: 'pixels',
                args: [args.tokenId!]
              }) as readonly [number, number, number, string, number, number];

              if (pixelData) {
                const updatedPixel: Pixel = {
                  x: Number(pixelData[0]),
                  y: Number(pixelData[1]),
                  color: `#${Number(pixelData[2]).toString(16).padStart(6, '0')}`,
                  painter: args.to as string, // Update to new owner
                  timestamp: Number(pixelData[4]),
                  version: Number(pixelData[5])
                };
                
                setPixel(updatedPixel);
                console.log('Updated pixel ownership after transfer:', updatedPixel);
              }
            } catch (error) {
              console.error('Error updating pixel after transfer:', error);
            }

            // Reload pixels for both parties
            if (address && (
              args.from?.toLowerCase() === address.toLowerCase() || 
              args.to?.toLowerCase() === address.toLowerCase()
            )) {
              console.log('Reloading pixels due to Transfer event for current user');
              setTimeout(() => loadUserPixels(address), 1000);
            }
          }, 500);
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
    if (!publicClient) {
      console.log('loadUserPixels: No public client available');
      return;
    }

    try {
      console.log('loadUserPixels: Loading user pixels for:', userAddress);
      
      const userPixelIds = await publicClient.readContract({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'getUserPixels',
        args: [userAddress as `0x${string}`]
      }) as readonly bigint[];

      console.log('loadUserPixels: User pixel IDs:', userPixelIds.map(id => id.toString()));

      const userPixels: Pixel[] = [];
      
      for (const tokenId of userPixelIds) {
        try {
          // Get both pixel data and verify actual ownership
          const [pixelData, currentOwner] = await Promise.all([
            publicClient.readContract({
              address: deploymentInfo.contractAddress as `0x${string}`,
              abi: PixelCanvasABI,
              functionName: 'pixels',
              args: [tokenId]
            }) as Promise<readonly [number, number, number, string, number, number]>,
            publicClient.readContract({
              address: deploymentInfo.contractAddress as `0x${string}`,
              abi: PixelCanvasABI,
              functionName: 'ownerOf',
              args: [tokenId]
            }) as Promise<string>
          ]);

          // Only include pixels that user actually owns
          if (pixelData && currentOwner.toLowerCase() === userAddress.toLowerCase()) {
            const pixel: Pixel = {
              x: Number(pixelData[0]),
              y: Number(pixelData[1]),
              color: `#${Number(pixelData[2]).toString(16).padStart(6, '0')}`,
              painter: currentOwner, // Use verified owner
              timestamp: Number(pixelData[4]),
              version: Number(pixelData[5])
            };

            console.log('loadUserPixels: Loaded owned pixel:', pixel);
            userPixels.push(pixel);
            
            // Update canvas with correct ownership
            const existing = getPixelAt(pixel.x, pixel.y);
            if (!existing || existing.version <= pixel.version) {
              setPixel(pixel);
              paintedPixelCoords.current.add(`${pixel.x}-${pixel.y}`);
            }
          } else {
            console.log(`loadUserPixels: Skipping token ${tokenId} - not owned by user. Owner: ${currentOwner}, User: ${userAddress}`);
          }
        } catch (error) {
          console.error('loadUserPixels: Error loading pixel data for token:', tokenId.toString(), error);
        }
      }

      console.log('loadUserPixels: Total loaded user pixels:', userPixels.length);
      
      // Force update portfolio store
      forceRefresh(userAddress, userPixels);
      
      console.log('loadUserPixels: User pixels loaded and portfolio refreshed successfully');
    } catch (error) {
      console.error('loadUserPixels: Failed to load user pixels:', error);
    }
  }, [publicClient, setPixel, getPixelAt, forceRefresh]);

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
      }) as readonly any[];

      regionPixels.forEach((pixelData: any) => {
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

    console.log('refreshCanvas: Refreshing canvas...');

    userPixelsLoaded.current = false;

    if (address) {
      console.log('refreshCanvas: Loading pixels for current user:', address);
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
    console.log('refreshCanvas: Canvas refresh completed');
  }, [loadCanvasRegion, loadUserPixels, publicClient, address]);

  useEffect(() => {
    if (address && publicClient) {
      console.log('useEffect: Address changed, reloading user pixels:', address);
      userPixelsLoaded.current = false;
      
      setTimeout(() => {
        loadUserPixels(address);
      }, 1000);
    }
  }, [address, loadUserPixels, publicClient]);

  return { loadCanvasRegion, refreshCanvas, loadUserPixels };
};