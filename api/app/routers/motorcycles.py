from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Motorcycle, Tag
from app.schemas import MotorcycleOut, PaginatedMotorcycles, TagOut

router = APIRouter(prefix="/api/motorcycles", tags=["motorcycles"])

V_ENGINE_LAYOUT_TAGS = {"V型", "L型", "L型（V型）"}
NO_DATA_TAG_LABEL = "データなし"
NO_DATA_TAG_CATEGORIES = (
    "maker",
    "type",
    "usage",
    "luggage",
    "riding_position",
    "transmission",
    "cooling",
    "engine_layout",
    "cylinders",
    "valves_per_cylinder",
    "fuel_system",
    "frame",
    "suspension",
    "clutch",
    "drive",
    "abs",
    "start",
    "traction_control",
    "riding_mode",
    "quickshifter",
    "meter_type",
)
NO_DATA_TAG_BASE_ID = 1000
NO_DATA_TAG_INDEX = {
    category: index
    for index, category in enumerate(NO_DATA_TAG_CATEGORIES)
}


def get_no_data_tag_id(category: str) -> int:
    index = NO_DATA_TAG_INDEX.get(category)
    if index is None:
        hash_value = 0
        for char in category:
            hash_value = (hash_value * 31 + ord(char)) % 10000
        return -(NO_DATA_TAG_BASE_ID + len(NO_DATA_TAG_INDEX) + hash_value)
    return -(NO_DATA_TAG_BASE_ID + index)


def build_no_data_tags(
    db: Session,
    categories: set[str] | None = None,
) -> list[dict[str, object]]:
    tags = db.query(Tag).all()
    target_categories = sorted(
        {
            tag.category
            for tag in tags
            if categories is None or tag.category in categories
        }
    )
    motorcycles = db.query(Motorcycle).options(joinedload(Motorcycle.tags)).all()

    synthetic_tags: list[dict[str, object]] = []
    for category in target_categories:
        has_missing_data = any(
            not any(tag.category == category for tag in motorcycle.tags)
            for motorcycle in motorcycles
        )
        if not has_missing_data:
            continue
        synthetic_tags.append(
            {
                "id": get_no_data_tag_id(category),
                "name": NO_DATA_TAG_LABEL,
                "category": category,
            }
        )

    return synthetic_tags


def expand_equivalent_tag_ids(db: Session, tag: Tag | None) -> list[int]:
    if tag is None:
        return []
    if tag.category == "engine_layout" and tag.name == "V型":
        return [
            tag_id
            for (tag_id,) in db.query(Tag.id)
            .filter(Tag.category == "engine_layout", Tag.name.in_(V_ENGINE_LAYOUT_TAGS))
            .all()
        ]
    if tag.category == "engine_layout" and tag.name == "L型":
        return [
            tag_id
            for (tag_id,) in db.query(Tag.id)
            .filter(Tag.category == "engine_layout", Tag.name.in_(("L型", "L型（V型）")))
            .all()
        ]
    return [tag.id]


