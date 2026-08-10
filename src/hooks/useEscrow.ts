"use client"
/**
 * ARCOIN â€” useEscrow.ts
 * ArcoinEscrow contract interactions.
 *
 * Operations:
 *   createEscrow   â€” lock funds, set recipient + deadline
 *   release        â€” sender confirms delivery
 *   refund         â€” sender reclaims after deadline
 *   raiseDispute   â€” either party escalates
 *   resolveDispute â€” arbiter splits funds
 *   getUserEscrows â€” read all escrows for wallet
 */

import { useState, useCallback }          from "react"
import { usePublicClient, useWriteContract } from "wagmi"
import { usePrivy }                          from "@privy-io/react-auth"
import { keccak256, toBytes }                from "viem"
import { TOKENS, ARCOIN_CONTRACTS }          from "@/lib/constants"
import { parseUSDC, formatUSDC }             from "@/lib/usdc"
import { parseError }                        from "@/lib/errors"
import { requireCleanAddress }               from "@/lib/compliance"
import type { TxState }                      from "@/types"

// â”€â”€ ESCROW ABI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ESCROW_ABI = [
  {
    name: "createEscrow",
    type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "recipient",        type: "address"  },
      { name: "amount",           type: "uint256"  },
      { name: "deadlineSecs",     type: "uint256"  },
      { name: "arbiter",          type: "address"  },
      { name: "descriptionHash",  type: "bytes32"  },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    name: "release",
    type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "refund",
    type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "raiseDispute",
    type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "reason",   type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "getEscrow",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "escrowId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "sender",          type: "address" },
        { name: "recipient",       type: "address" },
        { name: "arbiter",         type: "address" },
        { name: "amount",          type: "uint256" },
        { name: "createdAt",       type: "uint256" },
        { name: "deadline",        type: "uint256" },
        { name: "status",          type: "uint8"   },
        { name: "descriptionHash", type: "bytes32" },
        { name: "disputeLog",      type: "string"  },
      ],
    }],
  },
  {
    name: "getSenderEscrows",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "sender", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "previewReleaseFee",
    type: "function", stateMutability: "view",
    inputs:  [{ name: "amount", type: "uint256" }],
    outputs: [
      { name: "fee", type: "uint256" },
      { name: "net", type: "uint256" },
    ],
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

// â”€â”€ STATUS MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_LABELS = ["Active", "Released", "Refunded", "Disputed", "Resolved"] as const

// â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface EscrowData {
  id:              bigint
  sender:          `0x${string}`
  recipient:       `0x${string}`
  arbiter:         `0x${string}`
  amount:          bigint
  amountDisplay:   string
  createdAt:       number
  deadline:        number
  deadlineDisplay: string
  status:          typeof STATUS_LABELS[number]
  statusIndex:     number
  descriptionHash: `0x${string}`
  disputeLog:      string
  isExpired:       boolean
  timeRemaining:   string
}

export interface CreateEscrowParams {
  recipient:    string
  amountUSDC:   string
  deadlineDays: number
  arbiter?:     string
  description:  string
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useEscrow() {
  const { user }           = usePrivy()
  const publicClient       = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [txState,    setTxState]    = useState<TxState>({ status: "idle" })
  const [escrows,    setEscrows]    = useState<EscrowData[]>([])
  const [isLoading,  setIsLoading]  = useState(false)

  const reset = useCallback(() => setTxState({ status: "idle" }), [])

  const walletAddress = user?.wallet?.address as `0x${string}` | undefined
  const escrowAddr    = ARCOIN_CONTRACTS.Escrow

  // â”€â”€ GUARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const guardContract = () => {
    if (!escrowAddr) {
      setTxState({ status: "failed", error: {
        code: "contract_not_deployed",
        message: "Escrow contract à¤…à¤­à¥€ deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤ Deploy à¤•à¤°à¥‡à¤‚ à¤ªà¤¹à¤²à¥‡à¥¤",
      }})
      return false
    }
    return true
  }

  // â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createEscrow = useCallback(async (p: CreateEscrowParams): Promise<bigint | null> => {
    if (!walletAddress || !publicClient || !guardContract()) return null

