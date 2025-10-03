#!/bin/bash

# Docker Restart Script - Stop, Clean, and Rebuild
# This script stops containers, removes images, and rebuilds everything fresh

echo "🛑 Stopping all containers..."
docker compose down

echo "🧹 Removing containers, networks, and volumes..."
docker compose down -v --remove-orphans

echo "🗑️  Removing the application image..."
docker rmi react-face-mesh-demo-react-face-mesh -f 2>/dev/null || true

echo "🔧 Pruning Docker system (removing unused data)..."
docker system prune -f

echo "🏗️  Building fresh image..."
docker compose build --no-cache

echo "🚀 Starting containers..."
docker compose up -d

echo "✅ Docker restart complete!"
echo "📱 Application should be available at http://localhost:3007"
echo ""
echo "📊 Container status:"
docker ps | grep react-mediapipe-face-mesh

echo ""
echo "📜 To view logs, run: docker compose logs -f"