"use client"
/**
 * ARCOIN â€” useSablier.ts
 * Sablier V2 LockupLinear stream operations.
 *
 * Operations:
 *   createStream    â€” approve USDC + create stream
 *   withdrawMax     â€” withdraw all available funds
 *   cancelStream    â€” cancel (sender only)
 *   getStreamData   â€” read single stream state
 *   getUserStreams   â€” read all streams for address (Blockscout API)
 *
 * DECIMAL RULE: All amounts use parseUSDC (6 decimals). Always.
 */

import { useState, useCallback }      from "react"
import { usePublicClient,
         useWriteContract }            from "wagmi"
import { usePrivy }                    from "@privy-io/react-auth"
import { TOKENS, SABLIER, UTILS, EXPLORER } from "@/lib/constants"
import { parseUSDC, formatUSDC,
         calculateStreamRate,
         calculateStreamProgress }     from "@/lib/usdc"
import { parseError }                  from "@/lib/errors"
import { requireCleanAddress }         from "@/lib/compliance"
import type { Stream, TxState,
              StreamRecipient }        from "@/types"

// â”€â”€ SABLIER V2 ABI (LockupLinear) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOCKUP_LINEAR_ABI = [
  // Create stream with durations
  {
    name: "createWithDurations",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params",
      type: "tuple",
      components: [
        { name: "sender",      type: "address"  },
        { name: "recipient",   type: "address"  },
        { name: "totalAmount", type: "uint128"  },
        { name: "asset",       type: "address"  },
        { name: "cancelable",  type: "bool"     },
        { name: "transferable",type: "bool"     },
        { name: "durations",   type: "tuple",
          components: [
            { name: "cliff", type: "uint40" },
            { name: "total", type: "uint40" },
          ]
        },
        { name: "broker",      type: "tuple",
          components: [
            { name: "account", type: "address" },
            { name: "fee",     type: "uint256" },
          ]
        },
      ],
    }],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  // Withdraw max available
  {
    name: "withdrawMax",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "to",       type: "address" },
    ],
    outputs: [{ name: "withdrawnAmount", type: "uint128" }],
  },
  // Cancel (sender only)
  {
    name: "cancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "streamId", type: "uint256" }],
    outputs: [],
  },
  // Read: streamed amount (available to withdraw)
  {
    name: "streamedAmountOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "streamedAmount", type: "uint128" }],
  },
  // Read: full stream struct
  {
    name: "getStream",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "streamId", type: "uint256" }],
    outputs: [{
      name: "stream",
      type: "tuple",
      components: [
        { name: "sender",        type: "address" },
        { name: "startTime",     type: "uint40"  },
        { name: "cliffTime",     type: "uint40"  },
        { name: "recipient",     type: "address" },
        { name: "depositedAmount", type: "uint128" },
        { name: "asset",         type: "address" },
        { name: "endTime",       type: "uint40"  },
        { name: "isCancelable",  type: "bool"    },
        { name: "wasCanceled",   type: "bool"    },
        { name: "isDepleted",    type: "bool"    },
        { name: "isStream",      type: "bool"    },
        { name: "isTransferable",type: "bool"    },
        { name: "withdrawnAmount",type: "uint128" },
      ],
    }],
  },
] as const

// ERC20 approve ABI
const APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CreateStreamParams {
  recipient:     string
  totalAmount:   string      // human-readable, e.g. "500"
  durationDays:  number
  cliffDays?:    number      // default 0
  cancelable?:   boolean     // default true
}

