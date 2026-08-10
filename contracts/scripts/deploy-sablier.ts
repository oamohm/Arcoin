/**
 * ARCOIN â€” deploy-sablier.ts
 * Deploy Sablier V2 LockupLinear + LockupDynamic on Arc Testnet.
 *
 * ARCHITECT NOTE:
 *   We do NOT fork Sablier. We deploy official Sablier V2 Core contracts
 *   from their NPM package directly onto Arc. This keeps audited code intact.
 *
 * Prerequisites:
 *   npm install --save-dev @sablier/v2-core
 *
 * Run:
 *   npx hardhat run contracts/scripts/deploy-sablier.ts --network arc-testnet
 */

import { ethers } from "hardhat"

const USDC_ADDRESS  = "0x3600000000000000000000000000000000000000"
const NFT_DESCRIPTOR = ethers.ZeroAddress  // Use zero for testnet (no NFT art needed)

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•")
  console.log("  SABLIER V2 â€” ARC TESTNET DEPLOYMENT")
  console.log("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•")
  console.log(`  Deployer: ${deployer.address}`)
  console.log(`  USDC:     ${USDC_ADDRESS}`)

  // â”€â”€ STEP 1: Deploy SablierV2NFTDescriptor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\n  [1/3] Deploying NFTDescriptor...")
  const NFTDescriptor = await ethers.getContractFactory("SablierV2NFTDescriptor")
  const descriptor    = await NFTDescriptor.deploy()
  await descriptor.waitForDeployment()
  const descriptorAddr = await descriptor.getAddress()
  console.log(`  âœ“ NFTDescriptor: ${descriptorAddr}`)

  // â”€â”€ STEP 2: Deploy LockupLinear â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\n  [2/3] Deploying LockupLinear...")
  const LockupLinear = await ethers.getContractFactory("SablierV2LockupLinear")
  const linear = await LockupLinear.deploy(
    deployer.address,   // initial admin
    descriptorAddr,
  )
  await linear.waitForDeployment()
  const linearAddr = await linear.getAddress()
  console.log(`  âœ“ LockupLinear:  ${linearAddr}`)

  // â”€â”€ STEP 3: Deploy LockupDynamic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\n  [3/3] Deploying LockupDynamic...")
  const LockupDynamic = await ethers.getContractFactory("SablierV2LockupDynamic")
  const dynamic = await LockupDynamic.deploy(
    deployer.address,
    descriptorAddr,
    500,  // max segment count
  )
  await dynamic.waitForDeployment()
  const dynamicAddr = await dynamic.getAddress()
  console.log(`  âœ“ LockupDynamic: ${dynamicAddr}`)

  // â”€â”€ RESULTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•")
  console.log("  DEPLOYMENT COMPLETE â€” COPY THESE VALUES")
  console.log("â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•")
  console.log(`  LockupLinear:   "${linearAddr}"`)
  console.log(`  LockupDynamic:  "${dynamicAddr}"`)
  console.log(`  NFTDescriptor:  "${descriptorAddr}"`)
  console.log("\n  Add to constants.ts â†’ SABLIER object")
  console.log("\n  Verify:")
  console.log(`  npx hardhat verify --network arc-testnet ${linearAddr} \\`)
  console.log(`    "${deployer.address}" "${descriptorAddr}"`)
  console.log("\n  Explorer:")
  console.log(`  https://atlas.blockscout.com/address/${linearAddr}`)
  console.log(`  https://atlas.blockscout.com/address/${dynamicAddr}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
