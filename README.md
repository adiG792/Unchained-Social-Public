# Unchained Social v0.2.0-alpha

A fully onchain, self-hosted decentralized social media application. Powered by Ethereum smart contracts, IPFS, and a local Raspberry Pi or server.

---

## 🔧 Features

### Smart Contracts
- **PostContract**: Create and store posts (IPFS hashes)
- **SocialToken**: ERC-20 SOC token for tipping

### Frontend (Next.js)
- Connect MetaMask wallet
- Submit and view posts
- Upload media files and generate IPFS hashes
- Airdrop SOC tokens (Hardhat only)
- Tip authors using SOC

### Media Automation
- Auto-watch media folder
- Upload to IPFS
- Call smart contract to create post

### Infrastructure
- Raspberry Pi or Linux server
- Hardhat local node
- IPFS daemon
- PM2 for auto-booting services
- Tailscale for secure access (Serve + Funnel supported)

---

## 📁 Directory Structure

```bash
unchained-social/
├── frontend/                # Next.js frontend
│   ├── components/
│   ├── pages/
│   ├── abis/
│   ├── src/contracts.json  # Deployed contract addresses
│   └── public/media/       # Media folder watched for uploads
├── contracts/              # Hardhat smart contracts
├── media-watcher/          # Auto-upload + post watcher
├── systemd/                # (Optional) systemd service files
├── .env.example            # Environment variable template
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/yourname/unchained-social.git
cd unchained-social
```

### 2. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Contracts
cd ../contracts
npm install

# Media Watcher
cd ../media-watcher
npm install
```

---

## ⚙️ Local Blockchain

### Start Hardhat Node

```bash
npx hardhat node --hostname 0.0.0.0
```

### Deploy Contracts

```bash
npx hardhat run scripts/deploy1.js --network localhost
```

---

## 🔗 Start IPFS

```bash
ipfs daemon
```

---

## 🌐 Start Frontend (Next.js)

```bash
cd frontend
npm run dev
```

- Access locally: `http://<PI-IP>:3000`
- Access via Tailscale Funnel: `https://<TAILSCALE>.ts.net`

---

## 🤖 Start Media Watcher

```bash
cd media-watcher
node post_watcher.mjs
```

---

## 🔄 PM2 Boot Setup

### Install PM2
```bash
npm install -g pm2
```

### Start Services
```bash
# Hardhat
pm2 start "npx" --name hardhat -- hardhat node --hostname 0.0.0.0 --cwd ./contracts

# IPFS
pm2 start ipfs --name ipfs -- daemon

# Frontend
pm2 start npm --name frontend -- run dev --cwd ./frontend

# Watcher
pm2 start node --name watcher -- ./post_watcher.mjs --cwd ./media-watcher

# Optional: Funnel
pm2 start tailscale --name funnel -- funnel 3000

# Save for boot
pm2 save
```

---

## 📱 Mobile Access

- Install **MetaMask Mobile**
- Open the **in-app browser**
- Visit your Tailscale Funnel URL
- Connect wallet and use the dApp

---

## 🔐 Notes

- Only works on local Hardhat unless deployed to a testnet
- Be sure to update deployed contract addresses in `frontend/src/contracts.json`
- Optionally, use `.env` to define `NEXT_PUBLIC_HARDHAT_RPC`

---

## ✅ Version 0.2.0-alpha Summary

- Local blockchain + IPFS
- Fully functional Next.js frontend
- Wallet connect, post creation, tipping, airdrop
- Media folder auto-watching and post creation
- Remote and public access via Tailscale

---

## 🧭 Next Goals (v0.3.0+)

- Full media upload UI → IPFS → AutoPost
- Off-chain metadata
- Onchain likes/comments
- Deploy to Sepolia/Testnet
- Better mobile wallet support

---

Enjoy your decentralized journey 🌍✊

**— Built by Aditya Gupta**