export interface Pixel {
  x: number;
  y: number;
  color: string;
  painter: string;
  timestamp: number;
  version: number;
}

export interface UserCursor {
  address: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface CanvasState {
  pixels: Map<string, Pixel>;
  cursors: Map<string, UserCursor>;
  selectedColor: string;
  viewPort: { x: number; y: number; scale: number };
  isLoading: boolean;
  dragStart: { x: number; y: number } | null;
}

export interface Transaction {
  hash: string;
  type: 'paint' | 'batch';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  pixels?: Array<{ x: number; y: number; color: string }>;
}

export interface CanvasStats {
  width: number;
  height: number;
  totalPixels: number;
  pixelPrice: string;
  totalSupply: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'freehand';

export interface BatchSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
}

export interface ShapePreview {
  type: ShapeType;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  pixels: Array<{ x: number; y: number }>;
}