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
  updateCursorOnBlockchain: (x: number, y: number) => Promise<void>;
  lastBlockchainCursorUpdate: number;
  isUpdatingCursor: boolean;
}

let writeContractRef: any = null;

export const useWalletStore = create<WalletStore>((set, get) => ({
  lastBlockchainCursorUpdate: 0,
  isUpdatingCursor: false,

  paintPixel: async (x, y, color, writeContract) => {
    writeContractRef = writeContract;
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
    writeContractRef = writeContract;
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
  },

  updateCursorOnBlockchain: async (x, y) => {
    if (!writeContractRef) return;
    
    const state = get();
    const now = Date.now();
    
    if (state.isUpdatingCursor || now - state.lastBlockchainCursorUpdate < 3000) {
      return;
    }

    set({ isUpdatingCursor: true });

    try {
      await writeContractRef({
        address: deploymentInfo.contractAddress as `0x${string}`,
        abi: PixelCanvasABI,
        functionName: 'updateCursor',
        args: [x, y]
      });
      
      set({ lastBlockchainCursorUpdate: now });
    } catch (error) {
      
    } finally {
      set({ isUpdatingCursor: false });
    }
  }
}));