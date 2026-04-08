from __future__ import annotations

import argparse
import html
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests

ROOT = "https://www.bikebros.co.jp"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "api" / "app" / "data" / "bikebros"

MAKER_CONFIG = {
    "HONDA": {"id": 1, "slug": "honda"},
    "YAMAHA": {"id": 2, "slug": "yamaha"},
    "SUZUKI": {"id": 3, "slug": "suzuki"},
    "KAWASAKI": {"id": 4, "slug": "kawasaki"},
    "Harley-Davidson": {"id": 5, "slug": "harley_davidson"},
    "Buell": {"id": 6, "slug": "buell"},
    "BMW": {"id": 7, "slug": "bmw"},
    "Ducati": {"id": 8, "slug": "ducati"},
    "Moto Guzzi": {"id": 9, "slug": "moto_guzzi"},
    "Triumph": {"id": 10, "slug": "triumph"},
    "Aprilia": {"id": 11, "slug": "aprilia"},
    "MV Agusta": {"id": 14, "slug": "mv_agusta"},
    "PIAGGIO": {"id": 16, "slug": "piaggio"},
    "KTM": {"id": 33, "slug": "ktm"},
    "Husqvarna": {"id": 38, "slug": "husqvarna"},
    "Indian": {"id": 100, "slug": "indian"},
}

TYPE_MAP = [
    ("アドベンチャー", "アドベンチャー"),
    ("オフロード", "オフロード"),
    ("モタード", "モタード"),
    ("スクーター", "スクーター"),
    ("ビッグスクーター", "スクーター"),
    ("アメリカン", "クルーザー"),
    ("クルーザー", "クルーザー"),
    ("ツアラー", "ツアラー"),
    ("スポーツツアラー", "ツアラー"),
    ("ネオクラシック", "ネオクラシック"),
    ("クラシック", "ネオクラシック"),
    ("レトロ", "ネオクラシック"),
    ("スクランブラー", "ネオクラシック"),
    ("スーパースポーツ", "スーパースポーツ"),
    ("レーサーレプリカ", "スーパースポーツ"),
    ("スポーツ", "スーパースポーツ"),
    ("ネイキッド", "ネイキッド"),
    ("ストリート", "ネイキッド"),
]


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", value).strip()


def parse_int(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"-?\d+", value.replace(",", ""))
    return int(match.group()) if match else None


