# ARCOIN â€” Deployment Guide

## Prerequisites (à¤à¤• à¤¬à¤¾à¤° setup à¤•à¤°à¥‡à¤‚)

```bash
# 1. Node.js 18+ à¤”à¤° npm confirm à¤•à¤°à¥‡à¤‚
node --version   # v18+
npm --version    # 9+

# 2. Project install à¤•à¤°à¥‡à¤‚
npm install

# 3. Hardhat install à¤•à¤°à¥‡à¤‚ (contracts à¤•à¥‡ à¤²à¤¿à¤)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

---

## Step 1: Environment Setup

```bash
# .env.local à¤¬à¤¨à¤¾à¤à¤‚
cp .env.example .env.local
```

`.env.local` à¤®à¥‡à¤‚ à¤¯à¤¹ fill à¤•à¤°à¥‡à¤‚:
```env
# Privy Dashboard à¤¸à¥‡: https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxx

# Arc Testnet wallet à¤•à¥€ private key
# âš ï¸ TESTNET ONLY â€” à¤•à¤­à¥€ mainnet key à¤¯à¤¹à¤¾à¤ à¤®à¤¤ à¤¡à¤¾à¤²à¥‡à¤‚
DEPLOYER_PRIVATE_KEY=0xabc123...

# Treasury à¤•à¥‡ à¤²à¤¿à¤ multisig address (testnet à¤ªà¤° deployer address à¤ à¥€à¤• à¤¹à¥ˆ)
TREASURY_MULTISIG=0xYourWalletAddress
DEV_FUND=0xYourWalletAddress
LIQUIDITY_RESERVE=0xYourWalletAddress
COMMUNITY_MULTISIG=0xYourWalletAddress

# Claude API (AI Help feature à¤•à¥‡ à¤²à¤¿à¤)
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Step 2: Get Testnet USDC (Gas à¤•à¥‡ à¤²à¤¿à¤)

```
1. https://faucet.circle.com à¤–à¥‹à¤²à¥‡à¤‚
2. Arc Testnet select à¤•à¤°à¥‡à¤‚
3. Deployer wallet address paste à¤•à¤°à¥‡à¤‚
4. 10 USDC receive à¤•à¤°à¥‡à¤‚
```

---

## Step 3: Deploy Smart Contracts

```bash
# à¤¸à¤­à¥€ 5 contracts à¤à¤• command à¤¸à¥‡ deploy à¤¹à¥‹à¤‚à¤—à¥‡:
npx hardhat run contracts/scripts/deploy-all.ts --network arc-testnet
```

**Expected output:**
```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘      ARCOIN â€” FULL CONTRACT DEPLOYMENT           â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Network:    Arc Testnet (5042002)               â•‘
â•‘  Deployer:   0xAbCd...                           â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

â–º [1/5] Deploying ArcoinRegistry (ArcID)...
  âœ“ Registry:      0x...

â–º [2/5] Deploying ArcoinTreasury...
  âœ“ Treasury:      0x...

â–º [3/5] Deploying ArcoinPaymentRouter...
  âœ“ PaymentRouter: 0x...

â–º [4/5] Configuring Treasury â†’ approve PaymentRouter...
  âœ“ PaymentRouter approved as fee collector

â–º [5/5] Deploying Sablier V2...
  âœ“ LockupLinear:  0x...
  âœ“ LockupDynamic: 0x...

Saved to: contracts/deployments/arc-testnet.json
```

---

## Step 4: Auto-patch constants.ts

```bash
# Deployment addresses à¤•à¥‹ constants.ts à¤®à¥‡à¤‚ auto-inject à¤•à¤°à¥‡à¤‚
npx ts-node contracts/scripts/post-deploy-patch.ts
```

---

## Step 5: Verify Contracts on Blockscout

