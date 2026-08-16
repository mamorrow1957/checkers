#!/bin/bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sudo mkdir -p /var/www/html

if sudo test -n "$(sudo ls -A /var/www/html 2>/dev/null)"; then
  backup="/var/www/html.backup.$(date +%Y%m%d_%H%M%S)"
  echo "Backing up /var/www/html to ${backup}..."
  sudo cp -a /var/www/html "${backup}"
  echo "Backup complete."
fi

echo "Copying ${SOURCE_DIR} to /var/www/html..."
sudo rsync -av --delete --delete-excluded \
  --exclude='.git' \
  --exclude='.DS_Store' \
  --exclude='.claude' \
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='playwright.config.js' \
  --exclude='*.md' \
  "${SOURCE_DIR}/" /var/www/html/
echo "Done."
