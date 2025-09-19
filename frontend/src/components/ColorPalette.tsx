import React from 'react';
import { useCanvasStore } from '../stores/canvasStore';
const PRESET_COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#000000', '#FFFFFF', '#808080', '#800000', '#008000', '#000080',
  '#808000', '#800080', '#008080', '#C0C0C0', '#FFA500', '#A52A2A',
  '#DDA0DD', '#98FB98', '#F0E68C', '#FFB6C1', '#87CEEB', '#D2691E'
];

export const ColorPalette: React.FC = () => {
  const { selectedColor, setSelectedColor } = useCanvasStore();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-800 mb-3">Colors</h3>
      
      <div className="grid grid-cols-6 gap-1 mb-4">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded border-2 transition-all ${
              selectedColor === color 
                ? 'border-gray-800 scale-110' 
                : 'border-gray-300 hover:border-gray-500'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedColor(color)}
            title={color}
          />
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-gray-600">Custom Color</label>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-full h-8 border border-gray-300 rounded cursor-pointer"
        />
      </div>

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
        Selected: {selectedColor.toUpperCase()}
      </div>
    </div>
  );
};