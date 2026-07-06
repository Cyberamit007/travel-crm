#!/bin/bash
set -e

echo "=== Travel CRM Deploy Script ==="

# 1. Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  sudo yum update -y
  sudo yum install -y docker git
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker ec2-user
  echo "Docker installed. NOTE: Log out and back in, then re-run this script."
  exit 0
fi

# 2. Install Docker Compose
if ! command -v docker compose &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL https://github.com/docker/compose/releases/download/v2.29.1/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# 3. Install Node.js (for building frontend)
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs
fi

# 4. Set up swap (important for t2.micro with 1GB RAM)
if [ ! -f /swapfile ]; then
  echo "Setting up 2GB swap..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 5. Clone or pull repo
REPO_DIR="/home/ec2-user/travel-crm"
if [ ! -d "$REPO_DIR" ]; then
  echo "Cloning repo..."
  git clone https://github.com/Cyberamit007/travel-crm.git "$REPO_DIR"
else
  echo "Pulling latest code..."
  cd "$REPO_DIR" && git pull
fi

cd "$REPO_DIR"

# 6. Build React frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 7. Start containers
echo "Starting containers..."
docker compose down --remove-orphans || true
docker compose up -d --build

# 8. Wait for DB and run migrations
echo "Waiting for database..."
sleep 10
docker compose exec backend npx prisma db push

echo ""
echo "=== Deployment complete ==="
echo "App running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
