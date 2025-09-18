import { create } from 'zustand';
import { parseEther } from 'viem';
import deploymentInfo from '../../deployment-info.json';
import { PixelCanvasABI } from '../contracts/PixelCanvas';

interface WalletStore {
  paintPixel: (x: number, y: number, color: string, writeContract: any) => Promise<string>;
  batchPaintPixels: (
    pixels: Array<{x: number, y: number, color: string}>, 
    writeContract: any
  ) => Promise<string>;
}

export const useWalletStore = create<WalletStore>(() => ({
  paintPixel: async (x, y, color, writeContract) => {
    const colorValue = parseInt(color.slice(1), 16);
    
    const hash = await writeContract({
      address: deploymentInfo.contractAddress as `0x${string}`,
      abi: PixelCanvasABI,
      functionName: 'paintPixel',
      args: [x, y, colorValue],
      value: parseEther('0.001')
    });
    
    return hash;
  },

  batchPaintPixels: async (pixels, writeContract) => {
    const xCoords = pixels.map(p => p.x);
    const yCoords = pixels.map(p => p.y);
    const colors = pixels.map(p => parseInt(p.color.slice(1), 16));
    
    const totalCost = parseEther((0.001 * pixels.length).toString());
    
    const hash = await writeContract({
      address: deploymentInfo.contractAddress as `0x${string}`,
      abi: PixelCanvasABI,
      functionName: 'batchPaintPixels',
      args: [xCoords, yCoords, colors],
      value: totalCost
    });
    
    return hash;
  }
}));