def parse_float(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
    return float(match.group()) if match else None


def normalize_year(year: int | None) -> int | None:
    if year is None:
        return None
    if 200 <= year < 300:
        return 2000 + (year % 100)
    return year


def fetch_text(session: requests.Session, url: str, retries: int = 3) -> str:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = session.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as exc:  # pragma: no cover - network retries
            last_error = exc
            time.sleep(0.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def extract_links(catalog_html: str, maker_id: int) -> list[str]:
    pattern = re.compile(rf'href="(/catalog/{maker_id}/\d+(?:_\d+)?/)"')
    return sorted({match.group(1) for match in pattern.finditer(catalog_html)})


def extract_spec_table(detail_html: str) -> dict[str, str]:
    specs: dict[str, str] = {}
    pattern = re.compile(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", re.S)
    for match in pattern.finditer(detail_html):
        key = clean_text(match.group(1))
        value = clean_text(match.group(2))
        if key and value:
            specs[key] = value
    return specs


def extract_release_text(detail_html: str) -> str | None:
    match = re.search(r'releaseDate">([^<]+)</div>', detail_html)
    return clean_text(match.group(1)) if match else None


def extract_image_url(detail_html: str) -> str | None:
    match = re.search(r'<div class="bikeImage"><img src="([^"]+)"', detail_html)
    if not match:
        return None
    url = match.group(1)
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("/"):
        return f"{ROOT}{url}"
    return url


def infer_type(specs: dict[str, str]) -> str | None:
    category = ""
    for key in specs:
        if key.startswith("ランキング"):
            category = key.removeprefix("ランキング").strip()
            break
    haystacks = [category, specs.get("タイプグレード名", "")]
    for haystack in haystacks:
        for needle, mapped in TYPE_MAP:
            if needle in haystack:
                return mapped
    return None


def infer_cooling(specs: dict[str, str]) -> str | None:
    value = specs.get("冷却方式")
    if not value:
        return None
    if "水冷" in value:
        return "水冷"
    if "油冷" in value:
        return "油冷"
    if "空冷" in value:
        return "空冷"
    return None


def infer_suspension_tags(specs: dict[str, str]) -> list[str]:
    tags: list[str] = []
    front = specs.get("フロントフォークタイプ", "") or specs.get("懸架方式（前）", "")
    rear_count = parse_int(specs.get("ショックアブソーバ本数（後）"))
    rear = specs.get("懸架方式（後）", "")

    if "アップサイドダウン" in front:
        tags.append("アップサイドダウンフォーク")
    elif "倒立" in front:
        tags.append("倒立フォーク")
    elif "ボトムリンク" in front:
        tags.append("ボトムリンク")
    elif "ハブ" in front:
        tags.append("ハブステアリング")
    elif "テレスコピック" in front or "正立" in front:
        tags.append("テレスコピックフォーク")

    if rear_count == 2:
        tags.append("ツインショック")
    elif rear:
        tags.append("モノショック")
    return tags


def infer_frame(specs: dict[str, str]) -> str | None:
    value = specs.get("フレーム型式", "")
    mappings = [
        ("モノコック", "モノコックフレーム"),
        ("ペリメター", "ペリメターフレーム"),
        ("ツインスパー", "ツインスパーフレーム"),
        ("トレリス", "トレリスフレーム"),
        ("バックボーン", "バックボーンフレーム"),
        ("ダイヤモンド", "ダイヤモンドフレーム"),
        ("クレードル", "クレードルフレーム"),
    ]
    for needle, mapped in mappings:
        if needle in value:
            return mapped
    return None


def infer_engine_layout(specs: dict[str, str], cylinders: str | None) -> str | None:
    value = specs.get("シリンダ配列", "")
    if "水平対向" in value:
        return "水平対向"
    if "L型" in value:
        return "L型"
    if "V型" in value:
        return "V型"
    if "並列" in value and cylinders in {"単気筒", "二気筒"}:
        return "並列"
    if "直列" in value or "並列" in value:
        return "直列"
    return None


def infer_cylinders(specs: dict[str, str]) -> str | None:
    count = parse_int(specs.get("気筒数"))
    return {
        1: "単気筒",
        2: "二気筒",
        3: "三気筒",
        4: "四気筒",
        6: "六気筒",
    }.get(count)


def infer_valves(specs: dict[str, str]) -> str | None:
    count = parse_int(specs.get("気筒あたりバルブ数"))
    return {
        2: "2バルブ",
        3: "3バルブ",
        4: "4バルブ",
        5: "5バルブ",
    }.get(count)


def infer_fuel_system(specs: dict[str, str]) -> str | None:
    value = specs.get("燃料供給方式", "")
    if "インジェクション" in value:
        return "フューエルインジェクション"
    if "キャブ" in value:
        return "キャブレター"
    return None


def infer_clutch(specs: dict[str, str]) -> str | None:
    value = specs.get("クラッチ形式", "")
    if "乾式" in value:
        return "乾式クラッチ"
    if value:
        return "湿式クラッチ"
    return None


def infer_drive(specs: dict[str, str]) -> str | None:
    value = specs.get("動力伝達方式", "")
    if "シャフト" in value:
        return "シャフトドライブ"
    if "ベルト" in value:
        return "ベルトドライブ"
    if "チェーン" in value:
        return "チェーン"
    return None


def infer_abs(specs: dict[str, str]) -> str | None:
    value = specs.get("車両装備：アンチロックブレーキ（ABS）", "")
    if value == "有":
        return "ABS"
    if value == "無":
        return "ABS無し"
    return None


def infer_start(specs: dict[str, str]) -> str | None:
    value = specs.get("エンジン始動方式", "")
    if "セル" in value and "キック" in value:
        return "セル/キック併用"
    if "キック" in value:
        return "キックスタート"
    if value:
        return "セルスタート"
    return None


def infer_transmission(specs: dict[str, str], type_tag: str | None) -> str | None:
    value = specs.get("変速機形式", "")
    if "DCT" in value:
        return "DCT"
    if "無段" in value or (type_tag == "スクーター" and "変速" not in value):
        return "CVT"
    gears = parse_int(value)
    if gears:
        return f"MT {gears}速"
    return None


def infer_riding_position(type_tag: str | None) -> str | None:
    if type_tag == "クルーザー":
        return "クルーザーポジション"
    if type_tag == "スーパースポーツ":
        return "前傾ポジション"
    if type_tag:
        return "アップライトポジション"
    return None


def infer_binary_feature(specs: dict[str, str], key: str, true_tag: str, false_tag: str) -> str | None:
    value = specs.get(key, "")
    if value == "有":
        return true_tag
    if value == "無":
        return false_tag
    return None


def infer_meter_type(specs: dict[str, str]) -> str | None:
    value = specs.get("スピードメーター表示形式", "")
    if "デジタル" in value:
        return "フルデジタル"
    if "アナログ" in value:
        return "アナログ"
    return None


def infer_usage_tags(type_tag: str | None, specs: dict[str, str], displacement: int | None) -> list[str]:
    tags: list[str] = []
    if type_tag in {"ネイキッド", "ネオクラシック", "スクーター", "モタード"}:
        tags.append("通勤・街乗り")
    if type_tag in {"スーパースポーツ"}:
        tags.append("サーキット")
        if displacement is not None and displacement <= 400:
            tags.append("通勤・街乗り")
    if type_tag in {"ツアラー", "クルーザー", "アドベンチャー"}:
        tags.append("ツーリング")
    if type_tag in {"オフロード", "アドベンチャー", "モタード"}:
        tags.append("林道・オフロード")
    if parse_int(specs.get("乗車定員（名）")) and parse_int(specs.get("乗車定員（名）")) >= 2:
        tags.append("タンデム")
    return tags


def build_description(maker: str, type_tag: str | None, displacement: int | None, year: int | None) -> str:
    parts = [f"{maker}のBikeBrosカタログ掲載モデル。"]
    if year is not None:
        parts.append(f"{year}年発売")
    if displacement is not None:
        parts.append(f"{displacement}cc")
    if type_tag:
        parts.append(type_tag)
    return " ".join(parts)


def dedupe_tags(tags: list[str | None]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for tag in tags:
        if not tag or tag in seen:
            continue
        seen.add(tag)
        result.append(tag)
    return result


def parse_model_page(session: requests.Session, maker: str, url: str) -> dict[str, Any] | None:
    detail_html = fetch_text(session, url)
    specs = extract_spec_table(detail_html)
    name = specs.get("タイプグレード名")
    if not name:
        heading = re.search(r'<p class="bikeNmae"[^>]*>(.*?)</p>', detail_html, re.S)
        name = clean_text(heading.group(1)).split("|")[-1].strip() if heading else None
    if not name:
        return None

    release_text = extract_release_text(detail_html)
    year = normalize_year(parse_int(specs.get("発売年")) or parse_int(release_text))
    displacement = parse_int(specs.get("排気量 (cc)"))
    cylinders = infer_cylinders(specs)
    type_tag = infer_type(specs)
    tags = dedupe_tags(
        [
            maker,
            type_tag,
            infer_cooling(specs),
            *infer_suspension_tags(specs),
            infer_frame(specs),
            infer_engine_layout(specs, cylinders),
            cylinders,
            infer_valves(specs),
            infer_fuel_system(specs),
            infer_clutch(specs),
            infer_drive(specs),
            infer_abs(specs),
            infer_start(specs),
            infer_transmission(specs, type_tag),
            infer_riding_position(type_tag),
            infer_binary_feature(specs, "車両装備：トラクションコントロール", "トラクションコントロール有", "トラクションコントロール無"),
            infer_binary_feature(specs, "車両装備：走行モード切り替え", "ライディングモード有", "ライディングモード無"),
            infer_binary_feature(specs, "車両装備：クイックシフター", "クイックシフター有", "クイックシフター無"),
            infer_meter_type(specs),
            *infer_usage_tags(type_tag, specs, displacement),
        ]
    )

    return {
        "name": name,
        "maker": maker,
        "model_code": specs.get("型式") or None,
        "displacement": displacement,
        "year": year,
        "max_power": parse_float(specs.get("最高出力（PS）")),
        "max_torque": parse_float(specs.get("最大トルク（N・m）")),
        "seat_height": parse_int(specs.get("シート高 (mm)")),
        "wet_weight": parse_int(specs.get("車両重量 (kg)")),
        "fuel_economy": parse_float(specs.get("燃料消費率（2）(km/L)")) or parse_float(specs.get("燃料消費率（1）(km/L)")),
        "status": "current" if year is not None and year >= (time.localtime().tm_year - 2) else "discontinued",
        "image_url": extract_image_url(detail_html),
        "description": build_description(maker, type_tag, displacement, year),
        "tags": tags,
    }


def generate_for_maker(maker: str, workers: int) -> list[dict[str, Any]]:
    config = MAKER_CONFIG[maker]
    with requests.Session() as session:
        catalog_html = fetch_text(session, f"{ROOT}/catalog/{config['id']}")
        links = extract_links(catalog_html, config["id"])
        bikes: list[dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(parse_model_page, session, maker, f"{ROOT}{link}"): link
                for link in links
            }
            for future in as_completed(futures):
                bike = future.result()
                if bike is not None:
                    bikes.append(bike)
    bikes.sort(key=lambda item: ((item.get("year") or 0), item["name"], item.get("model_code") or ""))
    return bikes


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate motorcycle data from BikeBros catalogs.")
    parser.add_argument("--makers", nargs="+", choices=sorted(MAKER_CONFIG), required=True)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for maker in args.makers:
        bikes = generate_for_maker(maker, workers=args.workers)
        config = MAKER_CONFIG[maker]
        output_path = OUTPUT_DIR / f"{config['slug']}.json"
        output_path.write_text(json.dumps(bikes, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{maker}: wrote {len(bikes)} bikes to {output_path}")


if __name__ == "__main__":
    main()
