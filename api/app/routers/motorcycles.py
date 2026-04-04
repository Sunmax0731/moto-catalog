from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Motorcycle, Tag
from app.schemas import MotorcycleOut, TagOut

router = APIRouter(prefix="/api/motorcycles", tags=["motorcycles"])


@router.get("", response_model=list[MotorcycleOut])
def list_motorcycles(
    maker: str | None = None,
    tag_ids: list[int] = Query(default=[]),
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Motorcycle).options(joinedload(Motorcycle.tags))
    if maker:
        query = query.filter(Motorcycle.maker == maker)
    if q:
        query = query.filter(Motorcycle.name.ilike(f"%{q}%"))
    if tag_ids:
        for tid in tag_ids:
            query = query.filter(Motorcycle.tags.any(Tag.id == tid))
    return query.all()


@router.get("/{motorcycle_id}", response_model=MotorcycleOut)
def get_motorcycle(motorcycle_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Motorcycle)
        .options(joinedload(Motorcycle.tags))
        .filter(Motorcycle.id == motorcycle_id)
        .first()
    )


@router.get("/tags/all", response_model=list[TagOut])
def list_tags(category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Tag)
    if category:
        query = query.filter(Tag.category == category)
    return query.all()
