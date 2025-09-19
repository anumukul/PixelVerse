

import { create } from 'zustand';
import type { Pixel, UserCursor, CanvasState } from '../types/index';

interface BatchSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
}

type ShapeType = 'rectangle' | 'circle' | 'line' | 'freehand';

interface CanvasStore extends CanvasState {
  batchMode: boolean;
  selection: BatchSelection | null;
  shapeMode: ShapeType;
  hoveredPixel: Pixel | null;
  tooltipPosition: { x: number; y: number };
  showTooltip: boolean;
  showGrid: boolean;
  freehandPath: Array<{x: number, y: number}>;
  
  setPixel: (pixel: Pixel) => void;
  updateCursor: (cursor: UserCursor) => void;
  setSelectedColor: (color: string) => void;
  setViewPort: (x: number, y: number, scale: number) => void;
  setLoading: (loading: boolean) => void;
  setDragStart: (pos: { x: number; y: number } | null) => void;
  getPixelKey: (x: number, y: number) => string;
  getPixelAt: (x: number, y: number) => Pixel | undefined;
  clearCursors: () => void;
  addPendingPixel: (x: number, y: number, color: string) => void;
  removePendingPixel: (x: number, y: number) => void;
  getActiveCursorsCount: () => number;
  
  setBatchMode: (enabled: boolean) => void;
  setShapeMode: (mode: ShapeType) => void;
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  clearSelection: () => void;
  getSelectedPixels: () => Array<{x: number, y: number}>;
  getSelectionCost: () => number;
  
  addToFreehandPath: (x: number, y: number) => void;
  clearFreehandPath: () => void;
  
  setHoveredPixel: (pixel: Pixel | null, position?: { x: number; y: number }) => void;
  hideTooltip: () => void;
  setShowGrid: (show: boolean) => void;
  
  getCirclePixels: (centerX: number, centerY: number, radius: number) => Array<{x: number, y: number}>;
  getLinePixels: (x1: number, y1: number, x2: number, y2: number) => Array<{x: number, y: number}>;
  getRectanglePixels: (x1: number, y1: number, x2: number, y2: number) => Array<{x: number, y: number}>;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  pixels: new Map<string, Pixel>(),
  cursors: new Map<string, UserCursor>(),
  selectedColor: '#FF0000',
  viewPort: { x: 500, y: 500, scale: 4 },
  isLoading: false,
  dragStart: null,
  batchMode: false,
  selection: null,
  shapeMode: 'rectangle',
  hoveredPixel: null,
  tooltipPosition: { x: 0, y: 0 },
  showTooltip: false,
  showGrid: true,
  freehandPath: [],

  setPixel: (pixel) => {
    const current = get();
    const key = current.getPixelKey(pixel.x, pixel.y);
    const existing = current.pixels.get(key);
    
    if (existing && 
        existing.x === pixel.x && 
        existing.y === pixel.y && 
        existing.color === pixel.color && 
        existing.version === pixel.version) {
      return;
    }
    
    set((state) => {
      const newPixels = new Map(state.pixels);
      newPixels.set(key, pixel);
      return { pixels: newPixels };
    });
  },

  addPendingPixel: (x, y, color) => {
    const current = get();
    const key = current.getPixelKey(x, y);
    
    set((state) => {
      const newPixels = new Map(state.pixels);
      newPixels.set(key, {
        x,
        y,
        color,
        painter: 'pending',
        timestamp: Date.now(),
        version: 0
      });
      return { pixels: newPixels };
    });
  },

  removePendingPixel: (x, y) => {
    const current = get();
    const key = current.getPixelKey(x, y);
    
    set((state) => {
      const newPixels = new Map(state.pixels);
      const existing = newPixels.get(key);
      if (existing && existing.painter === 'pending') {
        newPixels.delete(key);
      }
      return { pixels: newPixels };
    });
  },

