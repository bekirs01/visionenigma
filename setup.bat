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
echo [1/3] Creating backend\.env...
(
echo DATABASE_URL=postgresql://postgres.fmupjxthdraqogfeokyj:Enigma2026Hack@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
echo AI_PROVIDER=openai
echo EMAIL_MODE=mock
echo ADMIN_ACCESS_CODE=admin123
echo OPENAI_MODEL=gpt-4o-mini
) > backend\.env

:: Ask for OpenAI key
echo.
set /p OPENAI_KEY="Enter OpenAI API key (or press Enter to skip): "
if not "%OPENAI_KEY%"=="" (
    echo OPENAI_API_KEY=%OPENAI_KEY%>> backend\.env
    echo [OK] OpenAI key added
) else (
    echo OPENAI_API_KEY=>> backend\.env
    echo [!] OpenAI key skipped - AI will use mock responses
)

:DEPS
:: Install dependencies
echo.
echo [2/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt -q
cd ..

echo.
echo [3/3] Installing frontend dependencies...
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
