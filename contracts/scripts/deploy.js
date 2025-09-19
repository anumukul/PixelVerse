const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Fixed PixelCanvas...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const PixelCanvas = await ethers.getContractFactory("PixelCanvas");
  const pixelCanvas = await PixelCanvas.deploy();
  
  await pixelCanvas.waitForDeployment();
  
  const contractAddress = await pixelCanvas.getAddress();
  console.log("Contract deployed to:", contractAddress);

  const deploymentInfo = {
    contractAddress: contractAddress,
    chainId: 50312
  };

  const fs = require('fs');
  fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  
  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});