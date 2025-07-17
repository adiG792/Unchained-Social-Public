#!/bin/bash
echo "Checking for changes..."
if [ -n "$(git status --porcelain)" ]; then
  echo "Changes found. Adding, committing, and pushing..."
  git add .
  git commit -m "Manual commit from Pi at $(date)"
  git push origin main
  echo "Push complete."
else
  echo "No changes to commit."
fi
