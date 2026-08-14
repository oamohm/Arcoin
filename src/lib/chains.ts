/**
 * ARCOIN — chains.ts
 * Arc Network chain definition for wagmi/viem
 * Includes RPC fallback chain for resilience
 */

import { defineChain } from "viem"
import { http, fallback } from "wagmi"
import { RPC, ARC_CHAIN_ID } from "./constants"

// ─────────────────────────────────────────────────────────────
// ARC TESTNET CHAIN DEFINITION
// ─────────────────────────────────────────────────────────────
export const arcTestnet = defineChain({
  id:   ARC_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name:     "USD Coin",
    symbol:   "USDC",
    decimals: 6,   // ERC-20 display decimals (not native 18)
  },
  rpcUrls: {
    default: {
      http:      [RPC.primary],
      webSocket: [],
    },
    alchemy: {
      http: [RPC.alchemy],
    },
    thirdweb: {
      http: [RPC.thirdweb],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url:  "https://atlas.blockscout.com",
      apiUrl: "https://atlas.blockscout.com/api",
    },
    arcscan: {
      name: "ArcScan",
      url:  "https://testnet.arcscan.app",
    },
  },
  testnet: true,
})

// ─────────────────────────────────────────────────────────────
// TRANSPORT — Primary with automatic fallback
// wagmi will try each transport in order on failure
// ─────────────────────────────────────────────────────────────
export const arcTransport = fallback([
  http(RPC.primary,  { timeout: 10_000 }),
  http(RPC.thirdweb, { timeout: 10_000 }),
  // http(RPC.alchemy + "/" + process.env.NEXT_PUBLIC_ALCHEMY_KEY),
])

// ─────────────────────────────────────────────────────────────
// SUPPORTED CHAINS (extend here when mainnet launches)
// ─────────────────────────────────────────────────────────────
export const supportedChains = [arcTestnet] as const
export type SupportedChainId = typeof arcTestnet.id
