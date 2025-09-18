import { create } from 'zustand';
import type { Pixel, UserCursor, CanvasState } from '../types/index';

interface BatchSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
}

interface CanvasStore extends CanvasState {
  batchMode: boolean;
  selection: BatchSelection | null;
  hoveredPixel: Pixel | null;
  tooltipPosition: { x: number; y: number };
  showTooltip: boolean;
  
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
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  clearSelection: () => void;
  getSelectedPixels: () => Array<{x: number, y: number}>;
  getSelectionCost: () => number;
  
  setHoveredPixel: (pixel: Pixel | null, position?: { x: number; y: number }) => void;
  hideTooltip: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  pixels: new Map(),
  cursors: new Map(),
  selectedColor: '#FF0000',
  viewPort: { x: 500, y: 500, scale: 4 },
  isLoading: false,
  dragStart: null,
  batchMode: false,
  selection: null,
  hoveredPixel: null,
  tooltipPosition: { x: 0, y: 0 },
  showTooltip: false,

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
      set({ selection: null });
    }
  },

  startSelection: (x, y) => {
    set({
      selection: {
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        isSelecting: true
      }
    });
  },

  updateSelection: (x, y) => {
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

  getSelectedPixels: () => {
    const { selection } = get();
    if (!selection) return [];
    
    const pixels = [];
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        pixels.push({ x, y });
      }
    }
    
    return pixels;
  },

  getSelectionCost: () => {
    const pixels = get().getSelectedPixels();
    return pixels.length * 0.001;
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