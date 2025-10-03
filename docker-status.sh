#!/bin/bash

# Docker Status Script - Check container status and logs

echo "📊 Container Status:"
echo "==================="
docker compose ps
echo ""

echo "🔍 Container Details:"
echo "===================="
docker ps --filter "name=react-mediapipe-face-mesh" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "💾 Image Information:"
echo "===================="
docker images | grep react-face-mesh-demo
echo ""

echo "📜 Recent Logs (last 20 lines):"
echo "=============================="
docker compose logs --tail=20
echo ""

echo "💡 Useful commands:"
echo "=================="
echo "- View live logs:        docker compose logs -f"
echo "- Stop containers:       docker compose stop"
echo "- Start containers:      docker compose start"
echo "- Rebuild and restart:   ./docker-restart.sh"
echo "- Quick restart:         ./docker-quick-restart.sh"