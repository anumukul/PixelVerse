const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting PixelCanvasV2 deployment on Somnia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "STT\n");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no STT tokens!");
    console.log("Please get testnet tokens from: https://testnet.somnia.network/");
    process.exit(1);
  }

  try {
    console.log("📄 Deploying PixelCanvasV2 contract...");
    const PixelCanvasV2 = await ethers.getContractFactory("PixelCanvasV2");
    
    console.log("⏳ Deployment in progress...");
    const pixelCanvas = await PixelCanvasV2.deploy();
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pixelCanvas.waitForDeployment();

    const contractAddress = await pixelCanvas.getAddress();
    console.log("✅ PixelCanvasV2 deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔗 View on Explorer:", `https://shannon-explorer.somnia.network/address/${contractAddress}`);

    // Verify deployment and test functions
    console.log("\n🔍 Verifying deployment...");
    
    const canvasStats = await pixelCanvas.getCanvasStats();
    console.log("📊 Contract Configuration:");
    console.log("   Canvas Size:", canvasStats[0].toString(), "x", canvasStats[1].toString());
    console.log("   Pixels Painted:", canvasStats[2].toString());
    console.log("   Pixel Price:", ethers.formatEther(canvasStats[3]), "STT");
    console.log("   Total Supply:", canvasStats[4].toString());

    // Test batch painting function
    console.log("\n🧪 Testing batch painting function...");
    try {
      const testTx = await pixelCanvas.batchPaintPixels.staticCall(
        [10, 11, 12], // x coordinates
        [10, 10, 10], // y coordinates  
        [0xFF0000, 0x00FF00, 0x0000FF], // colors (red, green, blue)
        { value: ethers.parseEther("0.003") }
      );
      console.log("✅ Batch painting function test passed");
    } catch (error) {
      console.log("⚠️  Batch painting function test failed:", error.message);
    }

    // Test cursor update function
    console.log("\n🖱️  Testing cursor update function...");
    try {
      const cursorTx = await pixelCanvas.updateCursor.staticCall(100, 200);
      console.log("✅ Cursor update function test passed");
    } catch (error) {
      console.log("⚠️  Cursor update function test failed:", error.message);
    }

    // Test region loading function
    console.log("\n📍 Testing region loading function...");
    try {
      const regionData = await pixelCanvas.getCanvasRegion.staticCall(0, 0, 10, 10);
      console.log("✅ Region loading function test passed, returned", regionData.length, "pixels");
    } catch (error) {
      console.log("⚠️  Region loading function test failed:", error.message);
    }

    const deployTx = pixelCanvas.deploymentTransaction();
    console.log("\n📋 Deployment Details:");
    console.log("   Transaction Hash:", deployTx.hash);
    console.log("   Gas Used:", deployTx.gasLimit?.toString() || "N/A");
    console.log("   Gas Price:", deployTx.gasPrice ? ethers.formatUnits(deployTx.gasPrice, "gwei") + " gwei" : "N/A");

    // Save deployment info
    const deploymentInfo = {
      network: "somniaTestnet",
      contractName: "PixelCanvasV2",
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      transactionHash: deployTx.hash,
      blockNumber: deployTx.blockNumber,
      timestamp: new Date().toISOString(),
      canvasWidth: canvasStats[0].toString(),
      canvasHeight: canvasStats[1].toString(),
      pixelPrice: ethers.formatEther(canvasStats[3]),
      explorerUrl: `https://shannon-explorer.somnia.network/address/${contractAddress}`,
      features: {
        batchPainting: true,
        realTimeEvents: true,
        cursorTracking: true,
        regionLoading: true,
        pixelHistory: true
      }
    };

    const fs = require("fs");
    fs.writeFileSync("./deployment-v2-info.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to: ./deployment-v2-info.json");

    // Frontend configuration
    const frontendConfig = {
      contractAddress: contractAddress,
      contractName: "PixelCanvasV2",
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
      },
      features: deploymentInfo.features
    };

    fs.writeFileSync("./frontend-v2-config.json", JSON.stringify(frontendConfig, null, 2));
    console.log("⚛️  Frontend config saved to: ./frontend-v2-config.json");

    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("\n📝 Next Steps:");
    console.log("1. Update frontend with new contract address");
    console.log("2. Test batch painting functionality");
    console.log("3. Implement event listeners for real-time features");
    console.log("4. Test cursor tracking and region loading");

    console.log("\n🔗 Important URLs:");
    console.log("   Contract:", `https://shannon-explorer.somnia.network/address/${contractAddress}`);
    console.log("   Somnia Testnet:", "https://testnet.somnia.network/");

    console.log("\n🧪 Test Commands:");
    console.log(`   npx hardhat run scripts/test-batch-painting.js --network somniaTestnet`);
    console.log(`   npx hardhat run scripts/test-events.js --network somniaTestnet`);

  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more STT tokens from the faucet");
      console.log("   Visit: https://testnet.somnia.network/");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });