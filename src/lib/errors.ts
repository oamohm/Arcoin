/**
 * ARCOIN â€” errors.ts
 * Converts raw blockchain/wallet errors â†’ plain language ArcoinErrors.
 * All UI error messages come from here. Never show raw revert strings.
 */

import type { ArcoinError, ArcoinErrorCode } from "@/types"
import { EXPLORER } from "./constants"

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ERROR MESSAGE MAP
// Plain language, active voice, actionable
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ERROR_MESSAGES: Record<ArcoinErrorCode, string> = {
  insufficient_balance:
    "Balance à¤•à¤® à¤¹à¥ˆà¥¤ à¤Ÿà¥à¤°à¤¾à¤‚à¤œà¥ˆà¤•à¥à¤¶à¤¨ à¤°à¤¾à¤¶à¤¿ à¤”à¤° à¤—à¥ˆà¤¸ à¤«à¥€à¤¸ à¤•à¥‡ à¤²à¤¿à¤ à¤ªà¤°à¥à¤¯à¤¾à¤ªà¥à¤¤ USDC à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤",
  invalid_address:
    "à¤¯à¤¹ address valid à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ check à¤•à¤°à¥‡à¤‚à¥¤",
  amount_too_small:
    "Minimum amount 0.01 USDC à¤¹à¥ˆà¥¤",
  amount_too_large:
    "Single transaction limit 1,000,000 USDC à¤¹à¥ˆà¥¤",
  rpc_timeout:
    "Arc Network à¤¸à¥‡ connection slow à¤¹à¥ˆà¥¤ 30 seconds à¤¬à¤¾à¤¦ retry à¤•à¤°à¥‡à¤‚à¥¤",
  transaction_reverted:
    "Transaction reject à¤¹à¥à¤ˆà¥¤ Details Blockscout à¤ªà¤° à¤¦à¥‡à¤–à¥‡à¤‚à¥¤",
  user_rejected:
    "Transaction cancel à¤•à¥€ à¤—à¤ˆà¥¤",
  privy_session_expired:
    "Session expire à¤¹à¥‹ à¤—à¤ˆà¥¤ à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ sign in à¤•à¤°à¥‡à¤‚à¥¤",
  quote_expired:
    "Swap quote expire à¤¹à¥‹ à¤—à¤ˆà¥¤ à¤¨à¤ˆ quote à¤²à¥‡ à¤°à¤¹à¥€ à¤¹à¥ˆ...",
  slippage_exceeded:
    "Price à¤®à¥‡à¤‚ à¤¬à¤¹à¥à¤¤ à¤œà¤¼à¥à¤¯à¤¾à¤¦à¤¾ à¤¬à¤¦à¤²à¤¾à¤µ à¤†à¤¯à¤¾à¥¤ Slippage limit à¤¬à¤¢à¤¼à¤¾à¤à¤‚à¥¤",
  ofac_blocked:
    "à¤¯à¤¹ address à¤ªà¥à¤°à¤¤à¤¿à¤¬à¤‚à¤§à¤¿à¤¤ à¤¹à¥ˆà¥¤ Transaction à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¤à¥€à¥¤",
  network_mismatch:
    "Arc Testnet à¤ªà¤° switch à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ try à¤•à¤°à¥‡à¤‚à¥¤",
  contract_not_deployed:
    "Contract à¤…à¤­à¥€ deploy à¤¨à¤¹à¥€à¤‚ à¤¹à¥à¤†à¥¤ Team à¤•à¥‹ report à¤•à¤°à¥‡à¤‚à¥¤",
  stream_already_cancelled:
    "à¤¯à¤¹ stream à¤ªà¤¹à¤²à¥‡ à¤¸à¥‡ cancel à¤¹à¥‹ à¤šà¥à¤•à¥€ à¤¹à¥ˆà¥¤",
  unknown:
    "à¤•à¥à¤› à¤—à¤²à¤¤ à¤¹à¥à¤†à¥¤ Page refresh à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ try à¤•à¤°à¥‡à¤‚à¥¤",
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PARSE RAW ERROR â€” from wagmi/viem/Privy into ArcoinError
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function parseError(
  raw: unknown,
  txHash?: `0x${string}`
): ArcoinError {
  const message = raw instanceof Error ? raw.message : String(raw)
  const lower = message.toLowerCase()

  let code: ArcoinErrorCode = "unknown"

  if (lower.includes("user rejected") || lower.includes("user denied")) {
    code = "user_rejected"
  } else if (lower.includes("insufficient") || lower.includes("exceeds balance")) {
    code = "insufficient_balance"
  } else if (lower.includes("timeout") || lower.includes("network error") || lower.includes("fetch")) {
    code = "rpc_timeout"
  } else if (lower.includes("reverted") || lower.includes("execution reverted")) {
    code = "transaction_reverted"
  } else if (lower.includes("slippage") || lower.includes("k invariant")) {
    code = "slippage_exceeded"
  } else if (lower.includes("expired") || lower.includes("deadline")) {
    code = "quote_expired"
  } else if (lower.includes("compliance_blocked") || lower.includes("ofac")) {
    code = "ofac_blocked"
  } else if (lower.includes("chain") && lower.includes("mismatch")) {
    code = "network_mismatch"
  } else if (lower.includes("session")) {
    code = "privy_session_expired"
  }

  return {
    code,
    message:    ERROR_MESSAGES[code],
    technical:  message,
    explorerUrl: txHash ? EXPLORER.txUrl(txHash) : undefined,
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VALIDATE SEND â€” Run before any payment transaction
// Returns null if valid, ArcoinError if not
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function validateSend(
  amount: string,
  recipientAddress: string,
  userBalanceRaw: bigint,
): ArcoinError | null {
  const num = Number(amount)

  if (isNaN(num) || num < 0.01) {
    return { code: "amount_too_small", message: ERROR_MESSAGES.amount_too_small }
  }
  if (num > 1_000_000) {
    return { code: "amount_too_large", message: ERROR_MESSAGES.amount_too_large }
  }
  if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
    return { code: "invalid_address", message: ERROR_MESSAGES.invalid_address }
  }

  // Import parseUSDC here to avoid circular dependency
  const { parseUSDC } = require("./usdc")
  const amountRaw = parseUSDC(amount)
  if (amountRaw > userBalanceRaw) {
    return { code: "insufficient_balance", message: ERROR_MESSAGES.insufficient_balance }
  }

  return null
}
