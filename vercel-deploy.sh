#!/bin/bash

# Vercel deployment script for HR Chat Companion
echo "🚀 Deploying HR Chat Companion to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login:"
    vercel login
fi

# Set environment variables for deployment
echo "⚙️ Setting up environment variables..."
export VITE_API_URL=https://your-project-name.vercel.app
export OPENAI_API_KEY=your_openai_api_key_here

# Deploy to Vercel
echo "📦 Deploying to Vercel..."
vercel --prod

# Get the deployment URL
DEPLOY_URL=$(vercel ls | grep -E "https://.*\.vercel\.app" | head -1 | awk '{print $2}')

if [ ! -z "$DEPLOY_URL" ]; then
    echo "✅ Successfully deployed to: $DEPLOY_URL"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set OPENAI_API_KEY in Vercel dashboard: https://vercel.com/dashboard"
    echo "2. Update VITE_API_URL in your local .env file to: $DEPLOY_URL"
    echo "3. Test the application at: $DEPLOY_URL"
else
    echo "⚠️ Deployment may have succeeded, but couldn't get the URL automatically"
    echo "Check your Vercel dashboard: https://vercel.com/dashboard"
fi
