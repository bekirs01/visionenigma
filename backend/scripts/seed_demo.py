#!/usr/bin/env python3
"""
Standalone seed script. Run after migrations.
Usage: python -m scripts.seed_demo  (from backend dir, with DATABASE_URL set)
Or call POST /api/seed-demo when backend is running.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
from app.models import Category, Ticket

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/support_mvp")

def main():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        for name, desc in [("billing", "Платежи"), ("technical", "Техподдержка"), ("access", "Доступ"), ("other", "Прочее")]:
            if not db.query(Category).filter(Category.name == name).first():
                db.add(Category(name=name, description=desc))
        db.commit()
        print("Seed done. Use POST /api/seed-demo for demo tickets or add via UI.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