    try {
      setTxState({ status: "simulating" })
      await requireCleanAddress(p.recipient as `0x${string}`)

      const amountRaw      = parseUSDC(p.amountUSDC)
      const deadlineSecs   = BigInt(p.deadlineDays * 86400)
      const arbiter        = (p.arbiter || "0x0000000000000000000000000000000000000000") as `0x${string}`
      const descHash       = keccak256(toBytes(p.description)) as `0x${string}`

      // Step 1: Approve
      setTxState({ status: "signing" })
      const approveTx = await writeContractAsync({
        address: TOKENS.USDC.address, abi: APPROVE_ABI,
        functionName: "approve", args: [escrowAddr, amountRaw],
      })
      setTxState({ status: "confirming", hash: approveTx })
      await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1, pollingInterval: 2000 })

      // Step 2: Create escrow
      setTxState({ status: "signing" })
      const createTx = await writeContractAsync({
        address: escrowAddr, abi: ESCROW_ABI,
        functionName: "createEscrow",
        args: [p.recipient as `0x${string}`, amountRaw, deadlineSecs, arbiter, descHash],
      })
      setTxState({ status: "confirming", hash: createTx })
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createTx, confirmations: 1, pollingInterval: 2000, timeout: 60000,
      })

      // Extract escrow ID from EscrowCreated event (topic[1])
      const escrowId = receipt.logs[0]?.topics[1]
        ? BigInt(receipt.logs[0].topics[1])
        : 0n

      setTxState({ status: "success", hash: createTx })
      return escrowId

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("user rejected")) { setTxState({ status: "idle" }); return null }
      setTxState({ status: "failed", error: parseError(err) })
      return null
    }
  }, [walletAddress, publicClient, writeContractAsync, escrowAddr])

  // â”€â”€ RELEASE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const release = useCallback(async (escrowId: bigint) => {
    if (!walletAddress || !publicClient || !guardContract()) return
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({ address: escrowAddr, abi: ESCROW_ABI, functionName: "release", args: [escrowId] })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: tx })
      await fetchUserEscrows()
    } catch (err: unknown) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, writeContractAsync, escrowAddr])

  // â”€â”€ REFUND â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const refund = useCallback(async (escrowId: bigint) => {
    if (!walletAddress || !publicClient || !guardContract()) return
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({ address: escrowAddr, abi: ESCROW_ABI, functionName: "refund", args: [escrowId] })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: tx })
      await fetchUserEscrows()
    } catch (err: unknown) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, writeContractAsync, escrowAddr])

  // â”€â”€ DISPUTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const raiseDispute = useCallback(async (escrowId: bigint, reason: string) => {
    if (!walletAddress || !publicClient || !guardContract()) return
    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({ address: escrowAddr, abi: ESCROW_ABI, functionName: "raiseDispute", args: [escrowId, reason] })
      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, pollingInterval: 2000 })
      setTxState({ status: "success", hash: tx })
    } catch (err: unknown) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, writeContractAsync, escrowAddr])

  // â”€â”€ FETCH USER ESCROWS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchUserEscrows = useCallback(async () => {
    if (!walletAddress || !publicClient || !escrowAddr) return
    setIsLoading(true)
    try {
      const ids = await publicClient.readContract({
        address: escrowAddr, abi: ESCROW_ABI,
        functionName: "getSenderEscrows", args: [walletAddress],
      }) as bigint[]

      const now = Math.floor(Date.now() / 1000)

      const details = await Promise.all(ids.map(async (id) => {
        const raw = await publicClient.readContract({
          address: escrowAddr, abi: ESCROW_ABI,
          functionName: "getEscrow", args: [id],
        }) as {
          sender: `0x${string}`; recipient: `0x${string}`; arbiter: `0x${string}`
          amount: bigint; createdAt: bigint; deadline: bigint
          status: number; descriptionHash: `0x${string}`; disputeLog: string
        }

        const deadline = Number(raw.deadline)
        const secsLeft = deadline - now
        const timeRemaining = secsLeft <= 0
          ? "Expired"
          : secsLeft < 3600   ? `${Math.floor(secsLeft / 60)}m left`
          : secsLeft < 86400  ? `${Math.floor(secsLeft / 3600)}h left`
          : `${Math.floor(secsLeft / 86400)}d left`

        return {
          id,
          sender:          raw.sender,
          recipient:       raw.recipient,
          arbiter:         raw.arbiter,
          amount:          raw.amount,
          amountDisplay:   formatUSDC(raw.amount, { decimals: 2 }),
          createdAt:       Number(raw.createdAt),
          deadline,
          deadlineDisplay: new Date(deadline * 1000).toLocaleDateString("en-IN"),
          status:          STATUS_LABELS[raw.status] ?? "Active",
          statusIndex:     raw.status,
          descriptionHash: raw.descriptionHash,
          disputeLog:      raw.disputeLog,
          isExpired:       secsLeft <= 0,
          timeRemaining,
        } satisfies EscrowData
      }))

      setEscrows(details.reverse()) // newest first
    } catch (err) {
      console.error("fetchUserEscrows error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress, publicClient, escrowAddr])

  return {
    createEscrow,
    release,
    refund,
    raiseDispute,
    fetchUserEscrows,
    escrows,
    isLoading,
    txState,
    reset,
    isContractDeployed: !!escrowAddr,
  }
}
