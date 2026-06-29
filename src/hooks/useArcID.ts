"use client"
/**
 * ARCOIN â€” useArcID.ts
 * ArcID human-readable payment identity hook.
 *
 * Operations:
 *   resolve(name)       â€” "alice" â†’ 0xAbCd...
 *   reverseLookup(addr) â€” 0xAbCd... â†’ "alice"
 *   checkAvailable(name)â€” is "alice" available?
 *   register(name,yrs)  â€” register an ArcID (1 USDC/year)
 *   release(name)       â€” release owned ArcID
 *
 * Fallback: if Registry not deployed â†’ returns null gracefully.
 * Cache: resolved names cached in sessionStorage (5 min TTL).
 */

import { useState, useCallback }         from "react"
import { usePublicClient, useWriteContract } from "wagmi"
import { usePrivy }                       from "@privy-io/react-auth"
import { ARCOIN_CONTRACTS, TOKENS }       from "@/lib/constants"
import { parseUSDC }                      from "@/lib/usdc"
import { parseError }                     from "@/lib/errors"
import type { ArcID, TxState }            from "@/types"

// â”€â”€ REGISTRY ABI (read + write subset) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REGISTRY_ABI = [
  {
    name: "resolve",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "reverseLookup",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "addr", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "isAvailable",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getInfo",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [
      { name: "owner",  type: "address" },
      { name: "expiry", type: "uint256" },
      { name: "active", type: "bool"    },
    ],
  },
  {
    name: "register",
    type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "name", type: "string" }, { name: "years", type: "uint8" }],
    outputs: [],
  },
  {
    name: "release",
    type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    name: "renew",
    type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "name", type: "string" }, { name: "years", type: "uint8" }],
    outputs: [],
  },
] as const

