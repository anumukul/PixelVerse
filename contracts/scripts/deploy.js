// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PixelCanvas contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  const PixelCanvas = await ethers.getContractFactory("PixelCanvas");
  
  console.log("Deploying contract...");
  const pixelCanvas = await PixelCanvas.deploy();
  
  await pixelCanvas.waitForDeployment();
  
  const contractAddress = await pixelCanvas.getAddress();
  console.log("PixelCanvas deployed to:", contractAddress);

  const deploymentTx = pixelCanvas.deploymentTransaction();
  if (deploymentTx) {
    console.log("Transaction hash:", deploymentTx.hash);
    console.log("Block number:", deploymentTx.blockNumber);
    
    const receipt = await deploymentTx.wait();
    const deploymentCost = receipt.gasUsed * deploymentTx.gasPrice;
    console.log("Deployment cost:", ethers.formatEther(deploymentCost), "ETH");
  }

  console.log("\nContract Information:");
  const stats = await pixelCanvas.getCanvasStats();
  console.log("Canvas Size:", `${stats[0]}x${stats[1]}`);
  console.log("Initial Pixel Price:", ethers.formatEther(stats[3]), "ETH");
  console.log("Initial Total Supply:", stats[4].toString());
  
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: (await deployer.provider.getNetwork()).name,
    chainId: Number((await deployer.provider.getNetwork()).chainId),
    blockNumber: deploymentTx?.blockNumber || 0,
    transactionHash: deploymentTx?.hash || "",
    deployedAt: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment completed successfully!");
  console.log("Contract info saved to deployment-info.json");
  
  console.log("\nTo verify on block explorer, run:");
  console.log(`npx hardhat verify --network <network-name> ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });