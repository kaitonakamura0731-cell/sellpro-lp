# SellPro LP — セットアップ手順書（Claude Code / AI エージェント向け）

このプロジェクトは One StepS「SellPro」紹介LP です。**Astro 製の静的サイト ＋ ブラウザ管理画面（`/admin/`）**。
**このフォルダ一式を受け取り、利用者から「セットアップして」と言われたら、この手順書に従って自動でセットアップ・公開まで進めてください。**

---

## ▶ 「セットアップして」と言われたら（エージェントの動き方）

### STEP 0. まず利用者に最小限ヒアリングする
セットアップに必要な情報だけを、まとめて質問してください（環境によって最適解が変わるため）。聞くのは次の7点：

1. **動かす場所**：このサーバー上で動かしますか？（OS / ディストリビューション、`node -v` で Node.js は入っていますか？無ければ入れて良いですか？）
2. **管理画面（/admin/）を使いますか？**
   - はい → Node常駐サーバー（`server.js`）方式でセットアップ
   - いいえ（更新はエンジニアが直接でOK） → 静的配信のみでセットアップ
3. **管理画面のログインパスワード**（任意の十分長い文字列を決めてもらう）※「はい」の場合
4. **管理画面の秘匿パス（`ADMIN_PATH`）を決めてもらう**（例: `/x7k2-manage/`）※「はい」の場合。推測されにくいランダム文字列を推奨。設定すると素の `/admin/` は 404 になり外部から存在を気づかれにくくなる。
5. **本番ドメイン**は決まっていますか？（例 `https://sellpro.example.jp`。canonical/OG/sitemap に使用）
6. **公開方法**：このサーバーで常時公開しますか？（nginx 等のリバースプロキシ・常駐化までやるか）
7. **お問い合わせメールの送信設定（SMTP）**：問い合わせフォームの内容をメールで受け取りますか？受け取る場合は次を確認する。
   - **届け先メールアドレス**（`src/data/site.json` の `contact.email`。既定 `geriru0099@gmail.com`。変更したい宛先があれば聞く）
   - **送信に使うメールの SMTP 情報**：`SELLPRO_SMTP_HOST` / `SELLPRO_SMTP_USER` / `SELLPRO_SMTP_PASS`（必要なら `SELLPRO_SMTP_PORT` 既定465・`SELLPRO_SMTP_SECURE`・`SELLPRO_SMTP_FROM`）。例: 自社ドメインのメールのSMTP、Google Workspace/Gmail なら `smtp.gmail.com` / ポート465 / ユーザー=メールアドレス / パスワード=**アプリパスワード**（2段階認証必須）。
   - ※ SMTPを設定しない場合は、送信ボタンで利用者のメールソフトが開く mailto 方式で動作する（届け先＝`contact.email`）。後から設定すれば自動でメール送信に切り替わる。

> 利用者には「サーバーへのログイン（アクセス権）まで用意してもらえれば、あとは全部こちらで進めます」と伝えてOK。アクセスさえあれば以降は自動で進められます。

### STEP 1. セットアップ（共通・自動）
```
bash setup.sh        # Node確認 → npm install → npm run build（OS問わず npm run setup でも可）
```

### STEP 2. 起動・公開（ヒアリング結果で分岐）
- **管理画面あり（Nodeサーバー方式）**：
  ```
  ADMIN_PATH=/<秘匿パス>/ SELLPRO_ADMIN_PASSWORD=<決めたパスワード> npm run serve
  ```
  → `http://localhost:4321`（公開）/ `http://localhost:4321/<秘匿パス>/`（管理画面）。`ADMIN_PATH` を省略すると `/admin/` で配信（開発用）。ポート変更は `PORT=8080` を頭に付ける。
  - **お問い合わせメールも送る場合**は SMTP 環境変数を併せて渡す（STEP 0 の 7）。届け先は `src/data/site.json` の `contact.email`。
    ```
    ADMIN_PATH=/<秘匿パス>/ SELLPRO_ADMIN_PASSWORD=<パスワード> \
      SELLPRO_SMTP_HOST=<SMTPホスト> SELLPRO_SMTP_USER=<ユーザー> SELLPRO_SMTP_PASS=<パスワード> \
      npm run serve
    ```
    SMTP を渡さなければ問い合わせは mailto フォールバックで動作（後から付けて再起動すればメール送信に切替）。
  常時公開するなら、この `npm run serve` を **systemd か pm2 で常駐化**し、**nginx 等のリバースプロキシ**で 80/443 に繋ぐところまで実施（利用者が常時公開を希望した場合）。**常駐化の際も上記の環境変数（`ADMIN_PATH`/`SELLPRO_ADMIN_PASSWORD`/`SELLPRO_SMTP_*`）を systemd の `Environment=` や pm2 の ecosystem に必ず引き継ぐこと。**
