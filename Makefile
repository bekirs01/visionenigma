.PHONY: up down build migrate seed dev-backend dev-frontend

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

migrate:
	cd backend && DATABASE_URL=$${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/support_mvp} alembic upgrade head

seed:
	curl -X POST http://localhost:8000/api/seed-demo

dev-backend:
	cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm install && npm run dev

run-full: up
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "Run 'make seed' after backend is up to load demo data"
