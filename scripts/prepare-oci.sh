#!/usr/bin/env bash
set -euo pipefail

# Run once on a fresh Ubuntu 22.04 OCI VM as ubuntu (the deploy workflow
# assumes Docker is already available and /opt/forma-studio exists).
sudo apt-get update
sudo apt-get install -y ca-certificates curl ufw util-linux

if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo 'Log out and back in once so the docker group is active.'
fi

sudo install -d -m 0750 -o "$USER" -g "$USER" /opt/forma-studio /opt/backups
sudo ufw default deny incoming
sudo ufw default allow outgoing
echo 'Set SSH_SOURCE to your fixed IP before enabling UFW.'
if [[ -n "${SSH_SOURCE:-}" ]]; then
  sudo ufw allow from "$SSH_SOURCE" to any port 22 proto tcp
fi
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
docker compose version
free -h
