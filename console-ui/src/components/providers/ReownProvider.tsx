"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet } from "wagmi/chains";
import type { AppKitNetwork } from "@reown/appkit/networks";

/**
 * Reown AppKit (WalletConnect) — same provider family the reference console
 * uses. Project ID is Reown's PUBLIC browser key, sourced from our sp500
 * project (same ID across our deployments).
 */
export const REOWN_PROJECT_ID = "7ed02309417cc413eac4b929bf764f1f";

// Robinhood Chain (4663) — the network Ponsbloom settles on.
const robinhoodChain = {
  id: 4663,
  caipNetworkId: "eip155:4663",
  name: "Robinhood Chain",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { url: "https://explorer.mainnet.chain.robinhood.com" } },
} as const satisfies AppKitNetwork;

export const NETWORKS: AppKitNetwork[] = [mainnet, robinhoodChain] as unknown as AppKitNetwork[];

let initialized = false;

export const wagmiAdapter = new WagmiAdapter({
  networks: NETWORKS,
  projectId: REOWN_PROJECT_ID,
  ssr: true,
});

if (typeof window !== "undefined" && !initialized) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: NETWORKS,
    projectId: REOWN_PROJECT_ID,
    themeMode: "dark",
    themeVariables: {
      "--apkt-accent": "#A8C5B5",
      "--apkt-color-background-global": "#0B0B10",
    },
    features: { analytics: false },
    metadata: {
      name: "Ponsbloom",
      description: "Private inference on verified Apple Silicon",
      url: "https://ponsbloom.com",
      icons: [],
    },
  });
  initialized = true;
}

export { wagmiConfig } from "./wagmi-config";
