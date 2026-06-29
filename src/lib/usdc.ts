/**
 * ARCOIN â€” usdc.ts
 * SINGLE SOURCE OF TRUTH for all USDC math.
 *
 * RULE: Nothing in this codebase does amount math directly.
 *       Every parse/format goes through this file.
 *
 * Arc decimal trap:
 *   Native gas layer = 18 decimals (internal EVM)
 *   ERC-20 interface = 6 decimals  â† we ALWAYS use this
 */

import { formatUnits, parseUnits } from "viem"

export const USDC_DECIMALS = 6 as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PARSE â€” User input string â†’ BigInt for contract calls
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function parseUSDC(amount: string | number): bigint {
  try {
    const str = String(amount).trim()
    if (!str || isNaN(Number(str)) || Number(str) < 0) return 0n
    // Clamp to 6 decimal places to avoid viem precision errors
    const clamped = Number(str).toFixed(USDC_DECIMALS)
    return parseUnits(clamped, USDC_DECIMALS)
  } catch {
    return 0n
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FORMAT â€” BigInt from contract â†’ Human-readable string
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function formatUSDC(
  raw: bigint,
  options: {
    decimals?: number    // display decimal places (default 2)
    showSymbol?: boolean // append " USDC" (default true)
    compact?: boolean    // 1,240 â†’ "1.24K" (default false)
  } = {}
): string {
  const { decimals = 2, showSymbol = true, compact = false } = options

  const num = parseFloat(formatUnits(raw, USDC_DECIMALS))

  let display: string
  if (compact && num >= 1_000_000) {
    display = (num / 1_000_000).toFixed(2) + "M"
  } else if (compact && num >= 1_000) {
    display = (num / 1_000).toFixed(2) + "K"
  } else {
    display = num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  return showSymbol ? `${display} USDC` : display
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SLIPPAGE â€” Apply basis-point slippage to an amount
// bps: 50 = 0.5%, 100 = 1%, 200 = 2%
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function applySlippage(amount: bigint, bps: number): bigint {
  if (bps < 0 || bps > 10000) throw new Error("Invalid slippage bps")
  return (amount * BigInt(10000 - bps)) / 10000n
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VALIDATE â€” Check if a string is a valid USDC amount
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function isValidUSDCAmount(amount: string): boolean {
  const num = Number(amount)
  if (isNaN(num) || num <= 0) return false
  // Minimum 0.01 USDC
  if (num < 0.01) return false
  // Maximum single tx: 1,000,000 USDC (configurable)
  if (num > 1_000_000) return false
  // Max 6 decimal places
  const parts = amount.split(".")
  if (parts[1] && parts[1].length > USDC_DECIMALS) return false
  return true
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STREAM RATE â€” Calculate per-second rate for streaming
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function calculateStreamRate(
  totalAmount: string,
  durationDays: number
): { perSecond: bigint; perSecondDisplay: string } {
  const totalBigInt = parseUSDC(totalAmount)
  const durationSeconds = BigInt(Math.floor(durationDays * 86400))
  if (durationSeconds === 0n) return { perSecond: 0n, perSecondDisplay: "0" }
  const perSecond = totalBigInt / durationSeconds
  return {
    perSecond,
    perSecondDisplay: formatUSDC(perSecond, { decimals: 6, showSymbol: false }),
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STREAM PROGRESS â€” Calculate % streamed given start/end time
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function calculateStreamProgress(
  startTime: number,  // unix seconds
  endTime: number,    // unix seconds
  nowTime?: number    // defaults to Date.now() / 1000
): number {
  const now = nowTime ?? Math.floor(Date.now() / 1000)
  if (now <= startTime) return 0
  if (now >= endTime) return 100
  return Math.floor(((now - startTime) / (endTime - startTime)) * 100)
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ARCOIN PROOF â€” Format amount for receipt/audit documents
// Returns the full 6-decimal representation for legal accuracy
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function formatUSDCProof(raw: bigint): string {
  return formatUnits(raw, USDC_DECIMALS)  // full precision, no rounding
}
