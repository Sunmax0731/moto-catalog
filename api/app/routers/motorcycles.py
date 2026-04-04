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
    displacement_min: int | None = None,
    displacement_max: int | None = None,
    power_min: float | None = None,
    power_max: float | None = None,
    torque_min: float | None = None,
    torque_max: float | None = None,
    seat_height_min: int | None = None,
    seat_height_max: int | None = None,
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
    # レンジフィルタ
    if displacement_min is not None:
        query = query.filter(Motorcycle.displacement >= displacement_min)
    if displacement_max is not None:
        query = query.filter(Motorcycle.displacement <= displacement_max)
    if power_min is not None:
        query = query.filter(Motorcycle.max_power >= power_min)
    if power_max is not None:
        query = query.filter(Motorcycle.max_power <= power_max)
    if torque_min is not None:
        query = query.filter(Motorcycle.max_torque >= torque_min)
    if torque_max is not None:
        query = query.filter(Motorcycle.max_torque <= torque_max)
    if seat_height_min is not None:
        query = query.filter(Motorcycle.seat_height >= seat_height_min)
    if seat_height_max is not None:
        query = query.filter(Motorcycle.seat_height <= seat_height_max)
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
