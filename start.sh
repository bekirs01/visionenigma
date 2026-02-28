#!/bin/bash
# Backend + Frontend tek komutla başlatır. Bu penceresi kapatmayın.
set -e
cd "$(dirname "$0")"

echo "=============================================="
echo "  Support MVP — Backend + Frontend"
echo "=============================================="

# Port 8000 boşalt
if lsof -ti:8000 >/dev/null 2>&1; then
  echo "[1/5] Port 8000 kapatılıyor..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  sleep 2
fi
# Port 3000 boşalt (frontend tek portta başlasın)
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "[1/5] Port 3000 kapatılıyor..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Backend venv kontrolü
if [ ! -f backend/venv/bin/python ]; then
  echo "Hata: backend/venv yok. Önce: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
  exit 1
fi

echo "[2/5] Backend başlatılıyor (http://localhost:8000)..."
cd backend
# .env'deki DATABASE_URL kullanılır (Supabase). SQLite istersen: export USE_SQLITE=1
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "[3/5] Backend sağlık kontrolü (en fazla 15 sn)..."
for i in $(seq 1 15); do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/health | grep -q 200; then
    echo "      Backend hazır."
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "Uyarı: Backend 15 sn içinde yanıt vermedi. Sayfayı biraz sonra yenileyin."
  fi
  sleep 1
done

echo "[4/5] Frontend başlatılıyor (http://localhost:3000)..."
echo ""
echo "  Backend:  http://localhost:8000   (API + /health)"
echo "  Frontend: http://localhost:3000   (Tarayıcıda bu adresi açın)"
echo "  Bu penceresi KAPATMAYIN."
echo "=============================================="
echo ""

cleanup() {
  echo ""
  echo "Kapatılıyor..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

cd frontend
npm run dev
