import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import deploymentInfo from '../../deployment-info.json';

export const somniaTestnet = defineChain({
  id: deploymentInfo.chainId,
  name: 'Somnia Testnet',
  nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
  rpcUrls: { default: { http: ['https://dream-rpc.somnia.network'] } },
  blockExplorers: { default: { name: 'Shannon', url: 'https://shannon-explorer.somnia.network' } },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'PixelVerse',
  projectId: '0a133d20b86fcd037c7daf44adccced2',
  chains: [somniaTestnet],
  ssr: false,
});