# SellPro LP

スライド・議事録作成を自動化するAIエージェント「SellPro（セルプロ）」のランディングサイト。
公開ページ（トップ / 資料ダウンロード / お問い合わせ）と、コンテンツ更新用の管理ページで構成される。

## 技術スタック

| 区分 | 採用技術 |
| --- | --- |
| 静的サイトジェネレータ | [Astro](https://astro.build/) 4系 |
| ホスティング | Vercel |
| CI / デプロイ | GitHub Actions（`main` への push をトリガーに本番反映） |
| サーバーレス関数 | Vercel Functions（`api/admin-content.js`＝保存用 / `api/admin-upload.js`＝画像・PDFアップロード用） |

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
```

デプロイは `main` ブランチへの push が起点になる。

```
main へ push → GitHub Actions（.github/workflows/deploy.yml）→ Vercel 本番反映
```

## ディレクトリ構成

```
site/
├── astro.config.mjs        # site URL・sitemap・ビルド設定
├── api/
│   ├── admin-content.js     # 管理ページの保存API（GitHub Contents API 経由）
│   └── admin-upload.js      # 管理ページの画像/PDFアップロードAPI（public/ へコミット）
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

## 残課題

- 本番ドメイン確定後、`astro.config.mjs` の `site` と `public/robots.txt` の Sitemap URL を差し替える。
- プライバシーポリシーの正式URLが未確定。確定後にフッター・お問い合わせ同意文のリンクを差し替える。
- お問い合わせフォームは現状 `mailto` 方式のモック。本番では GAS 等のフォームエンドポイントへ差し替える。
