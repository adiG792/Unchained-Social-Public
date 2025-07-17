#!/bin/bash

echo "🕒 Pulling latest changes at $(date)" | tee -a pull.log
git pull origin main 2>&1 | tee -a pull.log
pm2 restart all 2>&1 | tee -a pull.log
echo "✅ Pull complete and app restarted." | tee -a pull.log
