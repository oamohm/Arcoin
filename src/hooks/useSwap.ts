"use client"
/**
 * ARCOIN â€” useSwap.ts
 * APEXISWAP swap engine integration.
 *
 * Routing logic (determineSwapPath):
 *   USDC â†” EURC  â†’  StableFX (Circle official)
 *   Cross-chain   â†’  CCTP Bridge
 *   Everything else â†’  APEXISWAP Router
 *
 * Flow: getQuote â†’ approveIfNeeded â†’ simulate â†’ execute â†’ confirm
 */

import { useState, useCallback, useRef } from "react"
import { usePublicClient, useWriteContract } from "wagmi"
import { usePrivy } from "@privy-io/react-auth"

import { TOKENS, APEXISWAP, STABLEFX, UTILS } from "@/lib/constants"
import { parseUSDC, applySlippage, formatUSDC }  from "@/lib/usdc"
import { parseError }                             from "@/lib/errors"
import { requireCleanAddress }                    from "@/lib/compliance"
import type { SwapQuote, SwapPath, TxState }      from "@/types"

// â”€â”€ APEXISWAP ROUTER ABI (Uniswap V2 style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const APEXISWAP_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path",     type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn",     type: "uint256"   },
      { name: "amountOutMin", type: "uint256"   },
      { name: "path",         type: "address[]" },
      { name: "to",           type: "address"   },
      { name: "deadline",     type: "uint256"   },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const

// â”€â”€ ERC-20 APPROVE ABI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// â”€â”€ PATH ROUTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function determineSwapPath(
  tokenIn:  `0x${string}`,
  tokenOut: `0x${string}`,
): SwapPath {
  const isUSDC = (t: string) => t.toLowerCase() === TOKENS.USDC.address.toLowerCase()
  const isEURC = (t: string) => t.toLowerCase() === TOKENS.EURC.address.toLowerCase()

  if ((isUSDC(tokenIn) && isEURC(tokenOut)) ||
      (isEURC(tokenIn) && isUSDC(tokenOut))) {
    return "stablefx"
  }
  return "apexiswap"
}

// â”€â”€ DEADLINE â€” 30s from now â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const deadline30s = () => BigInt(Math.floor(Date.now() / 1000) + 30)

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface UseSwap {
  getQuote:    (amountIn: string, tokenIn: `0x${string}`, tokenOut: `0x${string}`) => Promise<SwapQuote | null>
  executeSwap: (quote: SwapQuote, slippageBps?: number) => Promise<void>
  txState:     TxState
  quoteState:  { quote: SwapQuote | null; isLoading: boolean; expiresIn: number }
  reset:       () => void
}

