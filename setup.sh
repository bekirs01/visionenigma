#!/bin/bash
echo "=========================================="
echo "  VisionEnigma Support MVP - Setup"
echo "=========================================="
echo

# Check if .env exists
if [ -f "backend/.env" ]; then
    echo "[!] backend/.env already exists"
    read -p "Overwrite? (y/n): " OVERWRITE
    if [ "$OVERWRITE" != "y" ]; then
        goto_deps=true
    fi
fi

if [ "$goto_deps" != "true" ]; then
    # Create .env
    echo "[1/3] Creating backend/.env..."
    cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://postgres.fmupjxthdraqogfeokyj:Enigma2026Hack@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
AI_PROVIDER=openai
EMAIL_MODE=mock
ADMIN_ACCESS_CODE=admin123
OPENAI_MODEL=gpt-4o-mini
EOF

    # Ask for OpenAI key
    echo
    read -p "Enter OpenAI API key (or press Enter to skip): " OPENAI_KEY
    if [ -n "$OPENAI_KEY" ]; then
        echo "OPENAI_API_KEY=$OPENAI_KEY" >> backend/.env
        echo "[OK] OpenAI key added"
    else
        echo "OPENAI_API_KEY=" >> backend/.env
        echo "[!] OpenAI key skipped - AI will use mock responses"
    fi
fi

# Install dependencies
echo
echo "[2/3] Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q
cd ..

echo
echo "[3/3] Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="
echo
echo "To start the project, run in two terminals:"
echo
echo "  Terminal 1: cd backend && python -m uvicorn app.main:app --reload --port 8000"
echo "  Terminal 2: cd frontend && npm run dev"
echo
echo "Then open: http://localhost:3000"
