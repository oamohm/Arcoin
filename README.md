# Arcoin — Arc Network DeFi Operating System

> **Send · Stream · Swap** — USDC payments on Arc Testnet (Chain ID: 5042002)

![Phase](https://img.shields.io/badge/Phase-1%2B2%20Complete-brightgreen)
![Chain](https://img.shields.io/badge/Chain-Arc%20Testnet%205042002-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)

---

## What is Arcoin?

Arcoin is a **non-custodial DeFi payment operating system** built natively on the Arc Network. It enables users to:

- **Send** USDC instantly to any address or human-readable ArcID (e.g. `alice.arc`)
- **Stream** USDC over time using Sablier V2 token streaming
- **Swap** tokens via ApexiSwap on Arc Testnet
- **Escrow** funds with on-chain dispute resolution
- **Register** a human-readable ArcID (ENS-style identity for Arc)

All payments route through auditable smart contracts. No custodian. No intermediary. Your keys, your funds.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ARCOIN FRONTEND                       │
│         Next.js 14 · Privy Auth · wagmi · viem          │
│                                                          │
│  ConnectScreen → Dashboard → Send / Stream / Swap /      │
│                              Escrow / Resources          │
└────────────────────────┬────────────────────────────────┘
                         │ USDC transactions
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  ARC TESTNET (Chain 5042002)              │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │ ArcoinRegistry  │    │   ArcoinPaymentRouter    │    │
│  │  (ArcID — ENS)  │    │  0.1% fee → Treasury     │    │
│  └─────────────────┘    └──────────────────────────┘    │
│                                      │                   │
│  ┌─────────────────┐    ┌────────────▼─────────────┐    │
│  │  ArcoinEscrow   │    │    ArcoinTreasury         │    │
│  │  P2P + Arbiter  │    │  72h timelock · 3-bucket  │    │
│  └─────────────────┘    └──────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Sablier V2 (streaming)              │    │
│  │         LockupLinear · LockupDynamic             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  USDC: 0x3600000000000000000000000000000000000000        │
└─────────────────────────────────────────────────────────┘
```

### Smart Contract Roles

| Contract | Role |
|---|---|
| `ArcoinRegistry` | ArcID human-readable names (`alice.arc`), 1 USDC/year, 48h fee timelock |
| `ArcoinTreasury` | Collects protocol fees, 72h distribution timelock, 60/25/15% allocation |
| `ArcoinPaymentRouter` | Single entry point for all USDC payments, 0.1% fee, OFAC blocklist |
| `ArcoinEscrow` | Non-custodial P2P escrow with arbiter + auto-refund after deadline |
| `Sablier V2` | Token streaming — LockupLinear + LockupDynamic |

---

## Prerequisites

```bash
node --version   # v18+
npm --version    # v9+
```

---

## Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/oamohm/arcoin.git
cd arcoin
npm install

# Install Hardhat (for contracts)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Privy — https://dashboard.privy.io → Your App → App ID
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxx

# WalletConnect — https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_ID=xxxxxxxxxxxxxxxxx

# Arc Testnet deployer wallet (TESTNET ONLY — never use mainnet key here)
DEPLOYER_PRIVATE_KEY=0xabc123...

# Treasury allocation addresses
TREASURY_MULTISIG=0xYourAddress
DEV_FUND=0xYourAddress
LIQUIDITY_RESERVE=0xYourAddress
COMMUNITY_MULTISIG=0xYourAddress

# Anthropic (AI Help feature)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
```

### 3. Get Testnet USDC

1. Go to [faucet.circle.com](https://faucet.circle.com)
2. Select **Arc Testnet**
3. Paste your deployer wallet address
4. Receive 10 USDC

### 4. Deploy Contracts

```bash
# Deploy all 5 contracts in one command
npx hardhat run contracts/scripts/deploy-all.ts --network arc-testnet

# Auto-patch constants.ts with deployed addresses
npx ts-node contracts/scripts/post-deploy-patch.ts
```

### 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Contract Addresses

### Arc Testnet (Chain ID: 5042002)

| Contract | Address |
|---|---|
| USDC | `0x3600000000000000000000000000000000000000` |
| ApexiSwap | `0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F` |
| ArcoinRegistry | *(deploy and fill)* |
| ArcoinTreasury | *(deploy and fill)* |
| ArcoinPaymentRouter | *(deploy and fill)* |
| ArcoinEscrow | *(Phase 3)* |
| Sablier LockupLinear | *(deploy and fill)* |
| Sablier LockupDynamic | *(deploy and fill)* |

> Run `contracts/scripts/post-deploy-patch.ts` to auto-fill these after deployment.

**Explorer:** [atlas.blockscout.com](https://atlas.blockscout.com)  
**Faucet:** [faucet.circle.com](https://faucet.circle.com)  
**RPC:** `https://rpc.testnet.arc.network`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | ✅ | Privy app ID for embedded wallet auth |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | ✅ | WalletConnect project ID |
| `NEXT_PUBLIC_ARC_CHAIN_ID` | ✅ | Arc chain ID (default: `5042002`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | App base URL |
| `ANTHROPIC_API_KEY` | Optional | Claude AI for AI Help feature (server-side only) |
| `NEXT_PUBLIC_ALCHEMY_KEY` | Optional | Backup RPC key |
| `DEPLOYER_PRIVATE_KEY` | Contracts only | Wallet key for Hardhat deployment |

---

## Deployment

### Vercel (Recommended)

**Option A — Dashboard:**
1. [vercel.com/new](https://vercel.com/new) → Import `oamohm/arcoin`
2. Add environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` → your Vercel URL
   - `NEXT_PUBLIC_APP_ENV` → `production`
3. Deploy

**Option B — CLI:**
```bash
npm install -g vercel
vercel --prod
```

### Contract Verification (Blockscout)

```bash
# ArcoinRegistry
npx hardhat verify --network arc-testnet <REGISTRY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<TREASURY_ADDR>" "<DEPLOYER_ADDR>"

# ArcoinTreasury
npx hardhat verify --network arc-testnet <TREASURY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>"

# ArcoinPaymentRouter
npx hardhat verify --network arc-testnet <ROUTER_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<TREASURY_ADDR>" "<DEPLOYER_ADDR>"
```

---

## Project Structure

```
arcoin/
├── contracts/
│   ├── core/
│   │   ├── ArcoinEscrow.sol
│   │   ├── ArcoinPaymentRouter.sol
│   │   ├── ArcoinRegistry.sol
│   │   └── ArcoinTreasury.sol
│   └── scripts/
│       ├── deploy-all.ts
│       ├── deploy-registry.ts
│       ├── deploy-sablier.ts
│       └── post-deploy-patch.ts
├── locales/
│   ├── en.json            # English i18n
│   └── hi.json            # Hindi i18n
├── src/
│   ├── app/               # Next.js App Router
│   ├── components/
│   │   ├── layout/        # Shell, nav
│   │   ├── payment/       # Send, Escrow, Swap screens
│   │   ├── streaming/     # Sablier stream UI
│   │   ├── resources/     # Docs & links
│   │   ├── ui/            # Toast, TxStatusBar
│   │   └── wallet/        # ConnectScreen, Dashboard
│   ├── hooks/             # useArcBalance, useArcID, useSendPayment, ...
│   ├── lib/               # chains, constants, i18n, compliance, errors
│   └── types/             # Shared TypeScript types
├── hardhat.config.ts
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── DEPLOY.md              # Full deployment guide
```

---

## Roadmap

| Phase | Status | Features |
|---|---|---|
| Phase 1 | ✅ Complete | Wallet connect, USDC send, balance display, Blockscout links |
| Phase 2 | ✅ Complete | Sablier streaming, ArcID registry, Escrow, Swap, Hindi i18n |
| Phase 3 | 🔜 Planned | Chainalysis compliance, multisig ownership transfer, mainnet |
| Phase 4 | 🔜 Planned | Mobile app, push notifications |
| Phase 5 | 🔜 Planned | AI Help (Claude) full integration |

---

## Security

- Contracts use **ReentrancyGuard** and **SafeERC20** throughout
- Treasury distributions are **72-hour time-locked**
- ArcID fee changes are **48-hour time-locked**
- PaymentRouter has an **OFAC/sanctions blocklist**
- Escrow supports **on-chain arbiter dispute resolution**
- `.env.local` is gitignored — never commit secrets

> ⚠️ This is **testnet software**. Never use mainnet private keys in `.env.local`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Auth | Privy (email + embedded wallet + WalletConnect) |
| Web3 | wagmi v2, viem v2, @tanstack/react-query |
| Contracts | Solidity 0.8.24, OpenZeppelin, Hardhat |
| Streaming | Sablier V2 (LockupLinear + LockupDynamic) |
| AI | Anthropic Claude (AI Help — Phase 5) |
| Deploy | Vercel (frontend), Hardhat (contracts) |
| Chain | Arc Testnet — Chain ID 5042002 |

---

## License

MIT — see [LICENSE](LICENSE)

---

## Credits

Built on [Arc Network](https://arc.network) · Powered by [Sablier V2](https://sablier.com) · Auth by [Privy](https://privy.io) · Explorer by [Blockscout](https://blockscout.com)
