"""バイク図鑑シードデータ（拡張版）"""
from app.database import SessionLocal, engine, Base
from app.models import Motorcycle, Tag

Base.metadata.create_all(bind=engine)

TAGS = {
    # メーカー（国内+海外）
    "maker": [
        "HONDA", "YAMAHA", "SUZUKI", "KAWASAKI",
        "BMW", "Ducati", "Triumph", "Harley-Davidson",
        "KTM", "Aprilia", "Moto Guzzi", "Indian",
    ],
    # 車種タイプ
    "type": [
        "ネイキッド", "スーパースポーツ", "アドベンチャー",
        "クルーザー", "オフロード", "スクーター",
        "ツアラー", "ネオクラシック", "モタード",
    ],
    # 冷却方式
    "cooling": ["水冷", "油冷", "空冷"],
    # 懸架方式
    "suspension": [
        "テレスコピックフォーク", "倒立フォーク", "アップサイドダウンフォーク",
        "ボトムリンク", "ハブステアリング",
        "モノショック", "ツインショック",
    ],
    # フレーム形状
    "frame": [
        "ダイヤモンドフレーム", "ツインスパーフレーム", "トレリスフレーム",
        "モノコックフレーム", "クレードルフレーム", "バックボーンフレーム",
        "ペリメターフレーム",
    ],
    # エンジン形状
    "engine_layout": [
        "直列", "V型", "水平対向", "L型", "並列",
    ],
    # 気筒数
    "cylinders": [
        "単気筒", "二気筒", "三気筒", "四気筒", "六気筒",
    ],
    # 1気筒あたりバルブ数
    "valves_per_cylinder": [
        "2バルブ", "3バルブ", "4バルブ", "5バルブ",
    ],
    # 燃料供給方式
    "fuel_system": ["キャブレター", "フューエルインジェクション"],
    # クラッチ
    "clutch": ["湿式クラッチ", "乾式クラッチ"],
    # 駆動方式
    "drive": ["チェーン", "シャフトドライブ", "ベルトドライブ"],
    # ABS
    "abs": ["ABS", "コーナリングABS", "ABS無し"],
    # スタート方式
    "start": ["セルスタート", "キックスタート", "セル/キック併用"],
}

