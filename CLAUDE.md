# SellPro LP — セットアップ手順書（Claude Code / AI エージェント向け）

このプロジェクトは One StepS「SellPro」紹介LP です。**Astro 製の静的サイト ＋ ブラウザ管理画面（`/admin/`）**。
**このフォルダ一式を受け取り、利用者から「セットアップして」と言われたら、この手順書に従って自動でセットアップ・公開まで進めてください。**

---

## ▶ 「セットアップして」と言われたら（エージェントの動き方）

### STEP 0. まず利用者に最小限ヒアリングする
セットアップに必要な情報だけを、まとめて質問してください（環境によって最適解が変わるため）。聞くのは次の5点：

1. **動かす場所**：このサーバー上で動かしますか？（OS / ディストリビューション、`node -v` で Node.js は入っていますか？無ければ入れて良いですか？）
2. **管理画面（/admin/）を使いますか？**
   - はい → Node常駐サーバー（`server.js`）方式でセットアップ
   - いいえ（更新はエンジニアが直接でOK） → 静的配信のみでセットアップ
3. **管理画面のログインパスワード**（任意の十分長い文字列を決めてもらう）※「はい」の場合
4. **本番ドメイン**は決まっていますか？（例 `https://sellpro.example.jp`。canonical/OG/sitemap に使用）
5. **公開方法**：このサーバーで常時公開しますか？（nginx 等のリバースプロキシ・常駐化までやるか）

> 利用者には「サーバーへのログイン（アクセス権）まで用意してもらえれば、あとは全部こちらで進めます」と伝えてOK。アクセスさえあれば以降は自動で進められます。

### STEP 1. セットアップ（共通・自動）
```
bash setup.sh        # Node確認 → npm install → npm run build（OS問わず npm run setup でも可）
```

### STEP 2. 起動・公開（ヒアリング結果で分岐）
- **管理画面あり（Nodeサーバー方式）**：
  ```
  SELLPRO_ADMIN_PASSWORD=<決めたパスワード> npm run serve
  ```
  → `http://localhost:4321`（公開）/ `http://localhost:4321/admin/`（管理画面）。ポート変更は `PORT=8080` を頭に付ける。
  常時公開するなら、この `npm run serve` を **systemd か pm2 で常駐化**し、**nginx 等のリバースプロキシ**で 80/443 に繋ぐところまで実施（利用者が常時公開を希望した場合）。
- **静的配信のみ**：`npm run build` で出た `dist/` の中身を nginx / Apache 等のドキュメントルートに配置するだけ（Node不要）。

### STEP 3. 本番ドメインの反映（ドメインが決まっている場合）
- `astro.config.mjs` の `site:` を本番ドメインに書き換える。
- `public/robots.txt` の `Sitemap:` 行も同じドメインに書き換える。
- `npm run build`（または管理画面方式なら再起動）で反映。

### STEP 4. 動作確認
- 公開ページ `/`・`/docs/`・`/contact/` が表示される。
- （管理画面方式なら）`/admin/` にログイン → 1項目編集 → 保存 → 公開ページに自動反映されることを確認。

---

## 仕組み（編集と反映）
- コンテンツの実体は `src/data/*.json`（バナー / 資料 / インタビュー / ロゴ / FAQ）、画像・PDFは `public/`。
- 管理画面で保存すると、`server.js` が **ローカルの `src/data` / `public` を直接更新 → 自動で `npm run build` → `dist/` に反映**します。**GitHub も Vercel も不要**。
- `api/admin-content.js` / `api/admin-upload.js` は Vercel 運用時のみ使う実装。自社サーバーでは `server.js` が同じAPIを提供するため、管理画面（`src/pages/admin.astro`）は無改修で動きます。
- コンテンツ仕様の詳細は `src/data/README-CMS.md`。

## 環境変数
- `SELLPRO_ADMIN_PASSWORD`（管理画面方式で必須）… `/admin/` のログインパスワード。
- `PORT`（任意）… 既定 4321。
- ※ `GITHUB_*` は Vercel 運用時のみ。`server.js`（自社サーバー方式）では不要。

## 公開前チェック
- インタビュー等のサンプル文面・差し替え前提の画像は実データへ。
- お問い合わせフォーム（`src/pages/contact.astro`）はメール下書きを開くモック実装。本番はフォーム送信先の接続を検討。

詳細は `README.md` / `DELIVERY.md`、人向けの図解ガイドは同梱PDFを参照。
