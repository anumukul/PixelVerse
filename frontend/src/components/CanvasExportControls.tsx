import React from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import type { Pixel } from '../types';

export const CanvasExportControls: React.FC = () => {
  const { pixels, viewPort } = useCanvasStore();

  const exportCurrentView = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pixelsArray = Array.from(pixels.values());
    pixelsArray.forEach((pixel: Pixel) => {
      if (pixel.painter === 'pending') return;
      
      const screenX = (pixel.x - viewPort.x) * viewPort.scale + canvas.width / 2;
      const screenY = (pixel.y - viewPort.y) * viewPort.scale + canvas.height / 2;
      
      if (screenX >= 0 && screenX < canvas.width && screenY >= 0 && screenY < canvas.height) {
        ctx.fillStyle = pixel.color;
        const pixelSize = Math.max(1, viewPort.scale);
        ctx.fillRect(screenX, screenY, pixelSize, pixelSize);
      }
    });

    const link = document.createElement('a');
    link.download = `pixelverse-view-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportFullCanvas = () => {
    if (pixels.size === 0) {
      alert('No pixels to export!');
      return;
    }

    const pixelsArray = Array.from(pixels.values());
    const validPixels = pixelsArray.filter((p: Pixel) => p.painter !== 'pending');
    
    if (validPixels.length === 0) {
      alert('No valid pixels to export!');
      return;
    }

    let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
    validPixels.forEach((pixel: Pixel) => {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    });

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min(1000 / width, 1000 / height, 10);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    validPixels.forEach((pixel: Pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        (pixel.x - minX) * scale,
        (pixel.y - minY) * scale,
        scale,
        scale
      );
    });

    const link = document.createElement('a');
    link.download = `pixelverse-artwork-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportStats = () => {
    const pixelsArray = Array.from(pixels.values());
    const validPixels = pixelsArray.filter((p: Pixel) => p.painter !== 'pending');
    const painters = new Set(validPixels.map((p: Pixel) => p.painter));
    const colors = new Set(validPixels.map((p: Pixel) => p.color));

    const stats = {
      totalPixels: validPixels.length,
      uniqueArtists: painters.size,
      uniqueColors: colors.size,
      canvasArea: `${1000}x${1000}`,
      exportDate: new Date().toISOString(),
      pixels: validPixels.map((p: Pixel) => ({
        coordinates: [p.x, p.y],
        color: p.color,
        painter: p.painter,
        timestamp: p.timestamp,
        version: p.version
      }))
    };

    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `pixelverse-data-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Export Canvas</h3>
      
      <div className="space-y-2">
        <button
          onClick={exportCurrentView}
          className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm transition-colors"
        >
          Export Current View
        </button>
        
        <button
          onClick={exportFullCanvas}
          disabled={pixels.size === 0}
          className="w-full px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
        >
          Export Artwork
        </button>
        
        <button
          onClick={exportStats}
          disabled={pixels.size === 0}
          className="w-full px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
        >
          Export Data
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500 space-y-1">
        <div>• Current View: Exports visible area</div>
        <div>• Artwork: High-res painted pixels only</div>
        <div>• Data: JSON with all pixel information</div>
      </div>
    </div>
  );
};