const APPROVE_ABI = [
  {
    name: "approve",
    type: "function", stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

// â”€â”€ CACHE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CACHE_TTL   = 5 * 60 * 1000   // 5 minutes
const cacheGet    = (key: string) => {
  try {
    const raw = sessionStorage.getItem("arcid_" + key)
    if (!raw) return null
    const { value, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem("arcid_" + key); return null }
    return value
  } catch { return null }
}
const cacheSet = (key: string, value: unknown) => {
  try { sessionStorage.setItem("arcid_" + key, JSON.stringify({ value, ts: Date.now() })) }
  catch { /* storage unavailable */ }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface UseArcID {
  // Read
  resolve:        (name: string) => Promise<`0x${string}` | null>
  reverseLookup:  (address: `0x${string}`) => Promise<string | null>
  checkAvailable: (name: string) => Promise<boolean>
  getInfo:        (name: string) => Promise<{ owner: `0x${string}`; expiry: number; active: boolean } | null>
  // Write
  register:       (name: string, years?: number) => Promise<void>
  release:        (name: string) => Promise<void>
  renew:          (name: string, years?: number) => Promise<void>
  // State
  myArcID:        string | null
  txState:        TxState
  isLoading:      boolean
  reset:          () => void
  // Utility: resolves either 0x address or ArcID handle
  resolveRecipient: (input: string) => Promise<`0x${string}` | null>
}

export function useArcID(): UseArcID {
  const { user }           = usePrivy()
  const publicClient       = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [txState,   setTxState]  = useState<TxState>({ status: "idle" })
  const [myArcID,   setMyArcID]  = useState<string | null>(null)
  const [isLoading, setLoading]  = useState(false)

  const reset         = useCallback(() => setTxState({ status: "idle" }), [])
  const walletAddress = user?.wallet?.address as `0x${string}` | undefined
  const registryAddr  = ARCOIN_CONTRACTS.Registry

  // â”€â”€ REGISTRY DEPLOYED CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const registryReady = !!registryAddr && registryAddr !== ""

  // â”€â”€ RESOLVE: name â†’ address â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const resolve = useCallback(async (
    name: string
  ): Promise<`0x${string}` | null> => {
    if (!publicClient || !registryReady) return null

    const normalized = name.toLowerCase().replace(/\.arc$/, "")
    const cached = cacheGet("resolve_" + normalized)
    if (cached) return cached as `0x${string}`

    try {
      setLoading(true)
      const addr = await publicClient.readContract({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "resolve",
        args:         [normalized],
      }) as `0x${string}`

      const result = addr === "0x0000000000000000000000000000000000000000" ? null : addr
      if (result) cacheSet("resolve_" + normalized, result)
      return result
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [publicClient, registryReady, registryAddr])

  // â”€â”€ REVERSE LOOKUP: address â†’ name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const reverseLookup = useCallback(async (
    address: `0x${string}`
  ): Promise<string | null> => {
    if (!publicClient || !registryReady) return null

    const cached = cacheGet("reverse_" + address.toLowerCase())
    if (cached !== null) return cached

    try {
      const name = await publicClient.readContract({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "reverseLookup",
        args:         [address],
      }) as string

      const result = name || null
      cacheSet("reverse_" + address.toLowerCase(), result)

      // Update myArcID if this is the current user
      if (address.toLowerCase() === walletAddress?.toLowerCase() && result) {
        setMyArcID(result)
      }
      return result
    } catch {
      return null
    }
  }, [publicClient, registryReady, registryAddr, walletAddress])

  // â”€â”€ CHECK AVAILABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const checkAvailable = useCallback(async (name: string): Promise<boolean> => {
    if (!publicClient || !registryReady) return false

    const normalized = name.toLowerCase().replace(/\.arc$/, "")
    try {
      return await publicClient.readContract({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "isAvailable",
        args:         [normalized],
      }) as boolean
    } catch {
      return false
    }
  }, [publicClient, registryReady, registryAddr])

  // â”€â”€ GET INFO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getInfo = useCallback(async (name: string) => {
    if (!publicClient || !registryReady) return null

    const normalized = name.toLowerCase().replace(/\.arc$/, "")
    try {
      const [owner, expiry, active] = await publicClient.readContract({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "getInfo",
        args:         [normalized],
      }) as [`0x${string}`, bigint, boolean]

      return { owner, expiry: Number(expiry), active }
    } catch {
      return null
    }
  }, [publicClient, registryReady, registryAddr])

  // â”€â”€ REGISTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const register = useCallback(async (name: string, years = 1) => {
    if (!walletAddress || !publicClient || !registryReady) {
      setTxState({ status: "failed",
        error: { code: "contract_not_deployed",
                 message: "ArcID Registry à¤…à¤­à¥€ deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤" } })
      return
    }

    const normalized = name.toLowerCase().replace(/\.arc$/, "")

    try {
      // Step 1: Approve USDC (1 USDC Ã— years)
      setTxState({ status: "signing" })
      const fee         = parseUSDC(String(years))   // 1.000000 USDC per year
      const approveTx   = await writeContractAsync({
        address:      TOKENS.USDC.address,
        abi:          APPROVE_ABI,
        functionName: "approve",
        args:         [registryAddr, fee],
      })

      setTxState({ status: "confirming", hash: approveTx })
      await publicClient.waitForTransactionReceipt({
        hash: approveTx, confirmations: 1, pollingInterval: 2000
      })

      // Step 2: Register
      setTxState({ status: "signing" })
      const registerTx = await writeContractAsync({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "register",
        args:         [normalized, years],
      })

      setTxState({ status: "confirming", hash: registerTx })
      await publicClient.waitForTransactionReceipt({
        hash: registerTx, confirmations: 1, pollingInterval: 2000, timeout: 60000
      })

      setMyArcID(normalized)
      cacheSet("reverse_" + walletAddress.toLowerCase(), normalized)
      cacheSet("resolve_" + normalized, walletAddress)
      setTxState({ status: "success", hash: registerTx })

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("user rejected")) {
        setTxState({ status: "idle" })
        return
      }
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, registryReady, registryAddr, writeContractAsync])

  // â”€â”€ RELEASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const release = useCallback(async (name: string) => {
    if (!walletAddress || !publicClient || !registryReady) return

    const normalized = name.toLowerCase().replace(/\.arc$/, "")
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "release",
        args:         [normalized],
      })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setMyArcID(null)
      setTxState({ status: "success", hash: tx })
    } catch (err) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, registryReady, registryAddr, writeContractAsync])

  // â”€â”€ RENEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renew = useCallback(async (name: string, years = 1) => {
    if (!walletAddress || !publicClient || !registryReady) return

    const normalized = name.toLowerCase().replace(/\.arc$/, "")
    try {
      setTxState({ status: "signing" })
      const fee       = parseUSDC(String(years))
      const approveTx = await writeContractAsync({
        address:      TOKENS.USDC.address,
        abi:          APPROVE_ABI,
        functionName: "approve",
        args:         [registryAddr, fee],
      })
      await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1, pollingInterval: 2000 })

      const renewTx = await writeContractAsync({
        address:      registryAddr,
        abi:          REGISTRY_ABI,
        functionName: "renew",
        args:         [normalized, years],
      })
      setTxState({ status: "confirming", hash: renewTx })
      await publicClient.waitForTransactionReceipt({ hash: renewTx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: renewTx })
    } catch (err) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, registryReady, registryAddr, writeContractAsync])

  // â”€â”€ UNIVERSAL RECIPIENT RESOLVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Handles both raw 0x address AND "alice.arc" / "alice" handles
  const resolveRecipient = useCallback(async (
    input: string
  ): Promise<`0x${string}` | null> => {
    const trimmed = input.trim()

    // Already a raw address
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      return trimmed as `0x${string}`
    }

    // ArcID handle (with or without .arc)
    const resolved = await resolve(trimmed)
    return resolved
  }, [resolve])

  return {
    resolve, reverseLookup, checkAvailable, getInfo,
    register, release, renew,
    myArcID, txState, isLoading, reset,
    resolveRecipient,
  }
}
