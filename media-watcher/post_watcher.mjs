// post_watcher.mjs
import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import crypto from 'crypto';
import { ethers } from 'ethers';
import PostContractAbi from '../frontend/abis/PostContract.json' assert { type: "json" };
import contracts from '../frontend/src/contracts.json' assert { type: "json" };
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory and load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

// 🔐 Load encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.slice(0, 32);
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

// Config - Updated to watch the new /media folder structure
const MEDIA_DIR = path.resolve('./media'); // Watch root media folder with user subdirectories
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const DEPLOYER_KEY = 'YOUR_PRIVATE_KEY_FOR_POSTING';
const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
const postContract = new ethers.Contract(contracts.PostContract, PostContractAbi.abi, wallet);
const ipfs = create({ url: 'http://127.0.0.1:5001' });

// Set to keep track of uploaded files
const uploadedFiles = new Set();

// 🔓 Decrypt buffer with AES-256-CBC
function decryptBuffer(encryptedHex, ivHex) {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    throw new Error(`Failed to decrypt file: ${error.message}`);
  }
}

// 📂 Extract wallet address from file path
function getWalletFromPath(filePath) {
  const relativePath = path.relative(MEDIA_DIR, filePath);
  const walletAddress = relativePath.split(path.sep)[0];
  
  // Basic validation for Ethereum address format
  if (walletAddress && walletAddress.length === 42 && walletAddress.startsWith('0x')) {
    return walletAddress.toLowerCase(); // Normalize to lowercase
  }
  
  return null;
}

// 🎯 Check if file is in a user's encrypted folder
function isUserMediaFile(filePath) {
  const wallet = getWalletFromPath(filePath);
  return wallet !== null;
}

// 🔍 Read and parse encrypted file
function readEncryptedFile(filePath) {
  try {
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(encryptedData);
    
    // Validate required fields
    if (!parsed.iv || !parsed.data || !parsed.wallet) {
      throw new Error('Invalid encrypted file format');
    }
    
    return parsed;
  } catch (error) {
    console.error(`❌ Failed to read encrypted file ${filePath}:`, error.message);
    throw error;
  }
}

// 🚀 Main file processing function
async function processNewFile(filePath) {
  try {
    if (uploadedFiles.has(filePath)) {
      console.log('⚠️ Already processed:', filePath);
      return;
    }

    // Skip if not in user media folder
    if (!isUserMediaFile(filePath)) {
      console.log('⚠️ Skipping non-user file:', filePath);
      return;
    }

    uploadedFiles.add(filePath);
    
    const walletAddress = getWalletFromPath(filePath);
    console.log(`🆕 New encrypted media file: ${walletAddress}/${path.basename(filePath)}`);

    // 📖 Read and parse encrypted file
    const encryptedFile = readEncryptedFile(filePath);
    
    console.log(`🔓 Decrypting file for wallet: ${encryptedFile.wallet}`);
    
    // 🔓 Decrypt the file content
    const decryptedBuffer = decryptBuffer(encryptedFile.data, encryptedFile.iv);
    
    console.log(`📤 Uploading decrypted file to IPFS (${decryptedBuffer.length} bytes)`);
    
    // 📤 Upload decrypted buffer to IPFS
    const result = await ipfs.add(decryptedBuffer);
    const cid = result.cid.toString();
    
    console.log('✅ Uploaded to IPFS:', cid);

    // 🔗 Create post onchain with the IPFS CID
    // Note: We'll use the file owner's wallet address for the post
    const tx = await postContract.createPost(cid);
    await tx.wait();
    
    console.log(`✅ Post created onchain for wallet ${encryptedFile.wallet}: ${cid}`);
    console.log(`📁 Original filename: ${encryptedFile.originalName}`);

  } catch (error) {
    console.error('❌ Error processing file:', filePath);
    console.error('❌ Error details:', error.message);
    
    // Remove from uploaded set so it can be retried
    uploadedFiles.delete(filePath);
  }
}

// 👀 Watch for new files in user directories
console.log(`👀 Watching for encrypted media files in: ${MEDIA_DIR}`);
console.log('🔐 Decryption enabled for user-specific folders');

// Watch all subdirectories (user wallet folders) for new files
chokidar.watch(MEDIA_DIR, { 
  ignoreInitial: true,
  depth: 2, // Watch user folders but not deeper
  ignored: /(^|[\/\\])\../ // Ignore hidden files
}).on('add', processNewFile);

// 🚀 Startup message
console.log('🎬 Media watcher started successfully!');
console.log('💡 Ready to process encrypted media uploads...');