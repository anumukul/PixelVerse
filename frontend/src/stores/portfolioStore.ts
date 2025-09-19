import { create } from 'zustand';
import type { Pixel } from '../types';

interface UserStats {
  totalPixels: number;
  totalSpent: number;
  firstPixelDate: number | null;
  lastPixelDate: number | null;
  favoriteColor: string;
  uniqueColors: number;
}

interface PortfolioStore {
  showOwnedPixels: boolean;
  ownedPixels: Pixel[];
  userStats: UserStats;
  
  setShowOwnedPixels: (show: boolean) => void;
  updateOwnedPixels: (userAddress: string, allPixels: Map<string, Pixel>) => void;
  getUserStats: (userAddress: string) => UserStats;
  isUserPixel: (pixel: Pixel, userAddress: string) => boolean;
  getOwnedPixelsAtCoordinate: (x: number, y: number, userAddress: string) => Pixel | null;
  navigateToPixel: (pixel: Pixel) => void;
  forceRefresh: (userAddress: string, pixels: Pixel[]) => void;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  showOwnedPixels: false,
  ownedPixels: [],
  userStats: {
    totalPixels: 0,
    totalSpent: 0,
    firstPixelDate: null,
    lastPixelDate: null,
    favoriteColor: '#FF0000',
    uniqueColors: 0
  },

  setShowOwnedPixels: (show) => set({ showOwnedPixels: show }),

  updateOwnedPixels: (userAddress, allPixels) => {
    console.log('Portfolio Store: Updating pixels for user:', userAddress);
    console.log('Portfolio Store: Total pixels received:', allPixels.size);
    console.log('Portfolio Store: All pixels:', Array.from(allPixels.entries()));
    
    const owned = Array.from(allPixels.values()).filter(pixel => {
      const isPainter = pixel.painter.toLowerCase() === userAddress.toLowerCase();
      const notPending = pixel.painter !== 'pending';
      const isValid = pixel.painter !== '0x0000000000000000000000000000000000000000';
      
      console.log(`Portfolio Store: Pixel (${pixel.x},${pixel.y}) - painter: ${pixel.painter}, user: ${userAddress}, isPainter: ${isPainter}, notPending: ${notPending}, isValid: ${isValid}`);
      
      return isPainter && notPending && isValid;
    });
    
    console.log('Portfolio Store: Filtered owned pixels:', owned.length, owned);
    
    const colorCounts = new Map<string, number>();
    let firstDate: number | null = null;
    let lastDate: number | null = null;
    
    owned.forEach(pixel => {
      const count = colorCounts.get(pixel.color) || 0;
      colorCounts.set(pixel.color, count + 1);
      
      if (firstDate === null || pixel.timestamp < firstDate) {
        firstDate = pixel.timestamp;
      }
      if (lastDate === null || pixel.timestamp > lastDate) {
        lastDate = pixel.timestamp;
      }
    });

    let favoriteColor = '#FF0000';
    let maxCount = 0;
    colorCounts.forEach((count, color) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteColor = color;
      }
    });

    const stats: UserStats = {
      totalPixels: owned.length,
      totalSpent: owned.length * 0.001,
      firstPixelDate: firstDate,
      lastPixelDate: lastDate,
      favoriteColor,
      uniqueColors: colorCounts.size
    };

    console.log('Portfolio Store: Final stats:', stats);
    console.log('Portfolio Store: Setting owned pixels:', owned.length);

    set({ 
      ownedPixels: owned.sort((a, b) => b.timestamp - a.timestamp),
      userStats: stats 
    });
    
    console.log('Portfolio Store: State updated successfully');
  },

  forceRefresh: (userAddress, pixels) => {
    console.log('Portfolio Store: Force refresh called for:', userAddress);
    console.log('Portfolio Store: Direct pixels provided:', pixels.length);
    
    const owned = pixels.filter(pixel => {
      const isPainter = pixel.painter.toLowerCase() === userAddress.toLowerCase();
      const notPending = pixel.painter !== 'pending';
      const isValid = pixel.painter !== '0x0000000000000000000000000000000000000000';
      
      return isPainter && notPending && isValid;
    });

    const colorCounts = new Map<string, number>();
    let firstDate: number | null = null;
    let lastDate: number | null = null;
    
    owned.forEach(pixel => {
      const count = colorCounts.get(pixel.color) || 0;
      colorCounts.set(pixel.color, count + 1);
      
      if (firstDate === null || pixel.timestamp < firstDate) {
        firstDate = pixel.timestamp;
      }
      if (lastDate === null || pixel.timestamp > lastDate) {
        lastDate = pixel.timestamp;
      }
    });

    let favoriteColor = '#FF0000';
    let maxCount = 0;
    colorCounts.forEach((count, color) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteColor = color;
      }
    });

    const stats: UserStats = {
      totalPixels: owned.length,
      totalSpent: owned.length * 0.001,
      firstPixelDate: firstDate,
      lastPixelDate: lastDate,
      favoriteColor,
      uniqueColors: colorCounts.size
    };

    set({ 
      ownedPixels: owned.sort((a, b) => b.timestamp - a.timestamp),
      userStats: stats 
    });
    
    console.log('Portfolio Store: Force refresh completed, owned pixels:', owned.length);
  },

  getUserStats: (userAddress) => {
    return get().userStats;
  },

  isUserPixel: (pixel, userAddress) => {
    const result = pixel.painter.toLowerCase() === userAddress.toLowerCase() && pixel.painter !== 'pending';
    return result;
  },

  getOwnedPixelsAtCoordinate: (x, y, userAddress) => {
    const owned = get().ownedPixels;
    return owned.find(pixel => 
      pixel.x === x && 
      pixel.y === y && 
      pixel.painter.toLowerCase() === userAddress.toLowerCase()
    ) || null;
  },

  navigateToPixel: (pixel) => {
    
  }
}));