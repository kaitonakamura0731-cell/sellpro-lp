# SellPro LP

スライド・議事録作成を自動化するAIエージェント「SellPro（セルプロ）」のランディングサイト。
公開ページ（トップ / 資料ダウンロード / お問い合わせ）と、コンテンツ更新用の管理ページで構成される。

## 技術スタック

| 区分 | 採用技術 |
| --- | --- |
| 静的サイトジェネレータ | [Astro](https://astro.build/) 4系 |
| ホスティング | **自社サーバー（`server.js`・本納品の標準）** または Vercel（暫定/任意） |
| CI / デプロイ | 自社サーバー方式は保存時に自動ビルド反映（push不要・GitHub/Vercel不要）。Vercel運用時のみ GitHub Actions（`main` push をトリガー） |
| サーバーレス関数 | `api/admin-content.js`＝保存 / `api/admin-upload.js`＝画像・PDFアップロード / `api/contact.js`＝お問い合わせメール送信（いずれも**Vercel運用時**。自社サーバーでは `server.js` が同等機能を内蔵） |

ビルドは静的HTMLを出力する。CSSは `inlineStylesheets: "always"` で各HTMLへインライン化される（`astro.config.mjs`）。

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー（既定 http://localhost:4321）
```

## ビルド・デプロイ

```bash
npm run build    # 静的サイトを dist/ に出力
npm run preview  # dist/ をローカルで確認
SELLPRO_ADMIN_PASSWORD=xxx npm run serve                            # 自社ホスト用サーバー server.js（LP＋/admin/ を GitHub/Vercel なしで配信。既定 http://localhost:4321）
ADMIN_PATH=/秘匿パス/ SELLPRO_ADMIN_PASSWORD=xxx npm run serve     # 管理画面を秘匿パスに移動（/admin/ は 404 になる）
# お問い合わせメールも飛ばす場合は SMTP 環境変数を併せて指定（下記「お問い合わせメール（SMTP）」参照）
ADMIN_PATH=/秘匿パス/ SELLPRO_ADMIN_PASSWORD=xxx \
  SELLPRO_SMTP_HOST=smtp.example.com SELLPRO_SMTP_USER=user@example.com SELLPRO_SMTP_PASS=app-password npm run serve
```

**自社サーバー方式（標準）**: `npm run serve`（`server.js`）で起動し、`dist/` が無ければ初回起動時に自動ビルドされる。管理画面の保存時にも自動でビルド・反映されるため、push は不要。

**Vercel 運用時のみ**: `main` ブランチへの push が本番反映の起点になる。

```
main へ push → GitHub Actions（.github/workflows/deploy.yml）→ Vercel 本番反映
```

## ディレクトリ構成

```
site/
├── astro.config.mjs        # site URL・sitemap・ビルド設定
├── api/
│   ├── admin-content.js     # 管理ページの保存API（Vercel運用時。GitHub Contents API 経由）
│   ├── admin-upload.js      # 管理ページの画像/PDFアップロードAPI（Vercel運用時。public/ へコミット）
│   └── contact.js           # お問い合わせメール送信API（Vercel運用時。自社サーバーは server.js が内蔵）
├── public/                  # 静的アセット（そのまま配信される）
│   ├── banner/              # バナー画像
│   ├── docs/                # 配布PDF
│   ├── logos/               # 導入企業ロゴ・サービスロゴ
│   ├── product/             # 製品画像・OGP画像
│   └── robots.txt
└── src/
    ├── layouts/
    │   └── BaseLayout.astro  # 公開3ページ共通の <head>（メタ/OGP/構造化データslot）
    ├── pages/
    │   ├── index.astro       # トップ（LP本体）
    │   ├── docs.astro        # 資料ダウンロード
    │   ├── contact.astro     # お問い合わせ
    │   └── admin.astro        # 管理ページ（noindex）
    ├── components/           # CtaBand / FeatureMock / FloatingBanner
    ├── data/                 # 編集対象のコンテンツJSON（下記参照）
    │   └── README-CMS.md      # コンテンツ更新ガイド
    └── styles/
        └── main.css           # サイト共通スタイル
```

## コンテンツ更新

掲載テキスト・ロゴ・FAQ・バナー・資料などのコンテンツは `src/data/` 配下のJSONで管理する。
更新手順とフォーマットは [`src/data/README-CMS.md`](src/data/README-CMS.md) を参照。

## Vercel 環境変数

管理ページ（`/admin`）の保存機能に必要。Vercel プロジェクト設定で登録する。

| 変数名 | 用途 | 必須 |
| --- | --- | --- |
| `SELLPRO_ADMIN_PASSWORD` | 管理ページのパスワード | 必須 |
| `GITHUB_CONTENT_TOKEN` | GitHub Contents API でJSONを更新するサーバー側トークン | 必須 |
| `GITHUB_OWNER` | リポジトリのオーナー（省略時は既定値） | 任意 |
| `GITHUB_REPO` | リポジトリ名（省略時は既定値） | 任意 |
| `GITHUB_BRANCH` | コミット先ブランチ（省略時は `main`） | 任意 |

GitHub Actions 側では、デプロイ用に `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` をリポジトリの Secrets に登録する。

## お問い合わせメール（SMTP）

お問い合わせフォームは、同一サーバーの API `/api/contact`（`server.js`／Vercel では `api/contact.js`）が受け取り、**SMTP でメール送信**する本実装。外部サービス（Google 等）は使わない。届け先は `src/data/site.json` の `contact.email`（管理画面で編集可）。

サーバー起動時に次の環境変数を設定するとメール送信が有効になる（`HOST`/`USER`/`PASS` の3つで有効化）。

| 変数名 | 用途 | 既定 |
| --- | --- | --- |
| `SELLPRO_SMTP_HOST` | SMTP サーバー（例 `smtp.example.com`） | （必須） |
| `SELLPRO_SMTP_USER` | SMTP ログインユーザー | （必須） |
| `SELLPRO_SMTP_PASS` | SMTP ログインパスワード／アプリパスワード | （必須） |
| `SELLPRO_SMTP_PORT` | ポート | `465` |
| `SELLPRO_SMTP_SECURE` | TLS。`false` で STARTTLS（587向け） | `true`（465時） |
| `SELLPRO_SMTP_FROM` | 差出人アドレス | `SELLPRO_SMTP_USER` |

未設定のあいだは `/api/contact` が `not-configured` を返し、フォームは `contact.email` への **mailto に自動フォールバック**（送信ボタンでメールソフトが起動）。設定すると自動でメール送信に切り替わる。公開前にテスト送信で `contact.email` に届くか確認すること。

### 設定例（よくあるパターン）

**Google Workspace / Gmail**（送信に使うアカウントで 2段階認証を有効化し「アプリパスワード」を発行）

```bash
SELLPRO_SMTP_HOST=smtp.gmail.com
SELLPRO_SMTP_PORT=465
SELLPRO_SMTP_USER=you@your-domain.com   # 送信に使うメールアドレス
SELLPRO_SMTP_PASS=xxxxxxxxxxxxxxxx       # 16桁のアプリパスワード（通常のログインPWではない）
```

**自社ドメインのメール（レンタルサーバー等の一般的なSMTP）**

```bash
SELLPRO_SMTP_HOST=smtp.your-host.example   # 契約メールのSMTPサーバー名
SELLPRO_SMTP_PORT=465                       # 587 の場合は SELLPRO_SMTP_SECURE=false も付ける
SELLPRO_SMTP_USER=info@your-domain.com
SELLPRO_SMTP_PASS=メールアカウントのパスワード
SELLPRO_SMTP_FROM=info@your-domain.com      # 任意。差出人を明示したいとき
```

> ヒント: 465 番が塞がれている環境では `SELLPRO_SMTP_PORT=587` と `SELLPRO_SMTP_SECURE=false`（STARTTLS）を使う。届け先（受信箱）は `src/data/site.json` の `contact.email` なので、送信元と受信先は別のアドレスでも問題ない。
> Vercel など `src/data/site.json` を実行時に読めない環境では、届け先を環境変数 `SELLPRO_CONTACT_EMAIL` で指定できる（自社サーバー `server.js` 方式では `site.json` をそのまま読むため不要）。

## 残課題

- 本番ドメイン確定後、`astro.config.mjs` の `site` と `public/robots.txt` の Sitemap URL を差し替える。
- プライバシーポリシーの正式URLが未確定。確定後にフッター・お問い合わせ同意文のリンクを差し替える。
- お問い合わせメールを実際に飛ばすには、公開環境で上記 SMTP 環境変数を設定する（コードは実装済み）。
