from __future__ import annotations

import json
import sqlite3
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DB_PATH = ROOT_DIR / "api" / "moto_catalog.db"
OUTPUT_PATH = ROOT_DIR / "web" / "public" / "data" / "catalog-data.json"


def fetch_tags(conn: sqlite3.Connection) -> list[dict[str, object]]:
    rows = conn.execute(
        """
        SELECT id, name, category
        FROM tags
        ORDER BY category, name, id
        """
    ).fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
        }
        for row in rows
    ]


def fetch_motorcycles(conn: sqlite3.Connection) -> list[dict[str, object]]:
    rows = conn.execute(
        """
        SELECT
            m.id,
            m.name,
            m.maker,
            m.displacement,
            m.year,
            m.max_power,
            m.max_torque,
            m.seat_height,
            m.description,
            m.model_code,
            m.wet_weight,
            m.price,
            m.fuel_economy,
            m.status,
            m.image_url,
            t.id AS tag_id,
            t.name AS tag_name,
            t.category AS tag_category
        FROM motorcycles AS m
        LEFT JOIN motorcycle_tag AS mt
            ON mt.motorcycle_id = m.id
        LEFT JOIN tags AS t
            ON t.id = mt.tag_id
        ORDER BY m.id, t.category, t.name, t.id
        """
    ).fetchall()

    motorcycles: OrderedDict[int, dict[str, object]] = OrderedDict()

    for row in rows:
        motorcycle = motorcycles.setdefault(
            row["id"],
            {
                "id": row["id"],
                "name": row["name"],
                "maker": row["maker"],
                "displacement": row["displacement"],
                "year": row["year"],
                "max_power": row["max_power"],
                "max_torque": row["max_torque"],
                "seat_height": row["seat_height"],
                "description": row["description"],
                "model_code": row["model_code"],
                "wet_weight": row["wet_weight"],
                "price": row["price"],
                "fuel_economy": row["fuel_economy"],
                "status": row["status"],
                "image_url": row["image_url"],
                "tags": [],
            },
        )

        if row["tag_id"] is None:
            continue

        motorcycle["tags"].append(
            {
                "id": row["tag_id"],
                "name": row["tag_name"],
                "category": row["tag_category"],
            }
        )

    return list(motorcycles.values())


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tags": fetch_tags(conn),
        "motorcycles": fetch_motorcycles(conn),
    }

    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Exported {len(payload['motorcycles'])} motorcycles to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