- **静的配信のみ**：`npm run build` で出た `dist/` の中身を nginx / Apache 等のドキュメントルートに配置するだけ（Node不要）。※この方式では管理画面とお問い合わせメール送信は使えず、問い合わせは mailto フォールバックになる。

### STEP 3. 本番ドメインの反映（ドメインが決まっている場合）
- `astro.config.mjs` の `site:` を本番ドメインに書き換える。
- `public/robots.txt` の `Sitemap:` 行も同じドメインに書き換える。
- `npm run build`（または管理画面方式なら再起動）で反映。

### STEP 4. 動作確認
- 公開ページ `/`・`/docs/`・`/contact/` が表示される。
- （管理画面方式なら）`/admin/` にログイン → 1項目編集 → 保存 → 公開ページに自動反映されることを確認。
- （SMTP設定したなら）`/contact/` から1件テスト送信 → `site.json` の `contact.email` に届くか確認。届かない場合は SMTP のホスト/ポート/ユーザー/パスワード（特にアプリパスワード）と、サーバーから送信ポート（465/587）への接続可否を確認する。

---

## 仕組み（編集と反映）
- コンテンツの実体は `src/data/*.json`（バナー / 資料 / インタビュー / ロゴ / FAQ）、画像・PDFは `public/`。
- 管理画面で保存すると、`server.js` が **ローカルの `src/data` / `public` を直接更新 → 自動で `npm run build` → `dist/` に反映**します。**GitHub も Vercel も不要**。
- `api/admin-content.js` / `api/admin-upload.js` は Vercel 運用時のみ使う実装。自社サーバーでは `server.js` が同じAPIを提供するため、管理画面（`src/pages/admin.astro`）は無改修で動きます。
- コンテンツ仕様の詳細は `src/data/README-CMS.md`。

## 環境変数
- `SELLPRO_ADMIN_PASSWORD`（管理画面方式で必須）… 管理画面のログインパスワード。
- `ADMIN_PATH`（推奨）… 管理画面の秘匿パス（例: `/x7k2-manage/`）。設定すると素の `/admin/` が 404 になり外部から見えなくなる。未設定時は `/admin/` で配信（開発用）。
- `PORT`（任意）… 既定 4321。
- **お問い合わせメール送信（SMTP）**: `SELLPRO_SMTP_HOST` / `SELLPRO_SMTP_USER` / `SELLPRO_SMTP_PASS`（この3つで有効化）／ `SELLPRO_SMTP_PORT`（既定465）／ `SELLPRO_SMTP_FROM`（任意・既定はUSER）／ `SELLPRO_SMTP_SECURE`（`false`でSTARTTLS）。届け先は `src/data/site.json` の `contact.email`。未設定時は `/api/contact` が `not-configured` を返し、フォームは mailto に自動フォールバック。
- ※ `GITHUB_*` は Vercel 運用時のみ。`server.js`（自社サーバー方式）では不要。

## 公開前チェック
- インタビュー等のサンプル文面・差し替え前提の画像は実データへ。
- お問い合わせフォーム（`src/pages/contact.astro`）は **`/api/contact` 経由で SMTP メール送信する本実装**。公開前に上記 SMTP 環境変数を設定し、テスト送信で `site.json` の `contact.email` に届くか確認すること（未設定なら mailto フォールバックで動作）。

詳細は `README.md` / `DELIVERY.md`、人向けの図解ガイドは同梱PDFを参照。
