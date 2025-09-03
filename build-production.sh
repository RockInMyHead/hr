#!/bin/bash

# Production build script for HR Chat Companion
echo "🚀 Building production version..."

# Set production environment variables
export VITE_API_URL=https://talti.ru
export VITE_OPENAI_MODEL=gpt-4o-mini
export VITE_APP_NAME="HR Chat Companion"
export VITE_APP_VERSION="1.0.0"

# Clean previous build
rm -rf dist

# Build production version
npm run build

echo "✅ Production build completed!"
echo "📁 Build files are in the 'dist' directory"
echo "🌐 API URL set to: $VITE_API_URL"
echo ""
echo "📋 Next steps:"
echo "1. Upload 'dist' folder to your server talti.ru"
echo "2. Make sure backend server.js is running on talti.ru"
echo "3. Set OPENAI_API_KEY in your server environment"
