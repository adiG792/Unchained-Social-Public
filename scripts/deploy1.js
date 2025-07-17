const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  // Deploy SocialToken with initial supply (e.g. 1 million SOC)
  const Token = await ethers.getContractFactory("SocialToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  // Deploy PostContract with token address as constructor argument
  const PostContract = await ethers.getContractFactory("PostContract");
  const postContract = await PostContract.deploy(tokenAddress);
  await postContract.waitForDeployment();
  const postContractAddress = await postContract.getAddress();
  console.log("PostContract deployed to:", postContractAddress);

  // Write deployed addresses to contracts.json in frontend/src/
  const contracts = {
    PostContract: postContractAddress,
    SocialToken: tokenAddress,
  };

  const contractsPath = path.join(__dirname, "../frontend/src/contracts.json");
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));

  console.log(`✅ Wrote contract addresses to: ${contractsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});