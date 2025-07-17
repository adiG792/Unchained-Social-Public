#!/bin/bash

set -e  # Stop on error

echo "=== Cleaning root project (Hardhat) ==="
rm -rf node_modules
rm -f package-lock.json yarn.lock
rm -rf cache
echo "Installing dependencies in root..."
npm install

echo ""
echo "=== Cleaning frontend (Next.js React) ==="
cd frontend
rm -rf node_modules
rm -f package-lock.json yarn.lock
rm -rf .next
echo "Installing dependencies in frontend..."
npm install
cd ..

echo ""
echo "=== Running checks ==="

echo ""
echo "=> Hardhat version:"
npx hardhat --version || echo "Hardhat not installed properly!"

echo ""
echo "=> Next.js version:"
cd frontend
npx next --version || echo "Next.js not installed properly!"
cd ..

echo ""
echo "=== ALL DONE 🚀 ==="
echo "You can now run:"