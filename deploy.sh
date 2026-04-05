#!/bin/bash
set -e

echo "🚀 Wasiyati Deployment Script"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check node
node --version || { echo -e "${RED}❌ Node.js not found${NC}"; exit 1; }

echo -e "${GREEN}✅ Node.js found${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo ""
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Push schema to Neon
echo ""
echo "🗄️  Pushing schema to database..."
npx prisma db push

echo ""
echo -e "${GREEN}✅ Database schema created!${NC}"

# Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy
vercel deploy --prod \
  --yes \
  --env DATABASE_URL="$DATABASE_URL" \
  --env DATABASE_URL_UNPOOLED="$DATABASE_URL_UNPOOLED" \
  --env NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --env NEXTAUTH_URL="$NEXTAUTH_URL" \
  --env GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  --env GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --env NEXT_PUBLIC_APP_URL="$NEXTAUTH_URL" \
  --env NEXT_PUBLIC_APP_NAME="وصيتي" \
  --env CRON_SECRET="$CRON_SECRET" \
  --env ADMIN_EMAILS="$ADMIN_EMAILS"

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Add your email as admin in Neon SQL Editor:"
echo "   UPDATE \"User\" SET role = 'ADMIN' WHERE email = '$ADMIN_EMAILS';"
echo "2. Set up Google OAuth redirect URI in Google Cloud Console"
