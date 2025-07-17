#!/bin/bash

echo "🔁 Restarting all PM2 services..."

# Start Frontend
pm2 start npm --name frontend -- run dev --cwd /home/YOUR_USERNAME/Unchained-Social-Public/frontend

# Start Hardhat
# pm2 start npx --name hardhat -- run hardhat node --cwd /home/YOUR_USERNAME/Unchained-Social-Public/contracts

# Start IPFS Daemon
pm2 start ipfs --name ipfs -- daemon

# Start Media Watcher (make sure it works!)
pm2 start node --name mediawatcher /home/YOUR_USERNAME/Unchained-Social-Public/media-watcher/post_watcher.mjs

# Start Tailscale Funnel (ensure tailscale is running first)
pm2 start tailscale --name tailscale-funnel -- serve 3000

# Save process list for reboot
pm2 save

echo "✅ All services launched via PM2."
