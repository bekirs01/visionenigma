@echo off
chcp 65001 >nul
echo ==========================================
echo   VisionEnigma Support MVP - Setup
echo ==========================================
echo.

:: Root .env yoksa .env.example'dan kopyala (gizli değer yazılmaz)
if not exist ".env" (
    echo [1/4] .env bulunamadi, .env.example kopyalaniyor...
    copy .env.example .env >nul
    echo [OK] .env olusturuldu. OPENAI_API_KEY ve diger degerleri .env icinde duzenleyin.
) else (
    echo [!] .env zaten mevcut
)

echo.
echo [2/4] Backend bagimliliklari yukleniyor...
cd backend
pip install -r requirements.txt -q
cd ..

echo.
echo [3/4] Frontend bagimliliklari yukleniyor...
cd frontend
call npm install --silent
cd ..

echo.
echo ==========================================
echo   Kurulum tamamlandi
echo ==========================================
echo.
echo Calistirmak icin iki terminalde:
echo.
echo   Terminal 1: cd backend ^&^& python -m uvicorn app.main:app --reload --port 8000
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Tarayicida: http://localhost:3000
echo.
echo AI ozelligi icin .env dosyasinda OPENAI_API_KEY tanimlayin.
echo.
pause
