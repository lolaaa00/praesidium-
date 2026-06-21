import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi';

/**
 * wagmi configuration with injected wallet connector.
 * Supports MetaMask, Brave Wallet, and any browser-injected wallet.
 *
 * We use mainnet as the default chain for signature verification only —
 * GenLayer interactions go through the genlayer-js SDK separately.
 */
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
