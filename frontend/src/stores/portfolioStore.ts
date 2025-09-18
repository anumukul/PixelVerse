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
    const owned = Array.from(allPixels.values()).filter(
      pixel => pixel.painter === userAddress && pixel.painter !== 'pending'
    );
    
    const colorCounts = new Map<string, number>();
    let firstDate = null;
    let lastDate = null;
    
    owned.forEach(pixel => {
      colorCounts.set(pixel.color, (colorCounts.get(pixel.color) || 0) + 1);
      
      if (!firstDate || pixel.timestamp < firstDate) {
        firstDate = pixel.timestamp;
      }
      if (!lastDate || pixel.timestamp > lastDate) {
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
  },

  getUserStats: (userAddress) => {
    get().updateOwnedPixels(userAddress, new Map());
    return get().userStats;
  },

  isUserPixel: (pixel, userAddress) => {
    return pixel.painter === userAddress && pixel.painter !== 'pending';
  },

  getOwnedPixelsAtCoordinate: (x, y, userAddress) => {
    const owned = get().ownedPixels;
    return owned.find(pixel => pixel.x === x && pixel.y === y && pixel.painter === userAddress) || null;
  },

  navigateToPixel: (pixel) => {
   
  }
}));