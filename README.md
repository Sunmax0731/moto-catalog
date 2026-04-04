# Moto Catalog - バイク図鑑

自動二輪の図鑑Webサービスです。メーカー・車種タイプ・排気量・特徴などのタグで絞り込み検索ができます。

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| バックエンド | FastAPI (Python) |
| データベース | SQLite + SQLAlchemy |

## ディレクトリ構成

```
moto-catalog/
├── api/                          # バックエンドAPI
│   ├── app/
│   │   ├── main.py               # FastAPI エントリポイント
│   │   ├── database.py           # DB接続設定
│   │   ├── models.py             # Motorcycle, Tag モデル
│   │   ├── schemas.py            # レスポンス型定義
│   │   ├── seed.py               # シードデータ投入
│   │   └── routers/
│   │       └── motorcycles.py    # バイク・タグ API
│   └── requirements.txt
└── web/                          # フロントエンド
    └── src/
        ├── App.tsx
        ├── api/client.ts         # API通信
        ├── types/index.ts        # TypeScript型
        └── components/
            └── CatalogPage.tsx   # 図鑑UI（タグフィルタ・検索）
```

## セットアップ

### 前提条件

- Python 3.11+
- Node.js 18+

### バックエンド

```bash
cd api
pip install -r requirements.txt
python -m app.seed    # 初回のみ（シードデータ投入）
uvicorn app.main:app --port 8000
```

### フロントエンド

```bash
cd web
npm install
npm run dev
```

## 使い方

1. バックエンドを起動（http://localhost:8000）
2. フロントエンドを起動（http://localhost:5173）
3. ブラウザで http://localhost:5173 にアクセス
4. タグをクリックして絞り込み、車名で検索

## API エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/motorcycles` | バイク一覧（`?maker=`, `?tag_ids=`, `?q=` で絞り込み） |
| GET | `/api/motorcycles/{id}` | バイク詳細 |
| GET | `/api/motorcycles/tags/all` | タグ一覧（`?category=` で絞り込み） |

## シードデータ

8車種（HONDA, YAMAHA, SUZUKI, KAWASAKI 各2台）と20種のタグが登録されます。
