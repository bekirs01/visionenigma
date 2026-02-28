#!/bin/bash
# Backend (8000) ve Frontend (3000) üzerinde çalışan süreçleri kapatır.
set -e
cd "$(dirname "$0")"

echo "=============================================="
echo "  Backend + Frontend kapatılıyor"
echo "=============================================="

CLOSED=0

# Port 8000 (backend)
if lsof -ti:8000 >/dev/null 2>&1; then
  echo "[1/2] Port 8000 (backend) kapatılıyor..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  CLOSED=1
  sleep 1
else
  echo "[1/2] Port 8000 zaten boş."
fi

# Port 3000 (frontend)
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "[2/2] Port 3000 (frontend) kapatılıyor..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  CLOSED=1
  sleep 1
else
  echo "[2/2] Port 3000 zaten boş."
fi

echo ""
if [ "$CLOSED" -eq 1 ]; then
  echo "Backend ve frontend kapatıldı."
else
  echo "Açık süreç yoktu."
fi
echo "=============================================="
