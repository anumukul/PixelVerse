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
  projectId: 'get-your-own-at-walletconnect-cloud',
  chains: [somniaTestnet],
  ssr: false,
});