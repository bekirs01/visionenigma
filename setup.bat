@echo off
chcp 65001 >nul
echo ==========================================
echo   VisionEnigma Support MVP - Setup
echo ==========================================
echo.

:: Check if .env exists
if exist "backend\.env" (
    echo [!] backend\.env already exists
    set /p OVERWRITE="Overwrite? (y/n): "
    if /i not "%OVERWRITE%"=="y" goto :DEPS
)

:: Create .env
echo [1/4] Creating backend\.env...
(
echo DATABASE_URL=postgresql://postgres.fmupjxthdraqogfeokyj:Enigma2026Hack@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
echo AI_PROVIDER=openai
echo EMAIL_MODE=smtp
echo ADMIN_ACCESS_CODE=admin123
echo OPENAI_MODEL=gpt-4o-mini
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=465
) > backend\.env

:: Ask for OpenAI key
echo.
echo === OpenAI API Key ===
set /p OPENAI_KEY="Enter OpenAI API key: "
if not "%OPENAI_KEY%"=="" (
    echo OPENAI_API_KEY=%OPENAI_KEY%>> backend\.env
    echo [OK] OpenAI key added
) else (
    echo OPENAI_API_KEY=>> backend\.env
    echo [!] Warning: AI features will not work without API key
)

:: Ask for Gmail credentials
echo.
echo === Gmail SMTP (for sending replies) ===
set /p SMTP_USER="Enter Gmail address: "
set /p SMTP_PASS="Enter Gmail App Password (16 chars, no spaces): "
echo SMTP_USER=%SMTP_USER%>> backend\.env
echo SMTP_PASS=%SMTP_PASS%>> backend\.env
echo SMTP_FROM=%SMTP_USER%>> backend\.env
echo [OK] Gmail SMTP configured

:DEPS
:: Install dependencies
echo.
echo [2/4] Installing backend dependencies...
cd backend
pip install -r requirements.txt -q
cd ..

echo.
echo [3/4] Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo To start the project, run in two terminals:
echo.
echo   Terminal 1: cd backend ^&^& python -m uvicorn app.main:app --reload --port 8000
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:3000
echo.
pause
