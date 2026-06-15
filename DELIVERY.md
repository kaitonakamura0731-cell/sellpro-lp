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

## 7. 自社サーバーでホストする場合（Vercel以外）

Vercelは検証用の暫定ホストです。自社サーバーで運用する場合、**公開LPとCMSで前提が異なります**。

### 7-1. 公開LP（静的）— どのサーバーでもそのまま動く
```bash
npm install
npm run build      # dist/ に純粋な静的サイトが出力される
```
`dist/` の中身を nginx / Apache / 任意の静的ホスティングに置くだけで公開できます（Node実行環境は不要）。動作確認は `npx serve dist` でも可。

### 7-2. CMS（`/admin/`）— 自社サーバーでの動かし方
自社サーバーでCMSを使うか使わないかで、次の (A) / (B) いずれかになります。**(A) を推奨**（同梱の `server.js` で配線不要）。

- **(A) 自社サーバーでCMSも使う（同梱の `server.js` を使えば配線不要）**：本納品物には自己完結サーバー `server.js` を同梱しています。GitHub / Vercel は不要で、次の3手順だけで `http://localhost:4321` にLPと `/admin/` が両方立ち上がります。
  1. `npm install`（依存取得。`server.js` 自体は追加依存なし＝Node組み込みのみ）
  2. `npm run build`（初回のみ。`dist/` が無ければ `server.js` 起動時に自動実行されます）
  3. `SELLPRO_ADMIN_PASSWORD=xxx npm run serve`（`xxx` は管理画面のログインパスワード。ポートを変えるなら `PORT=8080 SELLPRO_ADMIN_PASSWORD=xxx npm run serve`）

  管理画面で保存すると、`server.js` が**ローカルの `src/data/*.json`（画像/PDFは `public/<folder>/`）を直接更新し、自動で `npm run build` を実行して `dist/` に反映**します。GitHub へのコミットも外部CIも不要です。常時運用する場合は `npm run serve` を systemd / pm2 等のプロセス管理下に置き、リバースプロキシ（nginx 等）で公開してください。
- **(B) CMSを使わず JSON を直接編集する（エンジニア運用なら現実的）**：管理画面を使わず、`src/data/*.json` を直接編集し、画像は `public/` に置き、`npm run build` → `dist/` を再配信。**コンテンツの実体は `src/data/*.json` と `public/` のファイルなので、CMSが無くても全項目を更新できます**（仕様は `src/data/README-CMS.md`）。CMS（`/admin/` と `api/`）は不要なら削除してもLP本体は影響を受けません。

> 補足：`api/admin-content.js` / `api/admin-upload.js` は **Vercel Serverless Functions ＋ GitHub Contents API** 用の実装で、Vercelホスト時に使われます。自社サーバーでは代わりに `server.js`（GitHub不要・ローカルfsに直接書き込み）が同じAPIパスを提供するため、管理画面（`admin.astro`）は無改修でそのまま動きます。

> まとめ：**公開LPは静的でポータブル**。自社ホストでCMSも使うなら **(A) `npm run serve`（`server.js`）一発**、エンジニアがJSONを直接触るなら **(B) JSON直編集**。

## 8. 残課題・申し送り
- **本番ドメイン未確定**：確定後に `astro.config.mjs` の `site:` を差し替える（現状は暫定で Vercel のURL）。あわせて **`public/robots.txt` の `Sitemap:` 行は手動更新が必要**です（このファイルは静的でビルド時に自動置換されないため、`site:` 変更時に同じドメインへ書き換えてください）。
- **コンテンツの一部はサンプル**：インタビュー等は差し替え前提のサンプル文面です。**サンプルのアバターに実在風の人物写真が紐づいている場合があるため、公開前に必ず実データ（実際の導入企業の声・本人許諾のある写真）へ差し替えるか、サンプル表記を維持してください**（架空の声を実在の写真で出すと肖像・景品表示法上の問題になり得ます）。
- **問い合わせ先**：`src/pages/contact.astro` の問い合わせメール（mailto）が正しい運用窓口かを公開前に確認してください。フォーム自体はメール下書きを開くモック実装のため、本番運用ではフォームエンドポイント（GAS等）への接続を検討してください。
- **依存の既知脆弱性**：`npm audit` で astro 4系などの既知警告が出ますが、静的配信（`dist/`）では実行時影響は限定的です。CMS（`api/`）を自社のNodeで常時稼働させる場合のみ、依存アップデート（メジャー更新のため要回帰確認）を検討してください。
