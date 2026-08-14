/**
 * ARCOIN — errors.ts
 * Converts raw blockchain/wallet errors → plain language ArcoinErrors.
 * All UI error messages come from here. Never show raw revert strings.
 */

import type { ArcoinError, ArcoinErrorCode } from "@/types"
import { EXPLORER } from "./constants"

// ─────────────────────────────────────────────────────────────
// ERROR MESSAGE MAP
// Plain language, active voice, actionable
// ─────────────────────────────────────────────────────────────
const ERROR_MESSAGES: Record<ArcoinErrorCode, string> = {
  insufficient_balance:
    "Balance कम है। ट्रांजैक्शन राशि और गैस फीस के लिए पर्याप्त USDC नहीं है।",
  invalid_address:
    "यह address valid नहीं है। दोबारा check करें।",
  amount_too_small:
    "Minimum amount 0.01 USDC है।",
  amount_too_large:
    "Single transaction limit 1,000,000 USDC है।",
  rpc_timeout:
    "Arc Network से connection slow है। 30 seconds बाद retry करें।",
  transaction_reverted:
    "Transaction reject हुई। Details Blockscout पर देखें।",
  user_rejected:
    "Transaction cancel की गई।",
  privy_session_expired:
    "Session expire हो गई। दोबारा sign in करें।",
  quote_expired:
    "Swap quote expire हो गई। नई quote ले रही है...",
  slippage_exceeded:
    "Price में बहुत ज़्यादा बदलाव आया। Slippage limit बढ़ाएं।",
  ofac_blocked:
    "यह address प्रतिबंधित है। Transaction नहीं हो सकती।",
  network_mismatch:
    "Arc Testnet पर switch करें और दोबारा try करें।",
  contract_not_deployed:
    "Contract अभी deploy नहीं हुआ। Team को report करें।",
  stream_already_cancelled:
    "यह stream पहले से cancel हो चुकी है।",
  unknown:
    "कुछ गलत हुआ। Page refresh करें और दोबारा try करें।",
}

// ─────────────────────────────────────────────────────────────
// PARSE RAW ERROR — from wagmi/viem/Privy into ArcoinError
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// VALIDATE SEND — Run before any payment transaction
// Returns null if valid, ArcoinError if not
// ─────────────────────────────────────────────────────────────
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
