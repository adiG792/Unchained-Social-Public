# Unchained Social v0.3alpha - Complete Setup Instructions

## Project Overview

**Goal**: Create a fully decentralized, self-hosted social media platform where users can:
- Post content with media files stored on IPFS
- Interact with posts through likes and comments
- Share stories (similar to Instagram/WhatsApp stories)
- Tip content creators using SOC (Social Token - ERC20)
- Maintain complete data ownership and privacy

**Technology Stack**:
- **Smart Contracts**: Solidity (PostContract for posts, SocialToken for tipping)
- **Frontend**: Next.js with React, TailwindCSS, Material-UI
- **Storage**: IPFS for decentralized media storage
- **Blockchain**: Ethereum Sepolia Testnet
- **Infrastructure**: PM2 for process management, Tailscale for networking

## Prerequisites

1. **Node.js** (v18 or higher): `sudo apt update && sudo apt install nodejs npm`
2. **Git**: `sudo apt install git`
3. **IPFS**: Follow installation guide at https://docs.ipfs.tech/install/
4. **PM2**: `sudo npm install -g pm2`
5. **Tailscale**: `curl -fsSL https://tailscale.com/install.sh | sh`

## Step-by-Step Setup

### Step 1: Initial Installation
```bash
# Clone this repository
git clone [YOUR_GITHUB_REPO_URL]
cd Unchained-Social-Public

# Run the automated clean install script
chmod +x clean-install-full.sh
./clean-install-full.sh
```

### Step 2: Configure Tailscale
```bash
# Start Tailscale and authenticate
sudo tailscale up

# Note your Tailscale IP address (you'll need this for configuration)
tailscale ip -4
```

### Step 3: Get Sepolia Testnet Requirements

1. **Create Infura Account**:
   - Go to https://infura.io/ and create a free account
   - Create a new project and get your Project ID

2. **Get Sepolia ETH**:
   - Visit https://sepoliafaucet.com/ or https://faucet.sepolia.dev/
   - Request testnet ETH for your wallet address

3. **Export MetaMask Private Key**:
   - In MetaMask, go to Account Details → Export Private Key
   - **⚠️ NEVER share this key or commit it to version control**

### Step 4: Configure Environment Variables

**CRITICAL**: Replace ALL placeholder values with your actual configuration:

#### 4.1 Root Directory `.env` file:
```bash
# Replace with your actual values:
ENCRYPTION_KEY=YOUR_32_CHARACTER_ENCRYPTION_KEY_HERE
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=YOUR_SEPOLIA_PRIVATE_KEY_WITHOUT_0x_PREFIX
```

#### 4.2 Root Directory `.env.local` file:
```bash
# Replace with your Infura project ID:
NEXT_PUBLIC_HARDHAT_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
```

#### 4.3 Frontend `.env.local` file:
```bash
# Replace with your actual values:
ENCRYPTION_KEY=YOUR_32_CHARACTER_ENCRYPTION_KEY_HERE
NEXT_PUBLIC_BACKEND_API=http://YOUR_TAILSCALE_IP:3001
```

### Step 5: Update Configuration Files

#### 5.1 Update `frontend/username-indexer.js` (Line 14):
```javascript
const PROVIDER_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID";
```

#### 5.2 Update `ecosystem.config.js` (Lines 5 and 18):
```javascript
cwd: '/home/YOUR_USERNAME/Unchained-Social-Public/frontend',
script: '/home/YOUR_USERNAME/Unchained-Social-Public/media-watcher/post_watcher.mjs'
```

#### 5.3 Update `start-pm2.sh` (Lines 6, 9, and 15):
```bash
# Replace with your actual paths:
--cwd /home/YOUR_USERNAME/Unchained-Social-Public/frontend
--cwd /home/YOUR_USERNAME/Unchained-Social-Public/contracts
/home/YOUR_USERNAME/Unchained-Social-Public/media-watcher/post_watcher.mjs
```

### Step 6: Deploy Smart Contracts to Sepolia

```bash
# Deploy smart contracts to Sepolia testnet
npx hardhat run scripts/deploy1.js --network sepolia

# Verify deployment was successful
# Contract addresses will be written to frontend/src/contracts.json
```

### Step 7: Update Private Keys for Media Watcher (Optional)

If you want to use the media watcher for automatic posting:

#### 7.1 Update `autoPost.js` (Line 12):
```javascript
const DEPLOYER_PRIVATE_KEY = 'YOUR_PRIVATE_KEY_FOR_POSTING';
```

