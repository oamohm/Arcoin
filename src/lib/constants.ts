/**
 * ARCOIN â€” constants.ts
 * ALL ADDRESSES VERIFIED FROM OFFICIAL SOURCES
 * Sources:
 *   Arc Official Docs:  https://docs.arc.io/arc/references/contract-addresses
 *   APEXISWAP Docs:     https://www.apexiswap.com/docs (Network & Contracts)
 * Last verified: June 2026
 *
 * DECIMAL RULE (DO NOT CHANGE):
 *   Native USDC gas = 18 decimals (internal EVM layer â€” NEVER use in app)
 *   USDC ERC-20 interface = 6 decimals (ALWAYS use this in all operations)
 */

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CHAIN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ARC_CHAIN_ID = 5042002 as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CORE TOKENS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TOKENS = {
  USDC: {
    address:  "0x3600000000000000000000000000000000000000" as `0x${string}`,
    decimals: 6,        // ERC-20 interface â€” NEVER use 18
    symbol:   "USDC",
    name:     "USD Coin",
    logoUrl:  "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
  },
  EURC: {
    address:  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as `0x${string}`,
    decimals: 6,
    symbol:   "EURC",
    name:     "Euro Coin",
    logoUrl:  "https://cryptologos.cc/logos/euro-coin-eurc-logo.svg",
  },
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DEX: APEXISWAP â€” PRIMARY SWAP ENGINE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const APEXISWAP = {
  // Primary (no protocol fee on Arcoin swaps via direct Router)
  Router:       "0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F" as `0x${string}`,
  Factory:      "0x2B865487A1008D2694C1D367c761f00a564aCECb" as `0x${string}`,
  WUSDC:        "0x911b4000D3422F482F4062a913885f7b035382Df" as `0x${string}`,
  // External DEX 2 (0.0013 USDC protocol fee)
  DEX2_Router:  "0x4AA8c7Ac458479d9A4FA5c1481e03061ac76824A" as `0x${string}`,
  DEX2_Factory: "0xd67F63A4F26a497b364d1C82e6747Aec8B5743a5" as `0x${string}`,
  // External DEX 3 (Standard Uniswap V2 style)
  DEX3_Router:  "0xB92428D440c335546b69138F7fAF689F5ba8D436" as `0x${string}`,
  DEX3_Factory: "0x7cC023C7184810B84657D55c1943eBfF8603B72B" as `0x${string}`,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CIRCLE CROSSCHAIN â€” CCTP BRIDGE
// Domain 26 = Arc Testnet
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CCTP = {
  TokenMessengerV2:     "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as `0x${string}`,
  MessageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as `0x${string}`,
  TokenMinterV2:        "0xb43db544E2c27092c107639Ad201b3dEfAbcF192" as `0x${string}`,
  ARC_DOMAIN:           26,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CIRCLE GATEWAY â€” Chain-abstracted USDC
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const GATEWAY = {
  GatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as `0x${string}`,
  GatewayMinter: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as `0x${string}`,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STABLEFX â€” USDC â†” EURC (Circle official FX engine)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const STABLEFX = {
  FxEscrow: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8" as `0x${string}`,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ETHEREUM STANDARD UTILS â€” deployed on Arc
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const UTILS = {
  Permit2:         "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
  Multicall3:      "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
  Multicall3From:  "0x522fAf9A91c41c443c66765030741e4AaCe147D0" as `0x${string}`,
  Memo:            "0x5294E9927c3306DcBaDb03fe70b92e01cCede505" as `0x${string}`,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ARCOIN CUSTOM CONTRACTS (to be deployed â€” Phase 1)
// These are placeholders until deployment
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ARCOIN_CONTRACTS = {
  PaymentRouter:    "" as `0x${string}`,  // ArcoinPaymentRouter.sol
  Registry:         "" as `0x${string}`,  // ArcID registry
  Treasury:         "" as `0x${string}`,  // ArcoinTreasury.sol
  Escrow:           "" as `0x${string}`,  // Phase 3
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXPLORER URLs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const EXPLORER = {
  primary:      "https://atlas.blockscout.com",
  secondary:    "https://testnet.arcscan.app",
  txUrl:        (hash: string) => `https://atlas.blockscout.com/tx/${hash}`,
  addressUrl:   (addr: string) => `https://atlas.blockscout.com/address/${addr}`,
  tokenUrl:     (addr: string) => `https://atlas.blockscout.com/token/${addr}`,
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RPC ENDPOINTS (ordered by priority)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const RPC = {
  primary:   "https://rpc.testnet.arc.network",
  alchemy:   "https://arc-testnet.g.alchemy.com/v2",   // append API key
  thirdweb:  "https://5042002.rpc.thirdweb.com",
  quicknode: "",  // fill from QuickNode dashboard
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APP CONFIG
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const APP = {
  name:         "Arcoin",
  tagline:      "Arc Network's DeFi Operating System",
  url:          "https://arcoin.xyz",
  faucet:       "https://faucet.circle.com",
  arcDocs:      "https://docs.arc.io",
  arcNetwork:   "https://arc.network",
  apexiswap:    "https://www.apexiswap.com",
  circleDev:    "https://developers.circle.com",
  protocol_fee_bps: 10,  // 0.1% = 10 basis points
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPLIANCE â€” OFAC SCREENING
// Phase 1: Open-source sanctions list (SDN)
// Phase 3: Replace with Chainalysis/TRM Labs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const COMPLIANCE = {
  sdnListUrl: "https://www.treasury.gov/ofac/downloads/sdn.csv",
  // Plug-in point for Phase 3 upgrade:
  // chainalysisApiUrl: "https://public.chainalysis.com/api/v1/address",
  // trmLabsApiUrl: "https://api.trmlabs.com/public/v2/sanctions/screening",
} as const

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STREAMING â€” SABLIER (Phase 2)
// Addresses pending deployment on Arc
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const SABLIER = {
  LockupLinear:   "" as `0x${string}`,  // to be deployed
  LockupDynamic:  "" as `0x${string}`,  // to be deployed
} as const
