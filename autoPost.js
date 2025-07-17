import { create } from 'ipfs-http-client';
import fs from 'fs';
import { ethers } from 'ethers';
import PostContractAbi from './abis/PostContract.json';
import contracts from './src/contracts.json';

// IPFS client
const client = create({ url: 'http://127.0.0.1:5001' });

// Ethers config (local Hardhat network)
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const DEPLOYER_PRIVATE_KEY = 'YOUR_PRIVATE_KEY_FOR_POSTING';
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

// Contract config
const postContractAddress = contracts.PostContract;
const postContract = new ethers.Contract(postContractAddress, PostContractAbi.abi, wallet);

async function autoPost(filePath) {
  console.log(`Uploading ${filePath} to IPFS...`);

  const file = fs.readFileSync(filePath);
  const result = await client.add({ content: file });

  const contentHash = result.path;
  console.log('✅ IPFS CID:', contentHash);

  console.log('Sending createPost tx...');

  const tx = await postContract.createPost(contentHash);
  await tx.wait();

  console.log('✅ Post submitted to blockchain!');
  console.log('📚 Content Hash:', contentHash);
}

const filePath = process.argv[2];

if (!filePath) {
  console.error('⚠️ Usage: node autoPost.js ./media/myfile.jpg');
  process.exit(1);
}

autoPost(filePath);