#### 7.2 Update `media-watcher/post_watcher.mjs` (Line 30):
```javascript
const DEPLOYER_KEY = 'YOUR_PRIVATE_KEY_FOR_POSTING';
```

### Step 8: Start Services

```bash
# Terminal 1: Start IPFS daemon
ipfs daemon

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start username indexer (optional)
cd frontend
node username-indexer.js

# Terminal 4: Start media watcher (optional)
cd media-watcher
node post_watcher.mjs
```

### Step 9: MetaMask Configuration

#### Desktop Setup:
1. **Install MetaMask**: Download from https://metamask.io/
2. **Sepolia Network** (should be pre-configured):
   - Network Name: `Sepolia test network`
   - RPC URL: `https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID`
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`

#### Mobile Setup:
1. **Install MetaMask Mobile** from your app store
2. **Import same account** as desktop
3. **Access via in-app browser**: Navigate to `https://[YOUR_TAILSCALE_HOSTNAME].ts.net`

### Step 10: Tailscale Funnel (Optional - for external access)
```bash
# Enable Tailscale funnel for port 3000
tailscale funnel 3000
```

### Step 11: PM2 Auto-Start (Optional)
```bash
# After updating all paths in ecosystem.config.js
pm2 start ecosystem.config.js

# Save configuration for auto-start
pm2 save
pm2 startup
```

## Accessing the Application

- **Local Access**: `http://YOUR_TAILSCALE_IP:3000`
- **Tailscale Funnel**: `https://[YOUR_TAILSCALE_HOSTNAME].ts.net`
- **Mobile**: Use MetaMask mobile browser with the funnel URL

## Key Features to Test

1. **Wallet Connection**: Click "Connect Wallet" and authorize MetaMask
2. **Post Creation**: Create posts with text and media uploads
3. **Story Sharing**: Share temporary stories that expire after 24 hours
4. **Real Testnet Interaction**: All transactions happen on Sepolia testnet
5. **Media Upload**: Upload images/videos that get stored on IPFS
6. **User Profiles**: View user profiles and post history
7. **Blockchain Verification**: View transactions on https://sepolia.etherscan.io

## Complete Placeholder Reference

### Environment Variables:
- `YOUR_32_CHARACTER_ENCRYPTION_KEY_HERE` - Generate a 32-character random string
- `YOUR_INFURA_PROJECT_ID` - From your Infura dashboard
- `YOUR_SEPOLIA_PRIVATE_KEY_WITHOUT_0x_PREFIX` - Your MetaMask private key without 0x
- `YOUR_TAILSCALE_IP` - Your Tailscale IP address (run `tailscale ip -4`)

### File Paths:
- `YOUR_USERNAME` - Your system username (e.g., `pi`, `ubuntu`, etc.)
- `YOUR_GITHUB_REPO_URL` - The URL of your GitHub repository

### Contract Addresses:
- `YOUR_DEPLOYED_POST_CONTRACT_ADDRESS` - Automatically filled after deployment
- `YOUR_DEPLOYED_SOCIAL_TOKEN_ADDRESS` - Automatically filled after deployment

### Optional Private Keys:
- `YOUR_PRIVATE_KEY_FOR_POSTING` - Private key for automated posting (can be same as Sepolia key)
- `YOUR_LOCAL_DEVELOPMENT_PRIVATE_KEY` - Only needed for local Hardhat development

## Security Notes

- **Never commit private keys** to version control
- **Keep your `.env` files secure** and never share them
- **Use different private keys** for different environments if possible
- **The current setup uses Sepolia testnet** - transactions have no real value
- **All media files are encrypted** before storage

## Troubleshooting

1. **Contract Deployment Issues**: Ensure you have enough Sepolia ETH and correct RPC URL
2. **MetaMask Connection**: Make sure you're on Sepolia network
3. **Transaction Failures**: Check Sepolia ETH balance and gas prices
4. **IPFS Issues**: Restart IPFS daemon with `ipfs daemon`
5. **Path Issues**: Ensure all absolute paths match your system setup

## Important Notes

- **Real Testnet**: Uses Sepolia testnet, so transactions are permanent but have no real value
- **Gas Fees**: You need Sepolia ETH for all transactions
- **Media Storage**: Files are encrypted and stored on IPFS
- **Contract Addresses**: Updated automatically after deployment
- **No Token Airdrop**: Unlike local development, you cannot mint tokens arbitrarily

---

**Built by Aditya Gupta**