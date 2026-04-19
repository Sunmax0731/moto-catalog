# Moto Catalog - バイク図鑑

バイク図鑑は、メーカー・車種タイプ・用途・スペック・装備タグから車両を絞り込み、比較しながら探せる Web アプリです。
公開中の Pages 版は `https://sunmax0731.github.io/moto-catalog/` で動作しています。

## 現在の主な機能

- 車名検索、プリセット、免許区分、車検有無、体格入力による探索導線
- 排気量、年式、出力、トルク、シート高、車重の範囲絞り込み
- メーカー・用途・機構タグの絞り込み
- タグごとの `1つ` / `複数` 選択、`データなし` 合成タグ、`0cc => 電気バイク` の補完
- お気に入り保存、比較候補トレイ、比較モーダル、検索条件 URL の共有
- 詳細ページ、似ているバイク提案、機構説明モーダル、GitHub Pages 向け static 配信

## 実行モード

| モード | 用途 | データ取得 | ルーター |
| --- | --- | --- | --- |
| API モード | ローカル開発、API 検証 | FastAPI (`/api`) | `BrowserRouter` |
| Static モード | GitHub Pages 配信、static preview | `web/public/data/catalog-data.json` | `HashRouter` |

Static モードでは、API と同等の絞り込み処理を frontend 側で再現しています。GitHub Pages ではこのモードを使います。

## 技術スタック

| 層 | 技術 |
| --- | --- |
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド | FastAPI + SQLAlchemy |
| データ保存 | SQLite (`api/moto_catalog.db`) |
| static 配信用データ | `web/public/data/catalog-data.json` |

## ディレクトリ構成

```text
moto-catalog/
├── api/
│   ├── app/
│   │   ├── data/bikebros/          # 生成済み BikeBros JSON
│   │   ├── routers/motorcycles.py  # 一覧・詳細・タグ API
│   │   ├── database.py             # SQLite 接続
│   │   ├── models.py               # SQLAlchemy モデル
│   │   ├── schemas.py              # API レスポンス型
│   │   └── seed.py                 # DB への同期
│   └── requirements.txt
├── scripts/
│   ├── export_static_catalog.py    # SQLite -> static JSON export
│   └── generate_bikebros_catalog.py
├── web/
│   ├── public/data/catalog-data.json
│   ├── src/
│   │   ├── api/                    # API / static 両対応クライアント
│   │   ├── components/             # 一覧・詳細 UI
│   │   ├── categoryHelp.ts         # 機構説明モーダル定義
│   │   └── catalogMeta.ts          # タグ補完・ページネーション補助
│   ├── .env.pages                  # Pages build 用 env
│   └── package.json
└── docs/
    └── development.md              # 開発・データ更新フロー
```

## セットアップ

### 1. API モードで起動する

```bash
cd api
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

別ターミナルで frontend を起動します。

```bash
cd web
npm install
npm run dev
```

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:8000`
- API base の既定値: `http://<host>:8000/api`

### 2. GitHub Pages 用 build を作る

static JSON を最新化してから build します。

```bash
python scripts/export_static_catalog.py
cd web
npm install
npm run build:pages
```

- 出力先: `web/dist-pages/`
- Pages build では `.env.pages` を使い、`VITE_STATIC_DATA_MODE=1` / `VITE_BASE_PATH=/moto-catalog/` / `VITE_OUT_DIR=dist-pages` を適用します。

## データ更新の流れ

1. 必要なら `scripts/generate_bikebros_catalog.py` で BikeBros データを再生成する
2. `api/app/seed.py` で curated データと生成データを SQLite に同期する
3. `scripts/export_static_catalog.py` で static JSON を再出力する
4. `web` を build して Pages 配信用成果物を更新する

最小コマンド例:

```bash
python scripts/generate_bikebros_catalog.py --makers HONDA YAMAHA SUZUKI KAWASAKI --workers 8
cd api
python -m app.seed
cd ..
python scripts/export_static_catalog.py
cd web
npm run build:pages
```

## 検証コマンド

```bash
python -m compileall api/app
cd web
npm run lint
npm run build
npm run build:pages
```

## 関連ドキュメント

- [web/README.md](web/README.md)
- [docs/development.md](docs/development.md)
