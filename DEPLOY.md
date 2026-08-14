# ARCOIN — Deployment Guide

## Prerequisites (एक बार setup करें)

```bash
# 1. Node.js 18+ और npm confirm करें
node --version   # v18+
npm --version    # 9+

# 2. Project install करें
npm install

# 3. Hardhat install करें (contracts के लिए)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

---

## Step 1: Environment Setup

```bash
# .env.local बनाएं
cp .env.example .env.local
```

`.env.local` में यह fill करें:
```env
# Privy Dashboard से: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxx

# Arc Testnet wallet की private key
# ⚠ ️ TESTNET ONLY — कभी mainnet key यहाँ मत डालें
DEPLOYER_PRIVATE_KEY=0xabc123...

# Treasury के लिए multisig address (testnet पर deployer address à¤ ीक है)
TREASURY_MULTISIG=0xYourWalletAddress
DEV_FUND=0xYourWalletAddress
LIQUIDITY_RESERVE=0xYourWalletAddress
COMMUNITY_MULTISIG=0xYourWalletAddress

# Claude API (AI Help feature के लिए)
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Step 2: Get Testnet USDC (Gas के लिए)

```
1. https://faucet.circle.com खोलें
2. Arc Testnet select करें
3. Deployer wallet address paste करें
4. 10 USDC receive करें
```

---

## Step 3: Deploy Smart Contracts

```bash
# सभी 5 contracts एक command से deploy होंगे:
npx hardhat run contracts/scripts/deploy-all.ts --network arc-testnet
```

**Expected output:**
```
╔══════════════════════════════════════════════════╗
║      ARCOIN — FULL CONTRACT DEPLOYMENT           ║
╠ ══════════════════════════════════════════════════╣
║  Network:    Arc Testnet (5042002)               ║
║  Deployer:   0xAbCd...                           ║
╚══════════════════════════════════════════════════╝

► [1/5] Deploying ArcoinRegistry (ArcID)...
  ✓ Registry:      0x...

► [2/5] Deploying ArcoinTreasury...
  ✓ Treasury:      0x...

► [3/5] Deploying ArcoinPaymentRouter...
  ✓ PaymentRouter: 0x...

► [4/5] Configuring Treasury → approve PaymentRouter...
  ✓ PaymentRouter approved as fee collector

► [5/5] Deploying Sablier V2...
  ✓ LockupLinear:  0x...
  ✓ LockupDynamic: 0x...

Saved to: contracts/deployments/arc-testnet.json
```

---

## Step 4: Auto-patch constants.ts

```bash
# Deployment addresses को constants.ts में auto-inject करें
npx ts-node contracts/scripts/post-deploy-patch.ts
```

---

## Step 5: Verify Contracts on Blockscout

```bash
# Registry verify करें
npx hardhat verify --network arc-testnet <REGISTRY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>"

# Treasury verify करें
npx hardhat verify --network arc-testnet <TREASURY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>"

# PaymentRouter verify करें
npx hardhat verify --network arc-testnet <ROUTER_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<TREASURY_ADDR>" "<DEPLOYER_ADDR>"
```

---

## Step 6: Test App Locally

```bash
npm run dev
# http://localhost:3000 खोलें
```

Test checklist:
```
☐ MetaMask → Arc Testnet (5042002) → Connect
☐ Balance display (faucet.circle.com से USDC लें)
☐ Send 1 USDC to another address
☐ Blockscout link काम कर रहा है
☐ ArcID register (alice.arc)
☐ Stream create करें (5 USDC, 7 days)
☐ Audit CSV export
☐ AI Help में सवाल पूछें
```

---

## Step 7: GitHub Push

```bash
# Repo init (अगर नहीं है)
git init
git add .
git commit -m "feat: Arcoin Phase 1+2 complete"
git branch -M main

# GitHub पर repo बनाएं, फिर:
git remote add origin https://github.com/YOUR_USERNAME/arcoin.git
git push -u origin main
```

**⚠ ️ .gitignore confirm करें:**
```bash
cat .gitignore | grep "env.local"
# Output: .env.local ← यह line होनी चाहिए
```

---

## Step 8: Vercel Deploy

```bash
# Option A: Vercel CLI
npm install -g vercel
vercel --prod

# Option B: Vercel Dashboard
# 1. https://vercel.com/new
# 2. Import GitHub repo
# 3. Environment Variables add करें:
#    NEXT_PUBLIC_PRIVY_APP_ID = clxxxxxxx
#    ANTHROPIC_API_KEY        = sk-ant-xxxxx
# 4. Deploy
```

**Vercel Environment Variables (Dashboard में):**
```
NEXT_PUBLIC_PRIVY_APP_ID      → Privy Dashboard से
ANTHROPIC_API_KEY              → console.anthropic.com से
NEXT_PUBLIC_APP_URL            → https://arcoin.vercel.app
NEXT_PUBLIC_APP_ENV            → production
```

---

## Deployment Checklist (Final)

```
CONTRACTS
☐ ArcoinRegistry deployed + verified
☐ ArcoinTreasury deployed + verified
☐ ArcoinPaymentRouter deployed + verified
☐ Sablier LockupLinear deployed
☐ Sablier LockupDynamic deployed
☐ constants.ts patched (post-deploy-patch.ts)

FRONTEND
☐ npm run dev → localhost:3000 काम करता है
☐ Wallet connect काम करता है
☐ Balance दिखता है
☐ Send काम करता है + Blockscout link

DEPLOY
☐ .env.local → .gitignore में है ← CRITICAL
☐ GitHub push complete
☐ Vercel env vars set
☐ Vercel deploy success
☐ Production URL test किया

POST-DEPLOY
☐ ArcoinEscrow deploy करें (Phase 3 के लिए)
☐ Ownership to multisig transfer करें
```

---

## Addresses Reference (fill करें after deploy)

```
Arc Testnet (5042002)
USDC:           0x3600000000000000000000000000000000000000
APEXISWAP:      0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F
Blockscout:     https://atlas.blockscout.com
Faucet:         https://faucet.circle.com

ARCOIN CONTRACTS (after deploy):
Registry:       0x________________
Treasury:       0x________________
PaymentRouter:  0x________________
LockupLinear:   0x________________
LockupDynamic:  0x________________
Escrow:         (Phase 3)
```
