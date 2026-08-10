"use client"
/**
 * ARCOIN â€” useArcScan.ts
 * Fetches transaction history from Blockscout API.
 * Transforms raw API data â†’ typed ArcTransaction objects.
 *
 * Fallback: if API fails, returns cached data from sessionStorage.
 */

import { useState, useCallback } from "react"
import { usePrivy }              from "@privy-io/react-auth"
import { TOKENS, EXPLORER }      from "@/lib/constants"
import { formatUSDC }            from "@/lib/usdc"
import type { ArcTransaction }   from "@/types"

const BLOCKSCOUT_API = "https://atlas.blockscout.com/api/v2"
const CACHE_KEY      = "arcoin_tx_cache"

interface UseArcScan {
  transactions:  ArcTransaction[]
  isLoading:     boolean
  isError:       boolean
  fetchHistory:  (limit?: number) => Promise<void>
  explorerUrl:   (hash: string) => string
}

// Raw Blockscout token transfer response
interface BlockscoutTransfer {
  transaction_hash: string
  from: { hash: string }
  to:   { hash: string }
  total: { value: string; decimals: string }
  timestamp: string
  block_number: number
  type: string
}

export function useArcScan(): UseArcScan {
  const { user }         = usePrivy()
  const [txList, setTxList]     = useState<ArcTransaction[]>([])
  const [isLoading, setLoading] = useState(false)
  const [isError, setError]     = useState(false)

  const walletAddress = user?.wallet?.address as string | undefined

  const fetchHistory = useCallback(async (limit = 20) => {
    if (!walletAddress) return

    setLoading(true)
    setError(false)

    try {
      // Blockscout V2 API â€” token transfers for USDC
      const url = `${BLOCKSCOUT_API}/addresses/${walletAddress}/token-transfers` +
                  `?token=${TOKENS.USDC.address}&limit=${limit}&type=ERC-20`

      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal:  AbortSignal.timeout(8000),
      })

      if (!res.ok) throw new Error(`Blockscout ${res.status}`)

      const data = await res.json()
      const items: BlockscoutTransfer[] = data.items ?? []

      const parsed: ArcTransaction[] = items.map(item => {
        const isOut = item.from.hash.toLowerCase() === walletAddress.toLowerCase()
        const rawVal = BigInt(item.total.value)

        return {
          hash:        item.transaction_hash as `0x${string}`,
          type:        isOut ? "send" : "receive",
          from:        item.from.hash as `0x${string}`,
          to:          item.to.hash   as `0x${string}`,
          amountRaw:   rawVal,
          tokenSymbol: "USDC",
          blockNumber: BigInt(item.block_number),
          timestamp:   Math.floor(new Date(item.timestamp).getTime() / 1000),
          status:      "confirmed",
          explorerUrl: EXPLORER.txUrl(item.transaction_hash),
        }
      })

      setTxList(parsed)

      // Cache for offline/fallback
      try {
        sessionStorage.setItem(
          CACHE_KEY + "_" + walletAddress,
          JSON.stringify(parsed.map(t => ({ ...t,
            amountRaw:   t.amountRaw.toString(),
            blockNumber: t.blockNumber.toString(),
          })))
        )
      } catch { /* storage unavailable */ }

    } catch (err) {
      console.error("ArcScan fetch failed:", err)
      setError(true)

      // Load from cache
      try {
        const cached = sessionStorage.getItem(CACHE_KEY + "_" + walletAddress)
        if (cached) {
          const parsed = JSON.parse(cached).map((t: Record<string, unknown>) => ({
            ...t,
            amountRaw:   BigInt(t.amountRaw as string),
            blockNumber: BigInt(t.blockNumber as string),
          }))
          setTxList(parsed)
        }
      } catch { /* no cache */ }

    } finally {
      setLoading(false)
    }
  }, [walletAddress])

  return {
    transactions: txList,
    isLoading,
    isError,
    fetchHistory,
    explorerUrl: EXPLORER.txUrl,
  }
}
