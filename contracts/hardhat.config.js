// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
       viaIR: true,
    },
  },
  networks: {

    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },

    somnia_testnet: {
      url: process.env.SOMNIA_TESTNET_RPC || "https://dream-rpc.somnia.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 50312,
      gasPrice: "auto",
      gas: "auto"
    },

    somnia_mainnet: {
      url: process.env.SOMNIA_MAINNET_RPC || "https://somnia-mainnet-rpc.example.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0,
      gasPrice: "auto",
      gas: "auto"
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },


  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  }
};