#!/bin/bash
set -e
exec > >(tee -a /var/log/travel-crm-deploy.log | logger -t redeploy -s 2>/dev/console) 2>&1

echo "=== Redeploy started at $(date) ==="

IMDS_TOKEN=$(curl -s -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" http://169.254.169.254/latest/api/token)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
PUBLIC_IP_VAR=$(curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
APP_DIR=/home/ec2-user/travel-crm

# Wait for initial bootstrap to finish (only relevant on very first deploy)
WAIT=0
while [ ! -f /home/ec2-user/.userdata-complete ] && [ $WAIT -lt 60 ]; do
  echo "Waiting for initial bootstrap... ($WAIT/60)"
  sleep 30
  WAIT=$((WAIT + 1))
done

cd "$APP_DIR"

# Re-read secrets from SSM (picks up any secret changes too)
echo "Refreshing secrets from SSM..."
DB_PASSWORD=$(aws ssm get-parameter --name /travel-crm/db-password  --query Parameter.Value --output text --region $REGION)
JWT_SECRET=$(aws ssm get-parameter  --name /travel-crm/jwt-secret   --query Parameter.Value --output text --region $REGION)
EMAIL_USER=$(aws ssm get-parameter  --name /travel-crm/email-user   --query Parameter.Value --output text --region $REGION)
EMAIL_PASS=$(aws ssm get-parameter  --name /travel-crm/email-pass   --query Parameter.Value --output text --region $REGION)
PUBLIC_IP=$PUBLIC_IP_VAR

# Pull latest code (repo is public)
echo "Pulling latest code..."
git remote set-url origin https://github.com/Cyberamit007/travel-crm.git
git pull origin master

printf 'DB_PASSWORD=%s\n'             "$DB_PASSWORD"  >  "$APP_DIR/.env"
printf 'SERVER_IP=%s\n'               "$PUBLIC_IP"    >> "$APP_DIR/.env"
printf 'JWT_SECRET=%s\n'              "$JWT_SECRET"   >> "$APP_DIR/.env"
printf 'EMAIL_HOST=smtp.gmail.com\n'                  >> "$APP_DIR/.env"
printf 'EMAIL_PORT=587\n'                             >> "$APP_DIR/.env"
printf 'EMAIL_USER=%s\n'              "$EMAIL_USER"   >> "$APP_DIR/.env"
printf 'EMAIL_PASS=%s\n'              "$EMAIL_PASS"   >> "$APP_DIR/.env"
printf 'EMAIL_FROM=Travel CRM <%s>\n' "$EMAIL_USER"  >> "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# Rebuild frontend
echo "Building frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

# Restart containers
echo "Restarting containers..."
cd "$APP_DIR"
docker compose up -d --build

# Run any pending migrations
echo "Running DB migrations..."
sleep 15
docker compose exec -T backend npx prisma db push

echo "=== Redeploy complete at $(date) ==="
echo "App running at http://$PUBLIC_IP"
