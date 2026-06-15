# SellPro LP — 納品ドキュメント（移管手順書）

One StepS「SellPro」紹介LP一式の納品ドキュメントです。本リポジトリの内容と、**先方環境で自前運用するための手順**をまとめています。

---

## 1. 構成概要

2層構成です。

| 層 | 内容 | 依存 |
|---|---|---|
| 公開LP（静的） | トップ `/`・資料 `/docs/`・問い合わせ `/contact/` | Astro 4（静的生成）。どこでもホスト可 |
| 管理CMS（`/admin/`） | 公開コンテンツをブラウザから編集 | Vercel Serverless Functions ＋ GitHub Contents API ＋ 環境変数 |

CMSは「ブラウザで編集 → `src/data/*.json`（＋画像は `public/`）へGitHub経由でコミット → 再ビルドで本番反映（数分）」という仕組みです。

### ディレクトリ
```
.
├─ astro.config.mjs        # Astro設定（site, sitemap, 等）
├─ package.json
├─ api/
│   ├─ admin-content.js     # CMSのデータ保存API（src/data/*.json を更新）
│   └─ admin-upload.js      # CMSの画像/PDFアップロードAPI（public/ へ保存）
├─ public/                  # 静的アセット（banner/ docs/ logos/ product/ admin-icons/ robots.txt）
└─ src/
    ├─ layouts/BaseLayout.astro   # 公開3ページ共通の<head>（SEO一元管理）
    ├─ pages/                     # index / docs / contact / admin
    ├─ components/                # CtaBand / FeatureMock / FloatingBanner
    ├─ data/                      # banner.json docs.json interviews.json logos.json faqs.json + README-CMS.md
    └─ styles/main.css            # 公開LPのスタイル
```

---

## 2. セットアップ（ローカル）
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 静的ビルド（dist/ 生成）
npm run preview  # ビルド結果のプレビュー
```
公開LPの閲覧・ビルドに環境変数は不要です（CMSのAPIのみ後述の環境変数を使います）。

---

## 3. 本番デプロイ（推奨構成）

**推奨：Vercel ネイティブ Git 連携。**
Vercel管理画面で本リポジトリを Import すると、`main` への push で自動デプロイされます。`VERCEL_TOKEN` 等のsecret管理が不要で、保守が最も楽です。

> 本リポジトリには移行元の名残として `.github/workflows/deploy.yml`（GitHub Actions から `vercel deploy --prod` する方式）が含まれています。Vercelネイティブ連携に切り替える場合は **このワークフローを削除**してください（二重デプロイ・トークン失効の原因になります）。

---

## 4. 環境変数（CMSを動かすのに必須）

Vercel の Project Settings → Environment Variables（Production）に設定します。

| 変数 | 用途 | 備考 |
|---|---|---|
| `SELLPRO_ADMIN_PASSWORD` | `/admin/` のログインパスワード | 任意の十分に長い文字列 |
| `GITHUB_CONTENT_TOKEN` | CMSが `src/data/*.json` と `public/` をコミットするためのGitHub PAT | **本リポジトリへ write 権限**のあるトークン（Fine-grained PAT 推奨） |
| `GITHUB_OWNER` | リポジトリの owner | 省略時の既定はコード内に記載。**移管後は自分の値に上書き必須** |
| `GITHUB_REPO` | リポジトリ名 | 同上 |
| `GITHUB_BRANCH` | 対象ブランチ | 省略時 `main` |

> 管理パスワードはサーバ側でのみ照合し、`GITHUB_CONTENT_TOKEN` はクライアントに一切露出しません（CMSのフロントは管理パスワードのみを送信）。

---

## 5. CMS（`/admin/`）の使い方
- `/admin/` に管理パスワードでログイン。
- PC：左サイドバーでセクション切替（バナー/資料/インタビュー/ロゴ/FAQ）→ 中央で編集 → 右にライブプレビュー。
- スマホ：ハンバーガー(☰)でセクション切替、一覧→タップ編集。
- 画像/PDFはアップロードボタンで `public/` に直接保存（バナー画像・ロゴ・アバター・資料PDF）。
- 保存は GitHub コミット → 再ビルド経由のため、**本番反映まで数分**かかります。
- 詳細なデータ仕様は `src/data/README-CMS.md` を参照。

---

## 6. 移管時にやること（チェックリスト）
1. 本リポジトリを自社GitHubへ取り込む（transfer / 新規repoへ push / bundleから clone のいずれか）。
2. Vercel で当該リポジトリを Import（ネイティブGit連携）。`.github/workflows/deploy.yml` は削除。
3. Vercel に上記**環境変数**を設定（特に `GITHUB_CONTENT_TOKEN` は自社repoへ write 権限のPAT、`GITHUB_OWNER`/`GITHUB_REPO` を自社の値に）。
4. `astro.config.mjs` の `site:` を**本番ドメイン**に差し替え（canonical/OG/sitemap生成に使用）。
5. 独自ドメインを使う場合は Vercel でドメイン設定。
6. `/admin/` でログイン→1項目編集→保存→数分後に本番反映を確認（疎通テスト）。

---

## 7. 残課題・申し送り
- **本番ドメイン未確定**：確定後に `astro.config.mjs` の `site:` を差し替える（現状は暫定で Vercel のURL）。
- **コンテンツの一部はサンプル**：インタビュー等は差し替え前提のサンプル文面が含まれる場合があります。公開前に実データへ。
- フォーム（`/contact/`）はメール送信のモック実装です。本番運用ではフォームエンドポイント（GAS等）への接続を検討してください。
