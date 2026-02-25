from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base, ensure_db_fallback
from app import models  # noqa: F401 - tablolar Base.metadata'ya kayıt olsun
from app.routers import health, categories, tickets, seed, email_stub, ai, admin_auth

app = FastAPI(title="Support MVP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router)
app.include_router(admin_auth.router)
app.include_router(categories.router)
app.include_router(tickets.router)
app.include_router(seed.router)
app.include_router(email_stub.router)
app.include_router(ai.router)


@app.on_event("startup")
def startup():
    ensure_db_fallback()
