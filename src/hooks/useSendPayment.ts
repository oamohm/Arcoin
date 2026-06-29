"use client"
/**
 * ARCOIN â€” useSendPayment.ts
 * Complete payment send flow:
 *   1. OFAC screening
 *   2. validateSend
 *   3. simulateContract (dry-run, no gas)
 *   4. writeContract (sign + broadcast)
 *   5. waitForTransactionReceipt (confirm)
 *
 * Uses ArcoinPaymentRouter when deployed.
 * Falls back to direct USDC transfer until router is live.
 */

import { useState, useCallback }        from "react"
import { useWriteContract,
         useWaitForTransactionReceipt,
         useSimulateContract,
         usePublicClient }              from "wagmi"
import { parseUnits, isAddress }        from "viem"
import { usePrivy }                     from "@privy-io/react-auth"

import { TOKENS, ARCOIN_CONTRACTS,
         EXPLORER }                     from "@/lib/constants"
import { parseUSDC }                    from "@/lib/usdc"
import { parseError, validateSend }     from "@/lib/errors"
import { requireCleanAddress }          from "@/lib/compliance"
import type { TxState, ArcoinError }    from "@/types"

// Minimal ERC-20 ABI for direct transfer (fallback until router deploys)
const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [
      { name: "to",     type: "address" },
      { name: "value",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

interface SendParams {
  to:     string
  amount: string   // human-readable, e.g. "100.50"
  note?:  string
}

interface UseSendPayment {
  send:       (params: SendParams) => Promise<void>
  txState:    TxState
  reset:      () => void
}

export function useSendPayment(): UseSendPayment {
  const { user }       = usePrivy()
  const publicClient   = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [txState, setTxState] = useState<TxState>({ status: "idle" })

  const reset = useCallback(() => {
    setTxState({ status: "idle" })
  }, [])

  const send = useCallback(async ({ to, amount, note }: SendParams) => {
    const walletAddress = user?.wallet?.address as `0x${string}` | undefined
    if (!walletAddress || !publicClient) {
      setTxState({
        status: "failed",
        error:  { code: "privy_session_expired",
                  message: "Session expire à¤¹à¥‹ à¤—à¤ˆà¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ sign in à¤•à¤°à¥‡à¤‚à¥¤" },
      })
      return
    }

    try {
      // â”€â”€ STEP 0: Validate inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const balanceData = await publicClient.readContract({
        address:      TOKENS.USDC.address,
        abi: [{
          name: "balanceOf", type: "function", stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        }],
        functionName: "balanceOf",
        args:         [walletAddress],
      })

      const validationError = validateSend(amount, to, balanceData as bigint)
      if (validationError) {
        setTxState({ status: "failed", error: validationError })
        return
      }

      // â”€â”€ STEP 1: OFAC screening â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "simulating" })
      await requireCleanAddress(to as `0x${string}`)

      // â”€â”€ STEP 2: Simulate (dry-run, no gas spent) â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const amountRaw    = parseUSDC(amount)
      const contractAddr = ARCOIN_CONTRACTS.PaymentRouter || TOKENS.USDC.address
      const isRouterLive = !!ARCOIN_CONTRACTS.PaymentRouter

      // Use router if deployed, else direct ERC-20 transfer
      const simArgs = isRouterLive
        ? { functionName: "transfer" as const,
            args: [to as `0x${string}`, amountRaw] as const }
        : { functionName: "transfer" as const,
            args: [to as `0x${string}`, amountRaw] as const }

      await publicClient.simulateContract({
        address:      contractAddr,
        abi:          ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args:         [to as `0x${string}`, amountRaw],
        account:      walletAddress,
      })

      // â”€â”€ STEP 3: Sign + broadcast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "signing" })

      const txHash = await writeContractAsync({
        address:      contractAddr,
        abi:          ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args:         [to as `0x${string}`, amountRaw],
      })

      // â”€â”€ STEP 4: Wait for confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "confirming", hash: txHash })

      await publicClient.waitForTransactionReceipt({
        hash:               txHash,
        confirmations:      1,
        pollingInterval:    2_000,
        timeout:            60_000,
      })

      // â”€â”€ STEP 5: Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      setTxState({ status: "success", hash: txHash })

    } catch (err: unknown) {
      // User cancelled â†’ don't show error (silent)
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("user rejected") ||
          msg.toLowerCase().includes("user denied")) {
        setTxState({ status: "idle" })
        return
      }

      setTxState({
        status: "failed",
        error:  parseError(err),
      })
    }
  }, [user, publicClient, writeContractAsync])

  return { send, txState, reset }
}
