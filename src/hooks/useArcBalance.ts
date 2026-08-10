"use client"
/**
 * ARCOIN â€” useArcBalance.ts
 * Live USDC balance with 12s polling and automatic RPC fallback.
 * Single source of truth for all balance displays.
 */

import { useBalance }   from "wagmi"
import { usePrivy }     from "@privy-io/react-auth"
import { TOKENS }       from "@/lib/constants"
import { formatUSDC }   from "@/lib/usdc"

interface ArcBalance {
  raw:           bigint | undefined
  display:       string          // "1,240.50 USDC"
  displayShort:  string          // "1.24K USDC" for compact view
  usd:           string          // "â‰ˆ $1,240.50"
  isLoading:     boolean
  isError:       boolean
  refetch:       () => void
}

export function useArcBalance(): ArcBalance {
  const { user } = usePrivy()

  // Get primary wallet address from Privy (works for both email MPC + injected)
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useBalance({
    address:       walletAddress,
    token:         TOKENS.USDC.address,
    chainId:       5042002,
    query: {
      refetchInterval:         12_000,  // 12 seconds â€” not too aggressive on Arc
      refetchIntervalInBackground: false,
      enabled:                 !!walletAddress,
    },
  })

  const raw = data?.value

  return {
    raw,
    display:      raw !== undefined ? formatUSDC(raw, { decimals: 2 }) : "â€”",
    displayShort: raw !== undefined ? formatUSDC(raw, { decimals: 2, compact: true }) : "â€”",
    usd:          raw !== undefined
                    ? `â‰ˆ $${formatUSDC(raw, { decimals: 2, showSymbol: false })}`
                    : "â€”",
    isLoading,
    isError,
    refetch,
  }
}
