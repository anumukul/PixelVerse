const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting PixelVerse deployment on Somnia...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check balance (FIXED for ethers v6)
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "STT\n");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no STT tokens!");
    console.log("Please get testnet tokens from: https://testnet.somnia.network/");
    process.exit(1);
  }

  try {
    // Deploy PixelNFT contract
    console.log("📄 Deploying PixelNFT contract...");
    const PixelNFT = await ethers.getContractFactory("PixelNFT");
    
    console.log("⏳ Deployment in progress...");
    const pixelNFT = await PixelNFT.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pixelNFT.waitForDeployment();

    const contractAddress = await pixelNFT.getAddress();
    console.log("✅ PixelNFT deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔗 View on Explorer:", `https://shannon-explorer.somnia.network/address/${contractAddress}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check contract code
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }

    // Test basic contract functions
    console.log("Testing contract functions...");
    
    const canvasWidth = await pixelNFT.CANVAS_WIDTH();
    const canvasHeight = await pixelNFT.CANVAS_HEIGHT();
    const pixelPrice = await pixelNFT.pixelPrice();
    const totalPixels = await pixelNFT.totalPixelsPainted();

    console.log("📊 Contract Configuration:");
    console.log("   Canvas Size:", canvasWidth.toString(), "x", canvasHeight.toString());
    console.log("   Pixel Price:", ethers.formatEther(pixelPrice), "STT");
    console.log("   Total Pixels Painted:", totalPixels.toString());

    // Get deployment transaction details
    const deployTx = pixelNFT.deploymentTransaction();
    console.log("\n📋 Deployment Details:");
    console.log("   Transaction Hash:", deployTx.hash);
    console.log("   Gas Used:", deployTx.gasLimit?.toString() || "N/A");
    console.log("   Gas Price:", deployTx.gasPrice ? ethers.formatUnits(deployTx.gasPrice, "gwei") + " gwei" : "N/A");

    // Save deployment info
    const deploymentInfo = {
      network: "somniaTestnet",
      contractName: "PixelNFT",
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      transactionHash: deployTx.hash,
      blockNumber: deployTx.blockNumber,
      timestamp: new Date().toISOString(),
      canvasWidth: canvasWidth.toString(),
      canvasHeight: canvasHeight.toString(),
      pixelPrice: ethers.formatEther(pixelPrice),
      explorerUrl: `https://shannon-explorer.somnia.network/address/${contractAddress}`
    };

    // Write deployment info to file
    const fs = require("fs");
    const deploymentPath = "./deployment-info.json";
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentPath);

    // Frontend configuration
    const frontendConfig = {
      contractAddress: contractAddress,
      networkConfig: {
        chainId: "0xC458", // 50312 in hex
        chainName: "Somnia Testnet",
        rpcUrls: ["https://dream-rpc.somnia.network/"],
        blockExplorerUrls: ["https://shannon-explorer.somnia.network/"],
        nativeCurrency: {
          name: "STT",
          symbol: "STT",
          decimals: 18
        }
      }
    };

    fs.writeFileSync("./frontend-config.json", JSON.stringify(frontendConfig, null, 2));
    console.log("⚛️  Frontend config saved to: ./frontend-config.json");

    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("\n📝 Next Steps:");
    console.log("1. Copy contract address to your frontend");
    console.log("2. Test painting a pixel");
    console.log("3. Start building your frontend!");

    console.log("\n🔗 Important URLs:");
    console.log("   Contract:", `https://shannon-explorer.somnia.network/address/${contractAddress}`);
    console.log("   Somnia Testnet:", "https://testnet.somnia.network/");
    console.log("   Somnia Docs:", "https://docs.somnia.network/");

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more STT tokens from the faucet");
      console.log("   Visit: https://testnet.somnia.network/");
    } else if (error.message.includes("network")) {
      console.log("\n💡 Solution: Check your network configuration");
      console.log("   Ensure Somnia testnet is properly configured in hardhat.config.js");
    }
    
    process.exit(1);
  }
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });