# moto-catalog/web

バイク図鑑 frontend です。React + TypeScript + Vite で構成されており、API モードと GitHub Pages 向け static モードの 2 つを切り替えて動かします。

## よく使うコマンド

```bash
npm install
npm run dev
npm run lint
npm run build
npm run build:pages
npm run preview
```

## モードの違い

- `npm run dev`
  FastAPI (`http://<host>:8000/api`) を参照する通常の開発モードです。
- `npm run build`
  API モード前提の production build を生成します。
- `npm run build:pages`
  `.env.pages` を読み込み、static JSON + `HashRouter` 前提の GitHub Pages 用 build を生成します。

## 関連ファイル

- [../README.md](../README.md): リポジトリ全体の概要とセットアップ
- [../docs/development.md](../docs/development.md): データ更新・Pages 配信を含む開発運用メモ
- [src/api/client.ts](src/api/client.ts): API / static モード切り替え
- [src/AppRouter.tsx](src/AppRouter.tsx): `BrowserRouter` / `HashRouter` 切り替え
- [.env.pages](.env.pages): Pages build 用の環境変数