@router.get("", response_model=PaginatedMotorcycles)
def list_motorcycles(
    maker: str | None = None,
    tag_ids: list[int] = Query(default=[]),
    or_tag_ids: list[int] = Query(default=[]),
    q: str | None = None,
    displacement_min: int | None = None,
    displacement_max: int | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    power_min: float | None = None,
    power_max: float | None = None,
    torque_min: float | None = None,
    torque_max: float | None = None,
    seat_height_min: int | None = None,
    seat_height_max: int | None = None,
    weight_min: int | None = None,
    weight_max: int | None = None,
    status: str | None = None,
    sort: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Motorcycle).options(joinedload(Motorcycle.tags))
    categories = set()
    if tag_ids or or_tag_ids:
        categories = {
            tag.category
            for tag in db.query(Tag)
            .filter(Tag.id.in_(set(tag_ids + or_tag_ids)))
            .all()
        }
        categories.update(category for category in NO_DATA_TAG_CATEGORIES if get_no_data_tag_id(category) in set(tag_ids + or_tag_ids))
    synthetic_tags = {
        tag["id"]: tag
        for tag in build_no_data_tags(db, categories or None)
    }
    selected_tags = {
        tag.id: tag
        for tag in db.query(Tag).filter(Tag.id.in_(set(tag_ids + or_tag_ids))).all()
    }

    if maker:
        query = query.filter(Motorcycle.maker == maker)
    if q:
        query = query.filter(Motorcycle.name.ilike(f"%{q}%"))

    for tag_id in tag_ids:
        synthetic_tag = synthetic_tags.get(tag_id)
        if synthetic_tag is not None:
            query = query.filter(
                ~Motorcycle.tags.any(Tag.category == synthetic_tag["category"])
            )
            continue

        equivalent_tag_ids = expand_equivalent_tag_ids(db, selected_tags.get(tag_id)) or [tag_id]
        query = query.filter(
            or_(*(Motorcycle.tags.any(Tag.id == equivalent_tag_id) for equivalent_tag_id in equivalent_tag_ids))
        )

    if or_tag_ids:
        category_filters: dict[str, dict[str, object]] = {}

        for tag_id in or_tag_ids:
            synthetic_tag = synthetic_tags.get(tag_id)
            if synthetic_tag is not None:
                category_filter = category_filters.setdefault(
                    synthetic_tag["category"],
                    {"tag_ids": set(), "match_missing": False},
                )
                category_filter["match_missing"] = True
                continue

            selected_tag = selected_tags.get(tag_id)
            if selected_tag is None:
                continue

            category_filter = category_filters.setdefault(
                selected_tag.category,
                {"tag_ids": set(), "match_missing": False},
            )
            category_filter["tag_ids"].update(expand_equivalent_tag_ids(db, selected_tag))

        for category, category_filter in category_filters.items():
            conditions = [
                Motorcycle.tags.any(Tag.id == tag_id)
                for tag_id in category_filter["tag_ids"]
            ]
            if category_filter["match_missing"]:
                conditions.append(~Motorcycle.tags.any(Tag.category == category))
            if not conditions:
                continue
            query = query.filter(or_(*conditions))

    if displacement_min is not None:
        query = query.filter(Motorcycle.displacement >= displacement_min)
    if displacement_max is not None:
        query = query.filter(Motorcycle.displacement <= displacement_max)
    if year_min is not None:
        query = query.filter(Motorcycle.year >= year_min)
    if year_max is not None:
        query = query.filter(Motorcycle.year <= year_max)
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
    if weight_min is not None:
        query = query.filter(Motorcycle.wet_weight >= weight_min)
    if weight_max is not None:
        query = query.filter(Motorcycle.wet_weight <= weight_max)
    if status:
        query = query.filter(Motorcycle.status == status)

    sort_map = {
        "displacement_asc": Motorcycle.displacement.asc(),
        "displacement_desc": Motorcycle.displacement.desc(),
        "power_asc": Motorcycle.max_power.asc(),
        "power_desc": Motorcycle.max_power.desc(),
        "seat_height_asc": Motorcycle.seat_height.asc(),
        "seat_height_desc": Motorcycle.seat_height.desc(),
        "weight_asc": Motorcycle.wet_weight.asc(),
        "weight_desc": Motorcycle.wet_weight.desc(),
        "price_asc": Motorcycle.price.asc(),
        "price_desc": Motorcycle.price.desc(),
    }
    if sort and sort in sort_map:
        query = query.order_by(sort_map[sort])

    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/tags/all", response_model=list[TagOut])
def list_tags(category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Tag).order_by(Tag.category, Tag.name, Tag.id)
    if category:
        query = query.filter(Tag.category == category)

    tags = [
        {
            "id": tag.id,
            "name": tag.name,
            "category": tag.category,
        }
        for tag in query.all()
    ]
    synthetic_tags = build_no_data_tags(db, {category} if category else None)
    return tags + synthetic_tags


@router.get("/{motorcycle_id}", response_model=MotorcycleOut)
def get_motorcycle(motorcycle_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Motorcycle)
        .options(joinedload(Motorcycle.tags))
        .filter(Motorcycle.id == motorcycle_id)
        .first()
    )
