#!/bin/bash

# Script to start the HR Chat Companion server
echo "🚀 Starting HR Chat Companion Server..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with your OPENAI_API_KEY"
    echo "Example:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo "PORT=3000"
    exit 1
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=" .env; then
    echo "❌ OPENAI_API_KEY not found in .env file!"
    exit 1
fi

# Start the server
echo "✅ Configuration found. Starting server..."
node server.js

