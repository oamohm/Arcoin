/**
 * ARCOIN — deploy-registry.ts
 * Hardhat deployment script for ArcoinRegistry (ArcID).
 *
 * Prerequisites:
 *   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
 *   npm install @openzeppelin/contracts
 *
 * Run:
 *   npx hardhat run contracts/scripts/deploy-registry.ts --network arc-testnet
 */

import { ethers } from "hardhat"

// ── VERIFIED ADDRESSES (Arc Testnet) ────────────────────────
const USDC_ADDRESS     = "0x3600000000000000000000000000000000000000"

// TODO: Replace with your actual multisig treasury address
// Use a Gnosis Safe or similar — NOT an EOA
const TREASURY_ADDRESS = process.env.TREASURY_MULTISIG ?? ""

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log("═══════════════════════════════════════════")
  console.log("  ARCOIN REGISTRY — DEPLOYMENT")
  console.log("═══════════════════════════════════════════")
  console.log(`  Network:   Arc Testnet (5042002)`)
  console.log(`  Deployer:  ${deployer.address}`)
  console.log(`  USDC:      ${USDC_ADDRESS}`)
  console.log(`  Treasury:  ${TREASURY_ADDRESS}`)
  console.log("═══════════════════════════════════════════")

  if (!TREASURY_ADDRESS || TREASURY_ADDRESS === "") {
    throw new Error("TREASURY_MULTISIG env variable not set. Set a real multisig address.")
  }

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`\n  Deployer balance: ${ethers.formatUnits(balance, 6)} USDC (gas)`)

  // Deploy
  console.log("\n  Deploying ArcoinRegistry...")
  const Registry = await ethers.getContractFactory("ArcoinRegistry")
  const registry = await Registry.deploy(
    USDC_ADDRESS,
    TREASURY_ADDRESS,
    deployer.address,   // initial owner — TRANSFER to multisig after deploy
  )

  await registry.waitForDeployment()
  const registryAddress = await registry.getAddress()

  console.log(`\n  ✓ ArcoinRegistry deployed`)
  console.log(`    Address:     ${registryAddress}`)
  console.log(`    Tx:          ${registry.deploymentTransaction()?.hash}`)
  console.log(`    Explorer:    https://testnet.arcscan.app/address/${registryAddress}`)

  // ── POST-DEPLOY CHECKLIST ──────────────────────────────────
  console.log("\n═══════════════════════════════════════════")
  console.log("  POST-DEPLOY STEPS (DO THIS NOW)")
  console.log("═══════════════════════════════════════════")
  console.log(`  1. Add to constants.ts:`)
  console.log(`     Registry: "${registryAddress}"`)
  console.log(`  2. Transfer ownership to multisig:`)
  console.log(`     registry.transferOwnership(MULTISIG_ADDRESS)`)
  console.log(`  3. Verify on Blockscout:`)
  console.log(`     npx hardhat verify --network arc-testnet ${registryAddress} \\`)
  console.log(`       "${USDC_ADDRESS}" "${TREASURY_ADDRESS}" "${deployer.address}"`)
  console.log(`  4. Test registration:`)
  console.log(`     npx hardhat run contracts/scripts/test-registry.ts --network arc-testnet`)
  console.log("═══════════════════════════════════════════\n")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
