# 開発メモ

このドキュメントは、バイク図鑑のローカル開発、データ更新、GitHub Pages 反映フローを短くまとめたものです。

## 1. 実行モード

| 項目 | API モード | Static モード |
| --- | --- | --- |
| 主な用途 | ローカル開発、API 検証 | GitHub Pages 配信 |
| データ源 | FastAPI + SQLite | `web/public/data/catalog-data.json` |
| ルーター | `BrowserRouter` | `HashRouter` |
| 代表コマンド | `npm run dev` | `npm run build:pages` |

Static モードでも、タグ絞り込み、`データなし`、`電気バイク` 補完、並び替え、ページネーションは frontend 側で再現されます。

## 2. 主な環境変数

| 変数 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | API モード時の backend base URL を上書きする |
| `VITE_STATIC_DATA_MODE` | `1` のとき static JSON を使う |
| `VITE_BASE_PATH` | Vite build 時の base path を指定する |
| `VITE_OUT_DIR` | Vite build の出力先を指定する |

`web/.env.pages` では、GitHub Pages 用に次の値を使います。

```dotenv
VITE_STATIC_DATA_MODE=1
VITE_BASE_PATH=/moto-catalog/
VITE_OUT_DIR=dist-pages
```

## 3. データ更新フロー

### 3-1. BikeBros データを再生成する

任意のメーカー群について、BikeBros カタログから JSON を更新します。

```bash
python scripts/generate_bikebros_catalog.py --makers HONDA YAMAHA SUZUKI KAWASAKI --workers 8
```

- 出力先: `api/app/data/bikebros/*.json`
- `--makers` は 1 つ以上必須です

### 3-2. SQLite を最新化する

`api/app/seed.py` は curated な `BIKES` と、`api/app/data/bikebros/*.json` をまとめて SQLite へ同期します。

```bash
cd api
python -m app.seed
```

- DB ファイル: `api/moto_catalog.db`
- 既存車両は `maker + name + model_code + year` をキーに更新されます

### 3-3. static JSON を出力する

GitHub Pages 用 snapshot を再生成します。

```bash
python scripts/export_static_catalog.py
```

- 入力: `api/moto_catalog.db`
- 出力: `web/public/data/catalog-data.json`

## 4. ローカル開発

### backend

```bash
cd api
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### frontend

```bash
cd web
npm install
npm run dev
```

既定では frontend は `http://<host>:8000/api` を参照します。

## 5. GitHub Pages 向け build

```bash
python scripts/export_static_catalog.py
cd web
npm run build:pages
```

- 出力先: `web/dist-pages/`
- 現在の公開運用では、この成果物を `Sunmax0731.github.io` リポジトリの `moto-catalog/` 配下へ反映しています
- source repo 側には deploy workflow は置かれていません

## 6. 検証

変更内容に応じて次を使います。

```bash
python -m compileall api/app
cd web
npm run lint
npm run build
npm run build:pages
```

UI を確認するときは Pages 配信相当の静的サーバで見るとズレが少なくなります。
