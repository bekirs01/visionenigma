#!/bin/bash
echo "=========================================="
echo "  VisionEnigma Support MVP - Setup"
echo "=========================================="
echo

# Root .env yoksa .env.example'dan kopyala (gizli değer yazılmaz)
if [ ! -f ".env" ]; then
    echo "[1/4] .env bulunamadı, .env.example kopyalanıyor..."
    cp .env.example .env
    echo "[OK] .env oluşturuldu. OPENAI_API_KEY ve diğer değerleri .env içinde düzenleyin."
else
    echo "[!] .env zaten mevcut"
fi

echo
echo "[2/4] Backend bağımlılıkları yükleniyor..."
cd backend
pip install -r requirements.txt -q
cd ..

echo
echo "[3/4] Frontend bağımlılıkları yükleniyor..."
cd frontend
npm install --silent
cd ..

echo
echo "=========================================="
echo "  Kurulum tamamlandı"
echo "=========================================="
echo
echo "Çalıştırmak için iki terminalde:"
echo
echo "  Terminal 1: cd backend && python -m uvicorn app.main:app --reload --port 8000"
echo "  Terminal 2: cd frontend && npm run dev"
echo
echo "Tarayıcıda: http://localhost:3000"
echo
echo "AI özelliği için .env dosyasında OPENAI_API_KEY tanımlayın."
echo