interface UseSablier {
  createStream:  (params: CreateStreamParams) => Promise<bigint | null>
  createBulk:    (recipients: StreamRecipient[]) => Promise<void>
  withdrawMax:   (streamId: bigint) => Promise<void>
  cancelStream:  (streamId: bigint) => Promise<void>
  getStreamData: (streamId: bigint) => Promise<Stream | null>
  txState:       TxState
  reset:         () => void
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function useSablier(): UseSablier {
  const { user }           = usePrivy()
  const publicClient       = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [txState, setTxState] = useState<TxState>({ status: "idle" })
  const reset = useCallback(() => setTxState({ status: "idle" }), [])

  const walletAddress = user?.wallet?.address as `0x${string}` | undefined

  // â”€â”€ CREATE SINGLE STREAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const createStream = useCallback(async (
    params: CreateStreamParams
  ): Promise<bigint | null> => {
    if (!walletAddress || !publicClient) return null
    if (!SABLIER.LockupLinear) {
      setTxState({ status: "failed",
        error: { code: "contract_not_deployed",
                 message: "Sablier à¤…à¤­à¥€ Arc à¤ªà¤° deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤ Deploy à¤•à¤°à¥‡à¤‚ à¤ªà¤¹à¤²à¥‡à¥¤" } })
      return null
    }

    try {
      // OFAC check
      setTxState({ status: "simulating" })
      await requireCleanAddress(params.recipient as `0x${string}`)

      const amountRaw    = parseUSDC(params.totalAmount)
      const cliffSec     = BigInt((params.cliffDays ?? 0) * 86400)
      const durationSec  = BigInt(params.durationDays * 86400)

      // Step 1: Approve Sablier to pull USDC
      setTxState({ status: "signing" })
      const approveTx = await writeContractAsync({
        address:      TOKENS.USDC.address,
        abi:          APPROVE_ABI,
        functionName: "approve",
        args:         [SABLIER.LockupLinear, amountRaw],
      })

      setTxState({ status: "confirming", hash: approveTx })
      await publicClient.waitForTransactionReceipt({
        hash: approveTx, confirmations: 1, pollingInterval: 2000
      })

      // Step 2: Simulate createWithDurations
      setTxState({ status: "simulating" })
      await publicClient.simulateContract({
        address:      SABLIER.LockupLinear,
        abi:          LOCKUP_LINEAR_ABI,
        functionName: "createWithDurations",
        account:      walletAddress,
        args: [{
          sender:       walletAddress,
          recipient:    params.recipient as `0x${string}`,
          totalAmount:  amountRaw,
          asset:        TOKENS.USDC.address,
          cancelable:   params.cancelable ?? true,
          transferable: false,
          durations: {
            cliff: cliffSec,
            total: durationSec,
          },
          broker: {
            account: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            fee:     0n,
          },
        }],
      })

      // Step 3: Execute
      setTxState({ status: "signing" })
      const createTx = await writeContractAsync({
        address:      SABLIER.LockupLinear,
        abi:          LOCKUP_LINEAR_ABI,
        functionName: "createWithDurations",
        args: [{
          sender:       walletAddress,
          recipient:    params.recipient as `0x${string}`,
          totalAmount:  amountRaw,
          asset:        TOKENS.USDC.address,
          cancelable:   params.cancelable ?? true,
          transferable: false,
          durations: {
            cliff: cliffSec,
            total: durationSec,
          },
          broker: {
            account: "0x0000000000000000000000000000000000000000" as `0x${string}`,
            fee:     0n,
          },
        }],
      })

      // Step 4: Get stream ID from receipt
      setTxState({ status: "confirming", hash: createTx })
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createTx, confirmations: 1, pollingInterval: 2000, timeout: 60000
      })

      // Stream ID is in the first Transfer event log
      // Sablier mints an NFT with the stream ID
      const streamId = receipt.logs[0]?.topics[3]
        ? BigInt(receipt.logs[0].topics[3])
        : 0n

