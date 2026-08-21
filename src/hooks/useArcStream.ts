/**
 * useArcStream
 * ─────────────────────────────────────────────────────────────
 * Talks to Arcoin's own ArcoinStream.sol contract for linear USDC
 * streaming. Replaces the previous Sablier-based hook so that streaming
 * works as soon as Arcoin's own contracts are deployed, with no
 * dependency on a third-party protocol being live on Arc.
 *
 * Exposes the same function names/shapes the Stream screen already uses
 * (createStream, createBulk, withdrawMax, cancelStream, getStreamData)
 * so swapping this in for the old useSablier hook needed only an import
 * change in StreamScreen.tsx.
 */
import { useState, useCallback }             from "react"
import { usePublicClient, useWriteContract } from "wagmi"
import { usePrivy }                          from "@privy-io/react-auth"
import { ARCOIN_CONTRACTS, TOKENS }          from "@/lib/constants"
import { parseUSDC }                         from "@/lib/usdc"
import type { Stream, StreamRecipient, TxState } from "@/types"

const APPROVE_ABI = [{
  name: "approve", type: "function", stateMutability: "nonpayable",
  inputs:  [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const

const STREAM_ABI = [
  {
    name: "createStream", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "recipient",       type: "address" },
      { name: "token",           type: "address" },
      { name: "totalAmount",     type: "uint128" },
      { name: "cliffSeconds",    type: "uint40"  },
      { name: "durationSeconds", type: "uint40"  },
      { name: "cancelable",      type: "bool"    },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  {
    name: "withdraw", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }], outputs: [],
  },
  {
    name: "cancel", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }], outputs: [],
  },
  {
    name: "getStream", type: "function", stateMutability: "view",
    inputs:  [{ name: "streamId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple", components: [
        { name: "sender",      type: "address" },
        { name: "recipient",   type: "address" },
        { name: "token",       type: "address" },
        { name: "totalAmount", type: "uint128" },
        { name: "withdrawn",   type: "uint128" },
        { name: "startTime",   type: "uint40"  },
        { name: "cliffTime",   type: "uint40"  },
        { name: "endTime",     type: "uint40"  },
        { name: "cancelable",  type: "bool"    },
        { name: "canceled",    type: "bool"    },
      ],
    }],
  },
  {
    name: "streamedAmount", type: "function", stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

interface CreateStreamParams {
  recipient:     string
  totalAmount:   string
  durationDays:  number
  cliffDays?:    number
  cancelable?:   boolean
}

interface UseArcStream {
  createStream:  (params: CreateStreamParams) => Promise<bigint | null>
  createBulk:    (recipients: StreamRecipient[]) => Promise<void>
  withdrawMax:   (streamId: bigint) => Promise<void>
  cancelStream:  (streamId: bigint) => Promise<void>
  getStreamData: (streamId: bigint) => Promise<Stream | null>
  txState:       TxState
  reset:         () => void
}

export function useArcStream(): UseArcStream {
  const { user }               = usePrivy()
  const publicClient           = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const walletAddress = user?.wallet?.address as `0x${string}` | undefined

  const [txState, setTxState] = useState<TxState>({ status: "idle" })
  const reset = useCallback(() => setTxState({ status: "idle" }), [])

  const streamAddr  = ARCOIN_CONTRACTS.Stream
  const streamReady = !!streamAddr && (streamAddr as string) !== ""

  const notDeployed = () => {
    setTxState({
      status: "failed",
      error: { code: "contract_not_deployed", message: "ArcoinStream अभी deploy नहीं हुआ। Deploy करें पहले।" },
    })
  }

  const createStream = useCallback(async (params: CreateStreamParams): Promise<bigint | null> => {
    if (!walletAddress || !publicClient || !streamReady) { notDeployed(); return null }

    try {
      const totalAmount = parseUSDC(params.totalAmount)
      const cliffSec    = Math.floor((params.cliffDays ?? 0) * 86400)
      const durationSec = Math.floor(params.durationDays * 86400)
      const cancelable  = params.cancelable ?? true

      setTxState({ status: "signing" })
      const approveTx = await writeContractAsync({
        address: TOKENS.USDC.address, abi: APPROVE_ABI, functionName: "approve",
        args: [streamAddr, totalAmount],
      })
      setTxState({ status: "confirming", hash: approveTx })
      await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1, pollingInterval: 2000 })

      setTxState({ status: "signing" })
      const createTx = await writeContractAsync({
        address: streamAddr, abi: STREAM_ABI, functionName: "createStream",
        args: [
          params.recipient as `0x${string}`, TOKENS.USDC.address,
          totalAmount, cliffSec, durationSec, cancelable,
        ],
      })
      setTxState({ status: "confirming", hash: createTx })
      await publicClient.waitForTransactionReceipt({ hash: createTx, confirmations: 1, pollingInterval: 2000, timeout: 60000 })

      setTxState({ status: "success", hash: createTx })
      return null
    } catch (err: any) {
      setTxState({ status: "failed", error: { code: "tx_failed", message: err?.shortMessage || err?.message || "Stream create fail हो गया।" } })
      return null
    }
  }, [walletAddress, publicClient, streamReady, streamAddr, writeContractAsync])

  const createBulk = useCallback(async (recipients: StreamRecipient[]) => {
    if (!streamReady) { notDeployed(); return }
    for (const r of recipients) {
      await createStream({
        recipient:    r.address,
        totalAmount:  r.amountUSDC,
        durationDays: r.durationDays,
      })
    }
  }, [streamReady, createStream])

  const withdrawMax = useCallback(async (streamId: bigint) => {
    if (!publicClient || !streamReady) { notDeployed(); return }
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({
        address: streamAddr, abi: STREAM_ABI, functionName: "withdraw", args: [streamId],
      })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: tx })
    } catch (err: any) {
      setTxState({ status: "failed", error: { code: "tx_failed", message: err?.shortMessage || err?.message || "Withdraw fail हो गया।" } })
    }
  }, [publicClient, streamReady, streamAddr, writeContractAsync])

  const cancelStream = useCallback(async (streamId: bigint) => {
    if (!publicClient || !streamReady) { notDeployed(); return }
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({
        address: streamAddr, abi: STREAM_ABI, functionName: "cancel", args: [streamId],
      })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: tx })
    } catch (err: any) {
      setTxState({ status: "failed", error: { code: "tx_failed", message: err?.shortMessage || err?.message || "Cancel fail हो गया।" } })
    }
  }, [publicClient, streamReady, streamAddr, writeContractAsync])

  const getStreamData = useCallback(async (streamId: bigint): Promise<Stream | null> => {
    if (!publicClient || !streamReady) return null
    try {
      const raw = await publicClient.readContract({
        address: streamAddr, abi: STREAM_ABI, functionName: "getStream", args: [streamId],
      }) as any
      const streamed = await publicClient.readContract({
        address: streamAddr, abi: STREAM_ABI, functionName: "streamedAmount", args: [streamId],
      }) as bigint

      const status: Stream["status"] =
        raw.canceled ? "canceled" : Number(raw.endTime) <= Math.floor(Date.now()/1000) ? "completed" : "active"

      return {
        id:              streamId,
        sender:          raw.sender,
        recipient:       raw.recipient,
        totalAmountRaw:  raw.totalAmount,
        streamedRaw:     streamed,
        startTime:       Number(raw.startTime),
        endTime:         Number(raw.endTime),
        cancelable:      raw.cancelable,
        status,
        tokenSymbol:     "USDC",
        contractAddress: streamAddr,
      }
    } catch {
      return null
    }
  }, [publicClient, streamReady, streamAddr])

  return { createStream, createBulk, withdrawMax, cancelStream, getStreamData, txState, reset }
}
