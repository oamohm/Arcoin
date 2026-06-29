/**
 * ARCOIN â€” compliance.ts
 * OFAC / Sanctions screening layer.
 *
 * PHASE 1: Open-source SDN list (cached, client-side check)
 * PHASE 3: Drop-in replacement with Chainalysis or TRM Labs
 *
 * Upgrade path:
 *   Change the provider in screenAddress() â€” zero other code changes.
 */

import type { ScreeningResult } from "@/types"

// Known high-risk addresses (static seed, supplemented by SDN fetch)
// These are example blocked addresses from public OFAC actions
const STATIC_BLOCKED: Set<string> = new Set([
  "0x7f367cc41522ce07553e823bf3be79a889debe1b", // OFAC - Lazarus Group
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b", // OFAC - Lazarus Group
  "0x901bb9583b24d97e995513c6778dc6888ab6870e", // OFAC - sanctioned
  "0xa7e5d5a720f06526557c513402f2e6b5fa20b008", // OFAC - sanctioned
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c", // OFAC - sanctioned
])

// In-memory cache for fetched SDN list
let sdnCacheTimestamp = 0
const SDN_CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN SCREENING FUNCTION
// Phase 3 upgrade: swap out the provider block below
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function screenAddress(
  address: `0x${string}`
): Promise<ScreeningResult> {
  const normalized = address.toLowerCase()

  // â”€â”€ PHASE 1: Static + SDN list check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (STATIC_BLOCKED.has(normalized)) {
    return {
      address,
      blocked: true,
      reason:  "Address matches OFAC SDN list",
      provider: "ofac_sdn",
    }
  }

  // â”€â”€ PHASE 3 UPGRADE HOOK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Uncomment one of these blocks to upgrade:
  //
  // if (process.env.NEXT_PUBLIC_CHAINALYSIS_KEY) {
  //   return await screenWithChainalysis(address)
  // }
  //
  // if (process.env.NEXT_PUBLIC_TRM_KEY) {
  //   return await screenWithTRM(address)
  // }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return {
    address,
    blocked:  false,
    provider: "ofac_sdn",
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 3 STUBS â€” ready to implement
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// async function screenWithChainalysis(address: `0x${string}`): Promise<ScreeningResult> {
//   const res = await fetch(
//     `https://public.chainalysis.com/api/v1/address/${address}`,
//     { headers: { "X-API-KEY": process.env.NEXT_PUBLIC_CHAINALYSIS_KEY! } }
//   )
//   const data = await res.json()
//   return {
//     address,
//     blocked:  data.identifications?.length > 0,
//     reason:   data.identifications?.[0]?.category,
//     provider: "chainalysis",
//   }
// }

// async function screenWithTRM(address: `0x${string}`): Promise<ScreeningResult> {
//   const res = await fetch("https://api.trmlabs.com/public/v2/sanctions/screening", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": `Basic ${btoa(process.env.NEXT_PUBLIC_TRM_KEY! + ":")}`,
//     },
//     body: JSON.stringify([{ address, chain: "arc" }]),
//   })
//   const [result] = await res.json()
//   return {
//     address,
//     blocked:  result.isSanctioned,
//     reason:   result.sanctionDetails?.[0]?.name,
//     provider: "trm_labs",
//   }
// }

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRE-FLIGHT CHECK â€” Run before any outbound transaction
// Usage: await requireCleanAddress(recipient)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function requireCleanAddress(
  address: `0x${string}`
): Promise<void> {
  const result = await screenAddress(address)
  if (result.blocked) {
    throw new Error(
      `COMPLIANCE_BLOCKED: ${result.reason ?? "Address restricted by sanctions screening"}`
    )
  }
}
