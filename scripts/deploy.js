const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  // Deploy PostContract
  const PostContract = await ethers.getContractFactory("PostContract");
  const postContract = await PostContract.deploy();
  await postContract.waitForDeployment();
  console.log("PostContract deployed to:", await postContract.getAddress());

  // Deploy SocialToken
  const Token = await ethers.getContractFactory("SocialToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});