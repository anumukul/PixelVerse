import { create } from 'zustand';
import { Pixel, UserCursor, CanvasState } from '../types';

interface CanvasStore extends CanvasState {
  setPixel: (pixel: Pixel) => void;
  updateCursor: (cursor: UserCursor) => void;
  setSelectedColor: (color: string) => void;
  setViewPort: (x: number, y: number, scale: number) => void;
  setLoading: (loading: boolean) => void;
  setDragStart: (pos: { x: number; y: number } | null) => void;
  getPixelKey: (x: number, y: number) => string;
  getPixelAt: (x: number, y: number) => Pixel | undefined;
  clearCursors: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  pixels: new Map(),
  cursors: new Map(),
  selectedColor: '#FF0000',
  viewPort: { x: 500, y: 500, scale: 1 },
  isLoading: false,
  dragStart: null,

  setPixel: (pixel) => set((state) => {
    const key = get().getPixelKey(pixel.x, pixel.y);
    const newPixels = new Map(state.pixels);
    newPixels.set(key, pixel);
    return { pixels: newPixels };
  }),

  updateCursor: (cursor) => set((state) => {
    const newCursors = new Map(state.cursors);
    newCursors.set(cursor.address, cursor);
    return { cursors: newCursors };
  }),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setViewPort: (x, y, scale) => set({ viewPort: { x, y, scale } }),
  setLoading: (loading) => set({ isLoading: loading }),
  setDragStart: (pos) => set({ dragStart: pos }),
  getPixelKey: (x, y) => `${x}-${y}`,
  getPixelAt: (x, y) => {
    const key = get().getPixelKey(x, y);
    return get().pixels.get(key);
  },
  clearCursors: () => set({ cursors: new Map() })
}));