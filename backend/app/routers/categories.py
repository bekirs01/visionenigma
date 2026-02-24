from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Category
from app.schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api", tags=["categories"])


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.post("/categories", response_model=CategoryRead)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    cat = Category(name=data.name, description=data.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/categories/{category_id}", response_model=CategoryRead)
def get_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat
