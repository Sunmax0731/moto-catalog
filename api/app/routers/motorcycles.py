from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_
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
ELECTRIC_TAG_LABEL = "電気バイク"
ELECTRIC_TAG_CATEGORY = "type"
ELECTRIC_TAG_ID = -2000


def serialize_tag(tag: Tag) -> dict[str, object]:
    return {
        "id": tag.id,
        "name": tag.name,
        "category": tag.category,
    }


def get_no_data_tag_id(category: str) -> int:
    index = NO_DATA_TAG_INDEX.get(category)
    if index is None:
        hash_value = 0
        for char in category:
            hash_value = (hash_value * 31 + ord(char)) % 10000
        return -(NO_DATA_TAG_BASE_ID + len(NO_DATA_TAG_INDEX) + hash_value)
    return -(NO_DATA_TAG_BASE_ID + index)


def get_electric_tag(db: Session) -> dict[str, object] | None:
    existing_tag = (
        db.query(Tag)
        .filter(
            Tag.category == ELECTRIC_TAG_CATEGORY,
            Tag.name == ELECTRIC_TAG_LABEL,
        )
        .first()
    )
    has_zero_cc_bike = (
        db.query(Motorcycle.id)
        .filter(Motorcycle.displacement == 0)
        .first()
        is not None
    )

    if existing_tag is None and not has_zero_cc_bike:
        return None
    if existing_tag is not None:
        return serialize_tag(existing_tag)
    return {
        "id": ELECTRIC_TAG_ID,
        "name": ELECTRIC_TAG_LABEL,
        "category": ELECTRIC_TAG_CATEGORY,
    }


def category_has_data(motorcycle: Motorcycle, category: str) -> bool:
    if any(tag.category == category for tag in motorcycle.tags):
        return True
    return category == ELECTRIC_TAG_CATEGORY and motorcycle.displacement == 0


def missing_category_condition(category: str):
    base_condition = ~Motorcycle.tags.any(Tag.category == category)
    if category != ELECTRIC_TAG_CATEGORY:
        return base_condition
    return and_(
        base_condition,
        or_(Motorcycle.displacement.is_(None), Motorcycle.displacement != 0),
    )


def electric_tag_condition():
    return or_(
        Motorcycle.displacement == 0,
        Motorcycle.tags.any(
            and_(
                Tag.category == ELECTRIC_TAG_CATEGORY,
                Tag.name == ELECTRIC_TAG_LABEL,
            )
        ),
    )


def is_electric_tag_selection(
    tag_id: int,
    selected_tag: Tag | None,
    electric_tag: dict[str, object] | None,
) -> bool:
    if electric_tag is not None and tag_id == electric_tag["id"]:
        return True
    return (
        selected_tag is not None
        and selected_tag.category == ELECTRIC_TAG_CATEGORY
        and selected_tag.name == ELECTRIC_TAG_LABEL
    )


def serialize_motorcycle(
    motorcycle: Motorcycle,
    electric_tag: dict[str, object] | None,
) -> dict[str, object]:
    tags = [serialize_tag(tag) for tag in motorcycle.tags]
    has_electric_tag = any(
        tag["category"] == ELECTRIC_TAG_CATEGORY and tag["name"] == ELECTRIC_TAG_LABEL
        for tag in tags
    )

    if (
        electric_tag is not None
        and motorcycle.displacement == 0
        and not has_electric_tag
    ):
        tags.append(electric_tag)

    return {
        "id": motorcycle.id,
        "name": motorcycle.name,
        "maker": motorcycle.maker,
        "displacement": motorcycle.displacement,
        "year": motorcycle.year,
        "max_power": motorcycle.max_power,
        "max_torque": motorcycle.max_torque,
        "seat_height": motorcycle.seat_height,
        "description": motorcycle.description,
        "model_code": motorcycle.model_code,
        "wet_weight": motorcycle.wet_weight,
        "price": motorcycle.price,
        "fuel_economy": motorcycle.fuel_economy,
        "status": motorcycle.status,
        "image_url": motorcycle.image_url,
        "tags": tags,
    }


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
            not category_has_data(motorcycle, category)
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
    electric_tag = get_electric_tag(db)
    selected_tag_ids = set(tag_ids + or_tag_ids)
    categories = set()
    if selected_tag_ids:
        categories = {
            tag.category
            for tag in db.query(Tag)
            .filter(Tag.id.in_(selected_tag_ids))
            .all()
        }
        categories.update(
            category
            for category in NO_DATA_TAG_CATEGORIES
            if get_no_data_tag_id(category) in selected_tag_ids
        )
        if electric_tag is not None and electric_tag["id"] in selected_tag_ids:
            categories.add(ELECTRIC_TAG_CATEGORY)

    synthetic_tags = {
        tag["id"]: tag
        for tag in build_no_data_tags(db, categories or None)
    }
    selected_tags = {
        tag.id: tag
        for tag in db.query(Tag).filter(Tag.id.in_(selected_tag_ids)).all()
    }

    if maker:
        query = query.filter(Motorcycle.maker == maker)
    if q:
        query = query.filter(Motorcycle.name.ilike(f"%{q}%"))

    for tag_id in tag_ids:
        selected_tag = selected_tags.get(tag_id)
        if is_electric_tag_selection(tag_id, selected_tag, electric_tag):
            query = query.filter(electric_tag_condition())
            continue

        synthetic_tag = synthetic_tags.get(tag_id)
        if synthetic_tag is not None:
            query = query.filter(
                missing_category_condition(str(synthetic_tag["category"]))
            )
            continue

        equivalent_tag_ids = expand_equivalent_tag_ids(db, selected_tag) or [tag_id]
        query = query.filter(
            or_(
                *(
                    Motorcycle.tags.any(Tag.id == equivalent_tag_id)
                    for equivalent_tag_id in equivalent_tag_ids
                )
            )
        )

    if or_tag_ids:
        category_filters: dict[str, dict[str, Any]] = {}

        for tag_id in or_tag_ids:
            selected_tag = selected_tags.get(tag_id)
            if is_electric_tag_selection(tag_id, selected_tag, electric_tag):
                category_filter = category_filters.setdefault(
                    ELECTRIC_TAG_CATEGORY,
                    {"tag_ids": set(), "match_missing": False, "match_electric": False},
                )
                category_filter["match_electric"] = True
                continue

            synthetic_tag = synthetic_tags.get(tag_id)
            if synthetic_tag is not None:
                category_filter = category_filters.setdefault(
                    str(synthetic_tag["category"]),
                    {"tag_ids": set(), "match_missing": False, "match_electric": False},
                )
                category_filter["match_missing"] = True
                continue

            if selected_tag is None:
                continue

            category_filter = category_filters.setdefault(
                selected_tag.category,
                {"tag_ids": set(), "match_missing": False, "match_electric": False},
            )
            category_filter["tag_ids"].update(expand_equivalent_tag_ids(db, selected_tag))

        for category, category_filter in category_filters.items():
            conditions = [
                Motorcycle.tags.any(Tag.id == tag_id)
                for tag_id in category_filter["tag_ids"]
            ]
            if category_filter["match_missing"]:
                conditions.append(missing_category_condition(category))
            if category_filter["match_electric"]:
                conditions.append(electric_tag_condition())
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
    return {
        "items": [serialize_motorcycle(item, electric_tag) for item in items],
        "total": total,
    }


@router.get("/tags/all", response_model=list[TagOut])
def list_tags(category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Tag).order_by(Tag.category, Tag.name, Tag.id)
    if category:
        query = query.filter(Tag.category == category)

    tags = [serialize_tag(tag) for tag in query.all()]
    electric_tag = get_electric_tag(db)
    if (
        electric_tag is not None
        and (category is None or category == ELECTRIC_TAG_CATEGORY)
        and not any(
            tag["category"] == ELECTRIC_TAG_CATEGORY and tag["name"] == ELECTRIC_TAG_LABEL
            for tag in tags
        )
    ):
        tags.append(electric_tag)

    synthetic_tags = build_no_data_tags(db, {category} if category else None)
    return tags + synthetic_tags


@router.get("/{motorcycle_id}", response_model=MotorcycleOut)
def get_motorcycle(motorcycle_id: int, db: Session = Depends(get_db)):
    motorcycle = (
        db.query(Motorcycle)
        .options(joinedload(Motorcycle.tags))
        .filter(Motorcycle.id == motorcycle_id)
        .first()
    )
    if motorcycle is None:
        return None
    return serialize_motorcycle(motorcycle, get_electric_tag(db))
