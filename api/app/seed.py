"""バイク図鑑シードデータ"""
from app.database import SessionLocal, engine, Base
from app.models import Motorcycle, Tag

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()

    if db.query(Tag).count() > 0:
        print("データ既存のためスキップ")
        db.close()
        return

    tags_data = [
        ("HONDA", "maker"), ("YAMAHA", "maker"), ("SUZUKI", "maker"), ("KAWASAKI", "maker"),
        ("ネイキッド", "type"), ("スーパースポーツ", "type"), ("アドベンチャー", "type"),
        ("クルーザー", "type"), ("オフロード", "type"), ("スクーター", "type"),
        ("~125cc", "displacement"), ("~250cc", "displacement"),
        ("~400cc", "displacement"), ("~750cc", "displacement"), ("750cc~", "displacement"),
        ("空冷", "feature"), ("水冷", "feature"), ("単気筒", "feature"),
        ("二気筒", "feature"), ("四気筒", "feature"),
    ]
    tags = {}
    for name, cat in tags_data:
        t = Tag(name=name, category=cat)
        db.add(t)
        tags[name] = t
    db.flush()

    bikes = [
        {
            "name": "CB400 SUPER FOUR",
            "maker": "HONDA",
            "displacement": 399,
            "year": 2022,
            "description": "ホンダの名車。教習車としても有名な直列4気筒ネイキッド。",
            "image_url": "",
            "tags": ["HONDA", "ネイキッド", "~400cc", "水冷", "四気筒"],
        },
        {
            "name": "CBR600RR",
            "maker": "HONDA",
            "displacement": 599,
            "year": 2023,
            "description": "ホンダのミドルクラスSS。サーキットでも高い人気を誇る。",
            "image_url": "",
            "tags": ["HONDA", "スーパースポーツ", "~750cc", "水冷", "四気筒"],
        },
        {
            "name": "YZF-R25",
            "maker": "YAMAHA",
            "displacement": 249,
            "year": 2023,
            "description": "ヤマハの250ccスポーツ。軽量で扱いやすい二気筒エンジン。",
            "image_url": "",
            "tags": ["YAMAHA", "スーパースポーツ", "~250cc", "水冷", "二気筒"],
        },
        {
            "name": "MT-09",
            "maker": "YAMAHA",
            "displacement": 890,
            "year": 2024,
            "description": "ヤマハの三気筒ネイキッド。トルクフルなエンジンが魅力。",
            "image_url": "",
            "tags": ["YAMAHA", "ネイキッド", "750cc~", "水冷"],
        },
        {
            "name": "GSX-S1000",
            "maker": "SUZUKI",
            "displacement": 999,
            "year": 2022,
            "description": "スズキのリッタークラスネイキッド。GSX-R譲りのエンジン。",
            "image_url": "",
            "tags": ["SUZUKI", "ネイキッド", "750cc~", "水冷", "四気筒"],
        },
        {
            "name": "V-Strom 250SX",
            "maker": "SUZUKI",
            "displacement": 249,
            "year": 2023,
            "description": "スズキの軽量アドベンチャー。ロングツーリングに最適。",
            "image_url": "",
            "tags": ["SUZUKI", "アドベンチャー", "~250cc", "水冷", "単気筒"],
        },
        {
            "name": "Ninja ZX-25R",
            "maker": "KAWASAKI",
            "displacement": 249,
            "year": 2023,
            "description": "カワサキの250cc4気筒。高回転まで回る刺激的なエンジン。",
            "image_url": "",
            "tags": ["KAWASAKI", "スーパースポーツ", "~250cc", "水冷", "四気筒"],
        },
        {
            "name": "Z900RS",
            "maker": "KAWASAKI",
            "displacement": 948,
            "year": 2024,
            "description": "カワサキのネオクラシック。Z1を彷彿とさせるデザインが人気。",
            "image_url": "",
            "tags": ["KAWASAKI", "ネイキッド", "750cc~", "水冷", "四気筒"],
        },
    ]

    for b in bikes:
        tag_names = b.pop("tags")
        bike = Motorcycle(**b)
        bike.tags = [tags[t] for t in tag_names]
        db.add(bike)

    db.commit()
    db.close()
    print("シードデータ投入完了")


if __name__ == "__main__":
    seed()