```bash
# Registry verify à¤•à¤°à¥‡à¤‚
npx hardhat verify --network arc-testnet <REGISTRY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>"

# Treasury verify à¤•à¤°à¥‡à¤‚
npx hardhat verify --network arc-testnet <TREASURY_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>" "<DEPLOYER_ADDR>"

# PaymentRouter verify à¤•à¤°à¥‡à¤‚
npx hardhat verify --network arc-testnet <ROUTER_ADDR> \
  "0x3600000000000000000000000000000000000000" \
  "<TREASURY_ADDR>" "<DEPLOYER_ADDR>"
```

---

## Step 6: Test App Locally

```bash
npm run dev
# http://localhost:3000 à¤–à¥‹à¤²à¥‡à¤‚
```

Test checklist:
```
â˜ MetaMask â†’ Arc Testnet (5042002) â†’ Connect
â˜ Balance display (faucet.circle.com à¤¸à¥‡ USDC à¤²à¥‡à¤‚)
â˜ Send 1 USDC to another address
â˜ Blockscout link à¤•à¤¾à¤® à¤•à¤° à¤°à¤¹à¤¾ à¤¹à¥ˆ
â˜ ArcID register (alice.arc)
â˜ Stream create à¤•à¤°à¥‡à¤‚ (5 USDC, 7 days)
â˜ Audit CSV export
â˜ AI Help à¤®à¥‡à¤‚ à¤¸à¤µà¤¾à¤² à¤ªà¥‚à¤›à¥‡à¤‚
```

---

## Step 7: GitHub Push

```bash
# Repo init (à¤…à¤—à¤° à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ)
git init
git add .
git commit -m "feat: Arcoin Phase 1+2 complete"
git branch -M main

# GitHub à¤ªà¤° repo à¤¬à¤¨à¤¾à¤à¤‚, à¤«à¤¿à¤°:
git remote add origin https://github.com/YOUR_USERNAME/arcoin.git
git push -u origin main
```

**âš ï¸ .gitignore confirm à¤•à¤°à¥‡à¤‚:**
```bash
cat .gitignore | grep "env.local"
# Output: .env.local â† à¤¯à¤¹ line à¤¹à¥‹à¤¨à¥€ à¤šà¤¾à¤¹à¤¿à¤
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
# 3. Environment Variables add à¤•à¤°à¥‡à¤‚:
#    NEXT_PUBLIC_PRIVY_APP_ID = clxxxxxxx
#    ANTHROPIC_API_KEY        = sk-ant-xxxxx
# 4. Deploy
```

**Vercel Environment Variables (Dashboard à¤®à¥‡à¤‚):**
```
NEXT_PUBLIC_PRIVY_APP_ID      â†’ Privy Dashboard à¤¸à¥‡
ANTHROPIC_API_KEY              â†’ console.anthropic.com à¤¸à¥‡
NEXT_PUBLIC_APP_URL            â†’ https://arcoin.vercel.app
NEXT_PUBLIC_APP_ENV            â†’ production
```

---

## Deployment Checklist (Final)

```
CONTRACTS
â˜ ArcoinRegistry deployed + verified
â˜ ArcoinTreasury deployed + verified
â˜ ArcoinPaymentRouter deployed + verified
â˜ Sablier LockupLinear deployed
â˜ Sablier LockupDynamic deployed
â˜ constants.ts patched (post-deploy-patch.ts)

FRONTEND
â˜ npm run dev â†’ localhost:3000 à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ
â˜ Wallet connect à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ
â˜ Balance à¤¦à¤¿à¤–à¤¤à¤¾ à¤¹à¥ˆ
â˜ Send à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ + Blockscout link

DEPLOY
â˜ .env.local â†’ .gitignore à¤®à¥‡à¤‚ à¤¹à¥ˆ â† CRITICAL
â˜ GitHub push complete
â˜ Vercel env vars set
â˜ Vercel deploy success
â˜ Production URL test à¤•à¤¿à¤¯à¤¾

POST-DEPLOY
â˜ ArcoinEscrow deploy à¤•à¤°à¥‡à¤‚ (Phase 3 à¤•à¥‡ à¤²à¤¿à¤)
â˜ Ownership to multisig transfer à¤•à¤°à¥‡à¤‚
```

---

## Addresses Reference (fill à¤•à¤°à¥‡à¤‚ after deploy)

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
