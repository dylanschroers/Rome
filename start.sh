#!/bin/bash

# Rome Project - Quick Start Script

echo "🏛️  Rome Project - Server Startup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected ($(node --version))"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in Rome-Server"
    echo "   Make sure to run this from Rome-Server directory or Rome root"
    exit 1
fi

echo ""
echo "⚠️  Make sure Ollama is running on http://localhost:11434"
echo ""
echo "Starting Rome-Server..."
echo ""

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
npm start