BIKES = [
    # === 国内メーカー ===
    {
        "name": "CB400 SUPER FOUR",
        "maker": "HONDA",
        "displacement": 399, "year": 2022,
        "max_power": 56, "max_torque": 39, "seat_height": 755,
        "description": "ホンダの名車。教習車としても有名な直列4気筒ネイキッド。HYPER VTECによる可変バルブが特徴。",
        "tags": ["HONDA", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "ダイヤモンドフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "CBR600RR",
        "maker": "HONDA",
        "displacement": 599, "year": 2023,
        "max_power": 121, "max_torque": 63, "seat_height": 820,
        "description": "ホンダのミドルクラスSS。サーキットでも高い人気を誇る。電子制御満載。",
        "tags": ["HONDA", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "ツインスパーフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "CRF250L",
        "maker": "HONDA",
        "displacement": 249, "year": 2023,
        "max_power": 24, "max_torque": 23, "seat_height": 830,
        "description": "ホンダの軽量オフロード。街乗りからトレイルまで万能。",
        "tags": ["HONDA", "オフロード", "水冷", "倒立フォーク", "モノショック",
                 "ダイヤモンドフレーム", "直列", "単気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "Gold Wing",
        "maker": "HONDA",
        "displacement": 1833, "year": 2024,
        "max_power": 126, "max_torque": 170, "seat_height": 745,
        "description": "ホンダのフラッグシップツアラー。水平対向6気筒エンジン搭載の豪華クルーザー。",
        "tags": ["HONDA", "ツアラー", "水冷", "テレスコピックフォーク", "モノショック",
                 "ツインスパーフレーム", "水平対向", "六気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "シャフトドライブ", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "YZF-R25",
        "maker": "YAMAHA",
        "displacement": 249, "year": 2023,
        "max_power": 35, "max_torque": 23.6, "seat_height": 780,
        "description": "ヤマハの250ccスポーツ。軽量で扱いやすい二気筒エンジン。",
        "tags": ["YAMAHA", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "ダイヤモンドフレーム", "直列", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "MT-09",
        "maker": "YAMAHA",
        "displacement": 890, "year": 2024,
        "max_power": 119, "max_torque": 93, "seat_height": 825,
        "description": "ヤマハの三気筒ネイキッド。クロスプレーンエンジンのトルクフルな走りが魅力。",
        "tags": ["YAMAHA", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "ダイヤモンドフレーム", "直列", "三気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "SR400",
        "maker": "YAMAHA",
        "displacement": 399, "year": 2021,
        "max_power": 24, "max_torque": 28, "seat_height": 790,
        "description": "ヤマハの空冷単気筒。キックスタート専用のクラシックバイク。43年間愛された名車。",
        "tags": ["YAMAHA", "ネオクラシック", "空冷", "テレスコピックフォーク", "ツインショック",
                 "ダイヤモンドフレーム", "直列", "単気筒", "2バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS無し", "キックスタート"],
    },
    {
        "name": "GSX-S1000",
        "maker": "SUZUKI",
        "displacement": 999, "year": 2022,
        "max_power": 150, "max_torque": 106, "seat_height": 810,
        "description": "スズキのリッタークラスネイキッド。GSX-R譲りの高性能エンジン。",
        "tags": ["SUZUKI", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "ツインスパーフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "V-Strom 250SX",
        "maker": "SUZUKI",
        "displacement": 249, "year": 2023,
        "max_power": 26.5, "max_torque": 22.2, "seat_height": 835,
        "description": "スズキの軽量アドベンチャー。油冷単気筒エンジンでロングツーリングに最適。",
        "tags": ["SUZUKI", "アドベンチャー", "油冷", "倒立フォーク", "モノショック",
                 "ダイヤモンドフレーム", "直列", "単気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "Ninja ZX-25R",
        "maker": "KAWASAKI",
        "displacement": 249, "year": 2023,
        "max_power": 45, "max_torque": 21.2, "seat_height": 785,
        "description": "カワサキの250cc4気筒。高回転まで回る刺激的なエンジン。",
        "tags": ["KAWASAKI", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "トレリスフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "Z900RS",
        "maker": "KAWASAKI",
        "displacement": 948, "year": 2024,
        "max_power": 111, "max_torque": 98.1, "seat_height": 800,
        "description": "カワサキのネオクラシック。Z1を彷彿とさせるデザインが人気。",
        "tags": ["KAWASAKI", "ネオクラシック", "水冷", "倒立フォーク", "モノショック",
                 "トレリスフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "W800",
        "maker": "KAWASAKI",
        "displacement": 773, "year": 2023,
        "max_power": 52, "max_torque": 62.9, "seat_height": 790,
        "description": "カワサキの空冷バーチカルツイン。ベベルギア駆動カムの伝統的エンジン。",
        "tags": ["KAWASAKI", "ネオクラシック", "空冷", "テレスコピックフォーク", "ツインショック",
                 "ダイヤモンドフレーム", "直列", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    # === 海外メーカー ===
    {
        "name": "R 1250 GS Adventure",
        "maker": "BMW",
        "displacement": 1254, "year": 2024,
        "max_power": 136, "max_torque": 143, "seat_height": 850,
        "description": "BMWのフラッグシップアドベンチャー。水平対向2気筒のシャフトドライブ。世界中で愛されるGSシリーズ。",
        "tags": ["BMW", "アドベンチャー", "水冷", "テレスコピックフォーク", "モノショック",
                 "ツインスパーフレーム", "水平対向", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "シャフトドライブ", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "S 1000 RR",
        "maker": "BMW",
        "displacement": 999, "year": 2024,
        "max_power": 210, "max_torque": 113, "seat_height": 832,
        "description": "BMWのスーパースポーツ。ShiftCam可変バルブとウイングレットで究極の走りを実現。",
        "tags": ["BMW", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "ツインスパーフレーム", "直列", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "Panigale V4 S",
        "maker": "Ducati",
        "displacement": 1103, "year": 2024,
        "max_power": 216, "max_torque": 120.9, "seat_height": 830,
        "description": "ドゥカティのフラッグシップSS。V4エンジンとモノコックフレームの芸術品。",
        "tags": ["Ducati", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "モノコックフレーム", "V型", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "Monster",
        "maker": "Ducati",
        "displacement": 937, "year": 2024,
        "max_power": 111, "max_torque": 93, "seat_height": 820,
        "description": "ドゥカティの定番ネイキッド。L型2気筒とトレリスフレームの伝統的スタイル。",
        "tags": ["Ducati", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "トレリスフレーム", "L型", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "Speed Triple 1200 RS",
        "maker": "Triumph",
        "displacement": 1160, "year": 2024,
        "max_power": 180, "max_torque": 125, "seat_height": 830,
        "description": "トライアンフの三気筒スポーツネイキッド。独特の排気音と鋭いハンドリング。",
        "tags": ["Triumph", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "ツインスパーフレーム", "直列", "三気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "Bonneville T120",
        "maker": "Triumph",
        "displacement": 1200, "year": 2024,
        "max_power": 80, "max_torque": 105, "seat_height": 790,
        "description": "トライアンフのモダンクラシック。270度クランク並列2気筒の味わい深い乗り味。",
        "tags": ["Triumph", "ネオクラシック", "水冷", "テレスコピックフォーク", "ツインショック",
                 "ダイヤモンドフレーム", "並列", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "ABS", "セルスタート"],
    },
    {
        "name": "Sportster S",
        "maker": "Harley-Davidson",
        "displacement": 1252, "year": 2024,
        "max_power": 121, "max_torque": 127, "seat_height": 755,
        "description": "ハーレーの新世代スポーツスター。水冷Vツインのレボリューションマックスエンジン搭載。",
        "tags": ["Harley-Davidson", "クルーザー", "水冷", "倒立フォーク", "モノショック",
                 "トレリスフレーム", "V型", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "ベルトドライブ", "ABS", "セルスタート"],
    },
    {
        "name": "Fat Boy 114",
        "maker": "Harley-Davidson",
        "displacement": 1868, "year": 2024,
        "max_power": 93, "max_torque": 155, "seat_height": 675,
        "description": "ハーレーの象徴的クルーザー。空冷Vツインの重厚な鼓動と圧倒的な存在感。",
        "tags": ["Harley-Davidson", "クルーザー", "空冷", "テレスコピックフォーク", "モノショック",
                 "ダイヤモンドフレーム", "V型", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "ベルトドライブ", "ABS", "セルスタート"],
    },
    {
        "name": "1290 SUPER DUKE R",
        "maker": "KTM",
        "displacement": 1301, "year": 2024,
        "max_power": 180, "max_torque": 140, "seat_height": 835,
        "description": "KTMの「ザ・ビースト」。V型2気筒の爆発的なパワーとトレリスフレーム。",
        "tags": ["KTM", "ネイキッド", "水冷", "倒立フォーク", "モノショック",
                 "トレリスフレーム", "V型", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "RSV4 Factory",
        "maker": "Aprilia",
        "displacement": 1099, "year": 2024,
        "max_power": 217, "max_torque": 125, "seat_height": 851,
        "description": "アプリリアのV4スーパースポーツ。65度V4エンジンとAPRCによる最先端電子制御。",
        "tags": ["Aprilia", "スーパースポーツ", "水冷", "倒立フォーク", "モノショック",
                 "ツインスパーフレーム", "V型", "四気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "チェーン", "コーナリングABS", "セルスタート"],
    },
    {
        "name": "V7 Stone",
        "maker": "Moto Guzzi",
        "displacement": 853, "year": 2024,
        "max_power": 65, "max_torque": 73, "seat_height": 780,
        "description": "モト・グッツィの縦置きV型2気筒。シャフトドライブと独特の鼓動が魅力。",
        "tags": ["Moto Guzzi", "ネオクラシック", "空冷", "テレスコピックフォーク", "ツインショック",
                 "ダイヤモンドフレーム", "V型", "二気筒", "2バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "シャフトドライブ", "ABS", "セルスタート"],
    },
    {
        "name": "Chief Dark Horse",
        "maker": "Indian",
        "displacement": 1890, "year": 2024,
        "max_power": 100, "max_torque": 162, "seat_height": 665,
        "description": "インディアンのクルーザー。サンダーストローク116 V型2気筒の豊かなトルク。",
        "tags": ["Indian", "クルーザー", "空冷", "テレスコピックフォーク", "モノショック",
                 "ダイヤモンドフレーム", "V型", "二気筒", "4バルブ",
                 "フューエルインジェクション", "湿式クラッチ", "ベルトドライブ", "ABS", "セルスタート"],
    },
]


def seed():
    db = SessionLocal()

    if db.query(Tag).count() > 0:
        print("データ既存のためスキップ（再投入するには moto_catalog.db を削除してください）")
        db.close()
        return

    # タグ作成
    tags = {}
    for category, names in TAGS.items():
        for name in names:
            t = Tag(name=name, category=category)
            db.add(t)
            tags[name] = t
    db.flush()

    # バイクデータ投入
    for b in BIKES:
        tag_names = b.pop("tags")
        bike = Motorcycle(**b)
        bike.tags = [tags[t] for t in tag_names]
        db.add(bike)

    db.commit()
    db.close()
    print(f"シードデータ投入完了: {len(BIKES)}車種, {sum(len(v) for v in TAGS.values())}タグ")


if __name__ == "__main__":
    seed()
