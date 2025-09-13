import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';

export const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network/'] },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network/' },
  },
} as const;

export const wagmiConfig = getDefaultConfig({
  appName: 'PixelVerse',
  projectId: '2f05ae7f1116030fde2d36508f472bfb', // This is a dummy ID to avoid API errors
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http(),
  },
});