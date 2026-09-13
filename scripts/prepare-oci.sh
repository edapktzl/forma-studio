#!/usr/bin/env bash
set -euo pipefail

# Run as the SSH deploy user on Ubuntu. Preserve an SSH allow rule before
# enabling UFW; do not replace the VM's existing firewall policy.
deploy_user="${SUDO_USER:-$(id -un)}"
ssh_source="${SSH_SOURCE:-${SSH_CONNECTION-}}"
ssh_source="${ssh_source%% *}"
if [[ -z "$ssh_source" ]]; then
  echo 'Set SSH_SOURCE to your IP/CIDR before running this script.' >&2
  exit 1
fi
python3 -c 'import ipaddress, sys; ipaddress.ip_network(sys.argv[1], strict=False)' "$ssh_source"

sudo apt-get update
sudo apt-get install -y ca-certificates curl ufw util-linux

if ! swapon --show=NAME --noheadings | grep -Fxq '/swapfile'; then
  if [[ ! -e /swapfile ]]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  elif [[ "$(sudo blkid -s TYPE -o value /swapfile)" != swap ]]; then
    echo 'Existing /swapfile is not a swap file; inspect it before continuing.' >&2
    exit 1
  fi
  sudo chmod 600 /swapfile
  sudo swapon /swapfile
fi
if ! grep -Eq '^[[:space:]]*/swapfile[[:space:]]' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

if ! command -v docker >/dev/null 2>&1 || ! sudo docker compose version >/dev/null 2>&1; then
  # Docker's official signed Ubuntu apt repository, including the Compose plugin.
  . /etc/os-release
  if [[ "$ID" != ubuntu ]]; then
    echo 'This preparation script supports Ubuntu only.' >&2
    exit 1
  fi
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' \
    "$(dpkg --print-architecture)" "$VERSION_CODENAME" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
sudo systemctl enable --now docker
sudo usermod -aG docker "$deploy_user"
sudo install -d -m 0750 -o "$deploy_user" -g "$(id -gn "$deploy_user")" /opt/forma-studio /opt/backups

# Hosted GitHub runners need a separate permitted SSH source policy; do not
# remove existing SSH rules here. See docs/deployment.md.
sudo ufw allow from "$ssh_source" to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw --force enable
sudo ufw status verbose
sudo docker compose version
free -h
echo 'Keep this SSH session open and test a second login. Log in again to use the Docker group.'
