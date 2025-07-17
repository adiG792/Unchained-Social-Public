import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import contracts from '../frontend/src/contracts.json' assert { type: "json" };

// Update these according to your setup:
const providerUrl = 'http://127.0.0.1:8545'; // Your local node URL
const contractAddress = contracts.PostContract; // Replace with your deployed contract address
const contractAbi = JSON.parse(fs.readFileSync('./frontend/abis/PostContract.json', 'utf8')); // Adjust path if needed

// Path to your local media folder:
const mediaFolder = path.resolve('./frontend/public/media');

async function checkPosts() {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const contract = new ethers.Contract(contractAddress, contractAbi.abi, provider);

    const postCountBN = await contract.postCount();
    const postCount = postCountBN.toNumber ? postCountBN.toNumber() : Number(postCountBN);

    console.log(`Total posts on chain: ${postCount}`);
    console.log('Checking each post...');

    for (let i = 1; i <= postCount; i++) {
      try {
        const post = await contract.posts(i);

        const id = post.id.toString();
        const author = post.author;
        const contentHash = post.contentHash;
        const timestamp = new Date(Number(post.timestamp) * 1000).toLocaleString();

        // Check if the file exists locally
        const filePath = path.join(mediaFolder, contentHash);
        const fileExists = fs.existsSync(filePath);

        console.log(`Post #${id} | Author: ${author} | Content: ${contentHash} | Timestamp: ${timestamp} | File exists locally: ${fileExists}`);
      } catch (err) {
        console.error(`Error fetching post #${i}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in checkPosts:', err);
  }
}

checkPosts();