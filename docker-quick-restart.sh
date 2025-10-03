#!/bin/bash

# Quick Docker Restart Script - Just restart containers without rebuilding
# Use this for quick restarts when code hasn't changed significantly

echo "🔄 Quick restart - stopping containers..."
docker compose stop

echo "🚀 Starting containers..."
docker compose start

echo "✅ Quick restart complete!"
echo "📱 Application should be available at http://localhost:3007"
echo ""
echo "📊 Container status:"
docker ps | grep react-mediapipe-face-mesh