  updateCursor: (cursor) => {
    const now = Date.now();
    const cursorWithTimestamp = { ...cursor, timestamp: now };
    
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(cursor.address, cursorWithTimestamp);
      return { cursors: newCursors };
    });
  },

  clearCursors: () => {
    const now = Date.now();
    const CURSOR_TIMEOUT = 15000;
    
    set((state) => {
      const newCursors = new Map();
      state.cursors.forEach((cursor, address) => {
        if (now - cursor.timestamp < CURSOR_TIMEOUT) {
          newCursors.set(address, cursor);
        }
      });
      return { cursors: newCursors };
    });
  },

  getActiveCursorsCount: () => {
    const now = Date.now();
    const CURSOR_TIMEOUT = 15000;
    let activeCount = 0;
    
    get().cursors.forEach((cursor) => {
      if (now - cursor.timestamp < CURSOR_TIMEOUT) {
        activeCount++;
      }
    });
    
    return activeCount;
  },

  setBatchMode: (enabled) => {
    set({ batchMode: enabled });
    if (!enabled) {
      set({ selection: null, freehandPath: [] });
    }
  },

  setShapeMode: (mode) => {
    set({ shapeMode: mode });
    get().clearSelection();
    get().clearFreehandPath();
  },

  startSelection: (x, y) => {
    const { shapeMode } = get();
    
    if (shapeMode === 'freehand') {
      set({ freehandPath: [{ x, y }] });
    } else {
      set({
        selection: {
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          isSelecting: true
        }
      });
    }
  },

  updateSelection: (x, y) => {
    const { shapeMode } = get();
    
    if (shapeMode === 'freehand') {
      set((state) => ({
        freehandPath: [...state.freehandPath, { x, y }]
      }));
    } else {
      set((state) => {
        if (!state.selection) return state;
        return {
          selection: {
            ...state.selection,
            endX: x,
            endY: y
          }
        };
      });
    }
  },

  endSelection: () => {
    set((state) => {
      if (!state.selection) return state;
      return {
        selection: {
          ...state.selection,
          isSelecting: false
        }
      };
    });
  },

  clearSelection: () => {
    set({ selection: null });
  },

  addToFreehandPath: (x, y) => {
    set((state) => ({
      freehandPath: [...state.freehandPath, { x, y }]
    }));
  },

  clearFreehandPath: () => {
    set({ freehandPath: [] });
  },

  getSelectedPixels: () => {
    const { selection, shapeMode, freehandPath } = get();
    
    if (shapeMode === 'freehand') {
      const uniquePixels = new Set<string>();
      const pixels: Array<{x: number, y: number}> = [];
      
      freehandPath.forEach(({ x, y }) => {
        const key = `${x}-${y}`;
        if (!uniquePixels.has(key) && x >= 0 && x < 1000 && y >= 0 && y < 1000) {
          uniquePixels.add(key);
          pixels.push({ x, y });
        }
      });
      
      return pixels;
    }
    
    if (!selection) return [];
    
    const { startX, startY, endX, endY } = selection;
    
    switch (shapeMode) {
      case 'rectangle':
        return get().getRectanglePixels(startX, startY, endX, endY);
      case 'circle': {
        const centerX = startX;
        const centerY = startY;
        const radius = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
        return get().getCirclePixels(centerX, centerY, radius);
      }
      case 'line':
        return get().getLinePixels(startX, startY, endX, endY);
      default:
        return get().getRectanglePixels(startX, startY, endX, endY);
    }
  },

  getSelectionCost: () => {
    const pixels = get().getSelectedPixels();
    return pixels.length * 0.001;
  },

  getRectanglePixels: (x1, y1, x2, y2) => {
    const pixels = [];
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (x >= 0 && x < 1000 && y >= 0 && y < 1000) {
          pixels.push({ x, y });
        }
      }
    }
    
    return pixels;
  },

  getCirclePixels: (centerX, centerY, radius) => {
    const pixels = [];
    const radiusSquared = radius * radius;
    
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared <= radiusSquared && x >= 0 && x < 1000 && y >= 0 && y < 1000) {
          pixels.push({ x, y });
        }
      }
    }
    
    return pixels;
  },

  getLinePixels: (x1, y1, x2, y2) => {
    const pixels = [];
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
      if (x >= 0 && x < 1000 && y >= 0 && y < 1000) {
        pixels.push({ x, y });
      }
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return pixels;
  },

  setHoveredPixel: (pixel, position = { x: 0, y: 0 }) => {
    set({
      hoveredPixel: pixel,
      tooltipPosition: position,
      showTooltip: !!pixel
    });
  },

  hideTooltip: () => {
    set({
      hoveredPixel: null,
      showTooltip: false
    });
  },

  setShowGrid: (show) => set({ showGrid: show }),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setViewPort: (x, y, scale) => set({ viewPort: { x, y, scale } }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDragStart: (pos) => set({ dragStart: pos }),
  getPixelKey: (x, y) => `${x}-${y}`,
  getPixelAt: (x, y) => {
    const key = get().getPixelKey(x, y);
    return get().pixels.get(key);
  }
}));