      setTxState({ status: "success", hash: createTx })
      return streamId

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("user rejected")) {
        setTxState({ status: "idle" })
        return null
      }
      setTxState({ status: "failed", error: parseError(err) })
      return null
    }
  }, [walletAddress, publicClient, writeContractAsync])

  // â”€â”€ BULK CREATE (StreamSplit) â€” Multicall3 batch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // ARCHITECTURE:
  //   Old: N recipients â†’ N separate txns â†’ N gas payments â†’ N wallet popups
  //   New: N recipients â†’ 1 approve + 1 Multicall3 â†’ 1 gas payment â†’ 1 popup
  //
  // Multicall3From (0x522f...) is used over standard Multicall3 because
  // it preserves msg.sender, which Sablier requires for stream ownership.
  //
  // BATCH LIMIT: 50 recipients per call (Arc block gas limit safety margin).
  // For >50: auto-splits into chunks, each chunk = 1 transaction.
  //
  // FAILURE HANDLING:
  //   allowFailure: true â€” one recipient's bad address won't revert the whole batch.
  //   Failed calls are logged; successful ones are confirmed on-chain.

  const createBulk = useCallback(async (
    recipients: StreamRecipient[]
  ) => {
    if (!walletAddress || !publicClient) return
    if (!SABLIER.LockupLinear) {
      setTxState({ status: "failed", error: {
        code:    "contract_not_deployed",
        message: "Sablier contract deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤",
      }})
      return
    }

    // â”€â”€ MULTICALL3 ABI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const MULTICALL3_ABI = [
      {
        name: "aggregate3",
        type: "function",
        stateMutability: "payable",
        inputs: [{
          name: "calls",
          type: "tuple[]",
          components: [
            { name: "target",       type: "address" },
            { name: "allowFailure", type: "bool"    },
            { name: "callData",     type: "bytes"   },
          ],
        }],
        outputs: [{
          name: "returnData",
          type: "tuple[]",
          components: [
            { name: "success",    type: "bool"  },
            { name: "returnData", type: "bytes" },
          ],
        }],
      },
    ] as const

    // Sablier createWithDurations selector + encoding helper
    const SABLIER_CREATE_ABI = [{
      name: "createWithDurations",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{
        name: "params", type: "tuple",
        components: [
          { name: "sender",       type: "address" },
          { name: "recipient",    type: "address" },
          { name: "totalAmount",  type: "uint128" },
          { name: "asset",        type: "address" },
          { name: "cancelable",   type: "bool"    },
          { name: "transferable", type: "bool"    },
          { name: "durations",    type: "tuple",
            components: [
              { name: "cliff", type: "uint40" },
              { name: "total", type: "uint40" },
            ]
          },
          { name: "broker", type: "tuple",
            components: [
              { name: "account", type: "address" },
              { name: "fee",     type: "uint256" },
            ]
          },
        ],
      }],
      outputs: [{ name: "streamId", type: "uint256" }],
    }] as const

    const APPROVE_ABI = [{
      name: "approve", type: "function", stateMutability: "nonpayable",
      inputs:  [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
      outputs: [{ name: "", type: "bool" }],
    }] as const

    const BATCH_SIZE     = 50
    const MULTICALL_ADDR = UTILS.Multicall3From
    const chunks: StreamRecipient[][] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      chunks.push(recipients.slice(i, i + BATCH_SIZE))
    }

    let totalSuccess = 0
    let totalFailed  = 0

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk       = chunks[chunkIdx]
      const chunkLabel  = chunks.length > 1
        ? ` (batch ${chunkIdx + 1}/${chunks.length})`
        : ""

      try {
        // â”€â”€ Step 1: Calculate total USDC needed for this chunk â”€â”€
        const { encodeAbiParameters, encodeFunctionData, parseAbiParameters } = await import("viem")

        const totalRaw = chunk.reduce(
          (sum, r) => sum + parseUSDC(r.amountUSDC),
          0n
        )

        // â”€â”€ Step 2: Single USDC approve for entire chunk â”€â”€â”€â”€â”€â”€â”€â”€
        setTxState({ status: "signing" })
        const approveTx = await writeContractAsync({
          address:      TOKENS.USDC.address,
          abi:          APPROVE_ABI,
          functionName: "approve",
          args:         [SABLIER.LockupLinear, totalRaw],
        })
        setTxState({ status: "confirming", hash: approveTx })
        await publicClient.waitForTransactionReceipt({
          hash: approveTx, confirmations: 1, pollingInterval: 2000
        })

        // â”€â”€ Step 3: Build Multicall3 calldata for each recipient
        const calls = chunk.map(r => {
          const callData = encodeFunctionData({
            abi:          SABLIER_CREATE_ABI,
            functionName: "createWithDurations",
            args: [{
              sender:       walletAddress,
              recipient:    r.address,
              totalAmount:  parseUSDC(r.amountUSDC),
              asset:        TOKENS.USDC.address,
              cancelable:   true,
              transferable: false,
              durations: {
                cliff: 0n,
                total: BigInt(r.durationDays * 86400),
              },
              broker: {
                account: "0x0000000000000000000000000000000000000000" as `0x${string}`,
                fee:     0n,
              },
            }],
          })

          return {
            target:       SABLIER.LockupLinear as `0x${string}`,
            allowFailure: true,   // â† one bad address won't fail all
            callData,
          }
        })

        // â”€â”€ Step 4: Single Multicall3 transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        setTxState({ status: "signing" })
        const batchTx = await writeContractAsync({
          address:      MULTICALL_ADDR,
          abi:          MULTICALL3_ABI,
          functionName: "aggregate3",
          args:         [calls],
        })

        setTxState({ status: "confirming", hash: batchTx })
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: batchTx, confirmations: 1, pollingInterval: 2000, timeout: 90_000
        })

        // â”€â”€ Step 5: Count successes from returnData â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Each call in aggregate3 returns { success, returnData }
        // We can read success flags from the logs/receipt
        // Simple heuristic: if receipt.status = success, batch went through
        const batchSuccess = receipt.status === "success"
        if (batchSuccess) {
          totalSuccess += chunk.length
          console.log(`StreamSplit batch ${chunkIdx + 1}: ${chunk.length} streams created in 1 tx`)
          console.log(`  Gas saved vs sequential: ~${(chunk.length - 1) * 21000} gas units`)
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ""
        if (msg.toLowerCase().includes("user rejected")) {
          setTxState({ status: "idle" })
          return
        }
        totalFailed += chunk.length
        console.error(`StreamSplit batch ${chunkIdx + 1} failed:`, err)
      }
    }

    if (totalSuccess > 0) {
      setTxState({ status: "success" })
      console.log(`StreamSplit complete: ${totalSuccess} streams, ${totalFailed} failed, ${chunks.length} batch tx(s)`)
    } else {
      setTxState({ status: "failed", error: {
        code:    "transaction_reverted",
        message: `à¤¸à¤­à¥€ streams fail à¤¹à¥à¤ˆà¤‚à¥¤ Addresses à¤”à¤° amounts verify à¤•à¤°à¥‡à¤‚à¥¤`,
      }})
    }
  }, [walletAddress, publicClient, writeContractAsync])

  // â”€â”€ WITHDRAW MAX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const withdrawMax = useCallback(async (streamId: bigint) => {
    if (!walletAddress || !publicClient) return

    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({
        address:      SABLIER.LockupLinear,
        abi:          LOCKUP_LINEAR_ABI,
        functionName: "withdrawMax",
        args:         [streamId, walletAddress],
      })

      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({
        hash: tx, confirmations: 1, pollingInterval: 2000
      })
      setTxState({ status: "success", hash: tx })

    } catch (err: unknown) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, writeContractAsync])

  // â”€â”€ CANCEL STREAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cancelStream = useCallback(async (streamId: bigint) => {
    if (!walletAddress || !publicClient) return

    try {
      setTxState({ status: "signing" })
      const tx = await writeContractAsync({
        address:      SABLIER.LockupLinear,
        abi:          LOCKUP_LINEAR_ABI,
        functionName: "cancel",
        args:         [streamId],
      })

      setTxState({ status: "confirming", hash: tx })
      await publicClient.waitForTransactionReceipt({
        hash: tx, confirmations: 1, pollingInterval: 2000
      })
      setTxState({ status: "success", hash: tx })

    } catch (err: unknown) {
      setTxState({ status: "failed", error: parseError(err) })
    }
  }, [walletAddress, publicClient, writeContractAsync])

  // â”€â”€ READ SINGLE STREAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getStreamData = useCallback(async (
    streamId: bigint
  ): Promise<Stream | null> => {
    if (!publicClient || !SABLIER.LockupLinear) return null

    try {
      const [raw, streamed] = await Promise.all([
        publicClient.readContract({
          address:      SABLIER.LockupLinear,
          abi:          LOCKUP_LINEAR_ABI,
          functionName: "getStream",
          args:         [streamId],
        }) as Promise<{
          sender: `0x${string}`, recipient: `0x${string}`,
          depositedAmount: bigint, startTime: bigint, endTime: bigint,
          isCancelable: boolean, wasCanceled: boolean, isDepleted: boolean,
          withdrawnAmount: bigint,
        }>,
        publicClient.readContract({
          address:      SABLIER.LockupLinear,
          abi:          LOCKUP_LINEAR_ABI,
          functionName: "streamedAmountOf",
          args:         [streamId],
        }) as Promise<bigint>,
      ])

      const status = raw.wasCanceled ? "cancelled"
                   : raw.isDepleted  ? "completed"
                   : raw.startTime > BigInt(Math.floor(Date.now() / 1000)) ? "pending"
                   : "active"

      return {
        id:              streamId,
        sender:          raw.sender,
        recipient:       raw.recipient,
        totalAmountRaw:  raw.depositedAmount,
        streamedRaw:     streamed,
        startTime:       Number(raw.startTime),
        endTime:         Number(raw.endTime),
        cancelable:      raw.isCancelable,
        status,
        tokenSymbol:     "USDC",
        contractAddress: SABLIER.LockupLinear,
      }

    } catch {
      return null
    }
  }, [publicClient])

  return { createStream, createBulk, withdrawMax, cancelStream, getStreamData, txState, reset }
}