export function useSwap(): UseSwap {
  const { user }           = usePrivy()
  const publicClient       = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [txState,   setTxState]   = useState<TxState>({ status: "idle" })
  const [quote,     setQuote]     = useState<SwapQuote | null>(null)
  const [quoteLoading, setQL]     = useState(false)
  const [expiresIn, setExpiresIn] = useState(0)
  const expiryTimer               = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => {
    setTxState({ status: "idle" })
    setQuote(null)
    if (expiryTimer.current) clearInterval(expiryTimer.current)
  }, [])

  // â”€â”€ GET QUOTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getQuote = useCallback(async (
    amountIn: string,
    tokenIn:  `0x${string}`,
    tokenOut: `0x${string}`,
  ): Promise<SwapQuote | null> => {
    if (!publicClient) return null

    setQL(true)
    try {
      const amountInRaw = parseUSDC(amountIn)
      if (amountInRaw === 0n) return null

      const path        = determineSwapPath(tokenIn, tokenOut)
      const routerAddr  = APEXISWAP.Router
      const swapPath    = [tokenIn, tokenOut]

      // getAmountsOut â€” read only, free
      const amounts = await publicClient.readContract({
        address:      routerAddr,
        abi:          APEXISWAP_ABI,
        functionName: "getAmountsOut",
        args:         [amountInRaw, swapPath],
      }) as bigint[]

      const amountOutRaw = amounts[amounts.length - 1]

      // Rough price impact: (amountIn - amountOut) / amountIn * 100
      const impact = Number(amountInRaw - amountOutRaw) / Number(amountInRaw) * 100

      const newQuote: SwapQuote = {
        path,
        tokenIn,
        tokenOut,
        amountInRaw,
        amountOutRaw,
        priceImpact: Math.max(0, impact),
        fee:         (amountInRaw * BigInt(APEXISWAP_ABI.length)) / 10000n, // ~0.1%
        expiresAt:   Math.floor(Date.now() / 1000) + 30,
        route:       swapPath,
      }

      setQuote(newQuote)

      // Countdown timer
      if (expiryTimer.current) clearInterval(expiryTimer.current)
      setExpiresIn(30)
      expiryTimer.current = setInterval(() => {
        setExpiresIn(prev => {
          if (prev <= 1) {
            clearInterval(expiryTimer.current!)
            setQuote(null)      // quote expired
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return newQuote

    } catch (err) {
      console.error("getQuote error:", err)
      return null
    } finally {
      setQL(false)
    }
  }, [publicClient])

  // â”€â”€ EXECUTE SWAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const executeSwap = useCallback(async (
    q: SwapQuote,
    slippageBps = 50,   // 0.5% default
  ) => {
    const walletAddress = user?.wallet?.address as `0x${string}` | undefined
    if (!walletAddress || !publicClient) {
      setTxState({ status: "failed",
        error: { code: "privy_session_expired",
                 message: "Session expire à¤¹à¥‹ à¤—à¤ˆà¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ sign in à¤•à¤°à¥‡à¤‚à¥¤" } })
      return
    }

    // Quote expiry check
    if (Math.floor(Date.now() / 1000) >= q.expiresAt) {
      setTxState({ status: "failed",
        error: { code: "quote_expired",
                 message: "Quote expire à¤¹à¥‹ à¤—à¤ˆà¥¤ à¤¨à¤ˆ quote à¤²à¥‡ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚..." } })
      return
    }

    try {
      setTxState({ status: "simulating" })

      const amountOutMin = applySlippage(q.amountOutRaw, slippageBps)

      // â”€â”€ Step 1: Check allowance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const currentAllowance = await publicClient.readContract({
        address:      q.tokenIn,
        abi:          APPROVE_ABI,
        functionName: "allowance",
        args:         [walletAddress, APEXISWAP.Router],
      }) as bigint

      // â”€â”€ Step 2: Approve if needed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (currentAllowance < q.amountInRaw) {
        setTxState({ status: "signing" })

        const approveTx = await writeContractAsync({
          address:      q.tokenIn,
          abi:          APPROVE_ABI,
          functionName: "approve",
          args:         [APEXISWAP.Router, q.amountInRaw],
        })

        setTxState({ status: "confirming", hash: approveTx })
        await publicClient.waitForTransactionReceipt({
          hash: approveTx, confirmations: 1, pollingInterval: 2_000
        })
      }

      // â”€â”€ Step 3: Simulate swap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "simulating" })

      await publicClient.simulateContract({
        address:      APEXISWAP.Router,
        abi:          APEXISWAP_ABI,
        functionName: "swapExactTokensForTokens",
        args:         [q.amountInRaw, amountOutMin, q.route, walletAddress, deadline30s()],
        account:      walletAddress,
      })

      // â”€â”€ Step 4: Execute â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "signing" })

      const swapTx = await writeContractAsync({
        address:      APEXISWAP.Router,
        abi:          APEXISWAP_ABI,
        functionName: "swapExactTokensForTokens",
        args:         [q.amountInRaw, amountOutMin, q.route, walletAddress, deadline30s()],
      })

      // â”€â”€ Step 5: Confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "confirming", hash: swapTx })

      await publicClient.waitForTransactionReceipt({
        hash: swapTx, confirmations: 1, pollingInterval: 2_000, timeout: 60_000
      })

      setTxState({ status: "success", hash: swapTx })
      setQuote(null)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("user rejected") ||
          msg.toLowerCase().includes("user denied")) {
        setTxState({ status: "idle" })
        return
      }
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [user, publicClient, writeContractAsync])

  return {
    getQuote,
    executeSwap,
    txState,
    quoteState: { quote, isLoading: quoteLoading, expiresIn },
    reset,
  }
}
