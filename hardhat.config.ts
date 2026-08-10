import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? ""

if (!DEPLOYER_PRIVATE_KEY && process.env.NODE_ENV !== "test") {
  console.warn("âš   DEPLOYER_PRIVATE_KEY not set in .env.local")
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs:    200,
      },
      viaIR: true,
    },
  },
  networks: {
    "arc-testnet": {
      url:      "https://rpc.testnet.arc.network",
      chainId:  5042002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    // Blockscout verification for Arc
    apiKey: {
      "arc-testnet": "placeholder",    // Blockscout doesn't require key
    },
    customChains: [
      {
        network:  "arc-testnet",
        chainId:  5042002,
        urls: {
          apiURL:    "https://atlas.blockscout.com/api",
          browserURL: "https://atlas.blockscout.com",
        },
      },
    ],
  },
  paths: {
    sources:   "./contracts",
    tests:     "./contracts/test",
    cache:     "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
}

export default config
