from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app.routers import health, categories, tickets, seed, email_stub

app = FastAPI(title="Support MVP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router)
app.include_router(categories.router)
app.include_router(tickets.router)
app.include_router(seed.router)
app.include_router(email_stub.router)


@app.on_event("startup")
def startup():
    pass  # Tables created via Alembic migrations
