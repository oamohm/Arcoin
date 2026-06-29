/**
 * ARCOIN â€” deploy-all.ts
 * Master deployment script. Deploys all contracts in dependency order.
 *
 * ORDER (cannot be changed â€” contracts reference each other):
 *   1. ArcoinRegistry    (standalone)
 *   2. ArcoinTreasury    (standalone)
 *   3. ArcoinPaymentRouter (needs Treasury address)
 *   4. Treasury.setCollectorApproved(PaymentRouter, true)
 *   5. Sablier V2 (NFTDescriptor â†’ LockupLinear â†’ LockupDynamic)
 *
 * Post-deploy:
 *   6. Update constants.ts with all addresses
 *   7. Transfer ownership to multisig
 *   8. Verify all contracts on Blockscout
 *
 * Run:
 *   npx hardhat run contracts/scripts/deploy-all.ts --network arc-testnet
 */

import { ethers } from "hardhat"
import * as fs    from "fs"
import * as path  from "path"

// â”€â”€ CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const USDC       = "0x3600000000000000000000000000000000000000"

// These must be real multisig addresses before mainnet
// For testnet, deployer EOA is acceptable
const TREASURY_MULTISIG    = process.env.TREASURY_MULTISIG    ?? ""
const DEV_FUND             = process.env.DEV_FUND             ?? ""
const LIQUIDITY_RESERVE    = process.env.LIQUIDITY_RESERVE    ?? ""
const COMMUNITY_MULTISIG   = process.env.COMMUNITY_MULTISIG   ?? ""

function assertEnv(val: string, name: string) {
  if (!val) throw new Error(`${name} not set in environment. Check .env.local`)
}

async function main() {
  const [deployer] = await ethers.getSigners()

  // For testnet: allow deployer as all recipients if not set
  const devFund          = DEV_FUND           || deployer.address
  const liquidityReserve = LIQUIDITY_RESERVE  || deployer.address
  const communityMsig    = COMMUNITY_MULTISIG || deployer.address
  const treasury_owner   = TREASURY_MULTISIG  || deployer.address

  console.log("â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—")
  console.log("â•‘      ARCOIN â€” FULL CONTRACT DEPLOYMENT           â•‘")
  console.log("â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£")
  console.log(`â•‘  Network:    Arc Testnet (5042002)               â•‘`)
  console.log(`â•‘  Deployer:   ${deployer.address.slice(0,20)}...  â•‘`)
  console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n")

  const results: Record<string, string> = {}

  // â”€â”€ 1. ArcoinRegistry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("â–º [1/5] Deploying ArcoinRegistry (ArcID)...")
  const Registry = await ethers.getContractFactory("ArcoinRegistry")
  const registry = await Registry.deploy(USDC, deployer.address, deployer.address)
  await registry.waitForDeployment()
  results.Registry = await registry.getAddress()
  console.log(`  âœ“ Registry:      ${results.Registry}`)

  // â”€â”€ 2. ArcoinTreasury â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ–º [2/5] Deploying ArcoinTreasury...")
  const Treasury = await ethers.getContractFactory("ArcoinTreasury")
  const treasury = await Treasury.deploy(
    USDC, devFund, liquidityReserve, communityMsig, deployer.address
  )
  await treasury.waitForDeployment()
  results.Treasury = await treasury.getAddress()
  console.log(`  âœ“ Treasury:      ${results.Treasury}`)

  // â”€â”€ 3. ArcoinPaymentRouter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ–º [3/5] Deploying ArcoinPaymentRouter...")
  const Router = await ethers.getContractFactory("ArcoinPaymentRouter")
  const router = await Router.deploy(USDC, results.Treasury, deployer.address)
  await router.waitForDeployment()
  results.PaymentRouter = await router.getAddress()
  console.log(`  âœ“ PaymentRouter: ${results.PaymentRouter}`)

  // â”€â”€ 4. Approve Router as fee collector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ–º [4/5] Configuring Treasury â†’ approve PaymentRouter...")
  const treasuryContract = await ethers.getContractAt("ArcoinTreasury", results.Treasury)
  const approveTx = await treasuryContract.setCollectorApproved(results.PaymentRouter, true)
  await approveTx.wait()
  console.log(`  âœ“ PaymentRouter approved as fee collector`)

  // â”€â”€ 5. Sablier V2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ–º [5/5] Deploying Sablier V2...")
  const NFTDesc = await ethers.getContractFactory("SablierV2NFTDescriptor")
  const desc    = await NFTDesc.deploy()
  await desc.waitForDeployment()
  results.SablierNFTDescriptor = await desc.getAddress()

  const Linear = await ethers.getContractFactory("SablierV2LockupLinear")
  const linear = await Linear.deploy(deployer.address, results.SablierNFTDescriptor)
  await linear.waitForDeployment()
  results.SablierLockupLinear = await linear.getAddress()

  const Dynamic = await ethers.getContractFactory("SablierV2LockupDynamic")
  const dynamic = await Dynamic.deploy(deployer.address, results.SablierNFTDescriptor, 500)
  await dynamic.waitForDeployment()
  results.SablierLockupDynamic = await dynamic.getAddress()

  console.log(`  âœ“ LockupLinear:  ${results.SablierLockupLinear}`)
  console.log(`  âœ“ LockupDynamic: ${results.SablierLockupDynamic}`)

  // â”€â”€ OUTPUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—")
  console.log("â•‘   DEPLOYMENT COMPLETE â€” COPY TO constants.ts    â•‘")
  console.log("â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£")
  Object.entries(results).forEach(([k, v]) => {
    console.log(`â•‘  ${k.padEnd(24)} ${v.slice(0,20)}...  â•‘`)
  })
  console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•")

  // â”€â”€ Auto-write deployment JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deploymentData = {
    network:     "arc-testnet",
    chainId:     5042002,
    deployedAt:  new Date().toISOString(),
    deployer:    deployer.address,
    contracts:   results,
  }

  const outPath = path.join(__dirname, "../deployments/arc-testnet.json")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(deploymentData, null, 2))
  console.log(`\n  Saved to: contracts/deployments/arc-testnet.json`)

  // â”€â”€ constants.ts patch instructions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\n  Patch constants.ts with these values:")
  console.log(`
  export const ARCOIN_CONTRACTS = {
    PaymentRouter: "${results.PaymentRouter}",
    Registry:      "${results.Registry}",
    Treasury:      "${results.Treasury}",
    Escrow:        "",  // Phase 3
  }

  export const SABLIER = {
    LockupLinear:  "${results.SablierLockupLinear}",
    LockupDynamic: "${results.SablierLockupDynamic}",
  }
  `)

  // â”€â”€ Verification commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("  Blockscout Verification Commands:")
  console.log(`  npx hardhat verify --network arc-testnet ${results.Registry} "${USDC}" "${deployer.address}" "${deployer.address}"`)
  console.log(`  npx hardhat verify --network arc-testnet ${results.Treasury} "${USDC}" "${devFund}" "${liquidityReserve}" "${communityMsig}" "${deployer.address}"`)
  console.log(`  npx hardhat verify --network arc-testnet ${results.PaymentRouter} "${USDC}" "${results.Treasury}" "${deployer.address}"`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
