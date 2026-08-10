/**
 * ARCOIN â€” post-deploy-patch.ts
 * Reads the deployment JSON output and auto-patches constants.ts.
 *
 * Run AFTER deploy-all.ts:
 *   npx ts-node contracts/scripts/post-deploy-patch.ts
 *
 * What it does:
 *   1. Reads contracts/deployments/arc-testnet.json
 *   2. Patches src/lib/constants.ts with real addresses
 *   3. Removes all "to be deployed" placeholder comments
 */

import * as fs   from "fs"
import * as path from "path"

const DEPLOYMENT_PATH = path.join(__dirname, "../deployments/arc-testnet.json")
const CONSTANTS_PATH  = path.join(__dirname, "../../src/lib/constants.ts")

function main() {
  // â”€â”€ Read deployment output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!fs.existsSync(DEPLOYMENT_PATH)) {
    console.error(`âŒ Deployment file not found: ${DEPLOYMENT_PATH}`)
    console.error(`   Run deploy-all.ts first:\n   npx hardhat run contracts/scripts/deploy-all.ts --network arc-testnet`)
    process.exit(1)
  }

  const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, "utf-8"))
  const c          = deployment.contracts

  console.log("â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—")
  console.log("â•‘   ARCOIN â€” POST-DEPLOY CONSTANTS PATCH           â•‘")
  console.log("â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£")
  console.log(`â•‘  Deployed at:  ${deployment.deployedAt}`)
  console.log(`â•‘  Network:      ${deployment.network} (${deployment.chainId})`)
  console.log("â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n")

  Object.entries(c).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(28)} ${v}`)
  })

  // â”€â”€ Read constants.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let content = fs.readFileSync(CONSTANTS_PATH, "utf-8")

  // â”€â”€ Patch ARCOIN_CONTRACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  content = content.replace(
    /PaymentRouter:\s+"" as `0x\$\{string\}`,\s*\/\/ ArcoinPaymentRouter\.sol/,
    `PaymentRouter: "${c.PaymentRouter}" as \`0x\${string}\`,`
  )
  content = content.replace(
    /Registry:\s+"" as `0x\$\{string\}`,\s*\/\/ ArcID registry/,
    `Registry:      "${c.Registry}" as \`0x\${string}\`,`
  )
  content = content.replace(
    /Treasury:\s+"" as `0x\$\{string\}`,\s*\/\/ ArcoinTreasury\.sol/,
    `Treasury:      "${c.Treasury}" as \`0x\${string}\`,`
  )
  content = content.replace(
    /Escrow:\s+"" as `0x\$\{string\}`,\s*\/\/ Phase 3/,
    `Escrow:        "${c.Escrow || ""}" as \`0x\${string}\`,  // ArcoinEscrow`
  )

  // â”€â”€ Patch SABLIER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  content = content.replace(
    /LockupLinear:\s+"" as `0x\$\{string\}`,\s*\/\/ to be deployed/,
    `LockupLinear:   "${c.SablierLockupLinear}" as \`0x\${string}\`,`
  )
  content = content.replace(
    /LockupDynamic:\s+"" as `0x\$\{string\}`,\s*\/\/ to be deployed/,
    `LockupDynamic:  "${c.SablierLockupDynamic}" as \`0x\${string}\`,`
  )

  // â”€â”€ Write back â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fs.writeFileSync(CONSTANTS_PATH, content)

  console.log("\nâœ… constants.ts patched successfully")
  console.log("\nVerify these blocks in src/lib/constants.ts:")
  console.log(`
  ARCOIN_CONTRACTS = {
    PaymentRouter: "${c.PaymentRouter}"
    Registry:      "${c.Registry}"
    Treasury:      "${c.Treasury}"
    Escrow:        "${c.Escrow || "(deploy separately)"}"
  }

  SABLIER = {
    LockupLinear:  "${c.SablierLockupLinear}"
    LockupDynamic: "${c.SablierLockupDynamic}"
  }
  `)

  console.log("Next step: npm run dev â†’ test the app")
  console.log(`Blockscout: https://atlas.blockscout.com/address/${c.PaymentRouter}`)
}

main()
