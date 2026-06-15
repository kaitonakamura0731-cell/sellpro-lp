# SellPro LP コンテンツ更新ガイド

## 基本運用（自社サーバー方式・本納品の標準）

公開ページの内容（バナー / 資料 / インタビュー / ロゴ / FAQ）は、**管理画面（CMS）からブラウザで更新**できます。

- 管理ページ: サーバーを `npm run serve` で起動した場合、`http(s)://<あなたのドメイン>/<秘匿パス>/`
  （秘匿パス＝起動時に指定した `ADMIN_PATH`。例 `/x7k2-manage/`）。
  `ADMIN_PATH` を設定していない開発用では `/admin/` です。
- 管理パスワード（`SELLPRO_ADMIN_PASSWORD`）でログインします。GitHub の接続情報やトークンは不要です。
- **保存すると、サーバー（`server.js`）がローカルの `src/data/*.json`・`public/` を直接書き換え、自動で `npm run build` を実行して公開ページ（`dist/`）へ反映します。** GitHub も Vercel も使いません（数秒で反映）。

編集はフォーム入力です。フォームに無い項目（下記「お問い合わせ送信先」など）は、ファイルを直接編集します。

> Vercel で運用する場合のみ、保存は GitHub Contents API 経由（`GITHUB_CONTENT_TOKEN` 等が必要）になります。本納品の標準は上記の自社サーバー方式です。詳細は `DELIVERY.md` / `CLAUDE.md` を参照。

---

## 編集対象

### 管理画面（CMS）から編集できるもの

| 対象 | 編集ファイル | 画像/ファイルの置き場所 |
| --- | --- | --- |
| 常時表示バナー | `src/data/banner.json` | `public/banner/` |
| 資料一覧ページ | `src/data/docs.json` | `public/docs/` |
| 導入インタビュー | `src/data/interviews.json` | `public/product/` |
| 導入企業ロゴ一覧 | `src/data/logos.json` | `public/logos/` |
| FAQ | `src/data/faqs.json` | なし |

画像やPDFの新規追加は、管理画面のアップロード機能で `public/<フォルダ>/` に追加するか、先にファイルを置いてからJSONで参照します。

### ファイルを直接編集するもの（管理画面では編集不可）

| 対象 | 編集ファイル | 備考 |
| --- | --- | --- |
| お問い合わせ送信先 | `src/data/site.json` | `contact.email`（届け先メール）。下記「お問い合わせ送信先」参照。管理画面のタブはありません |

---

## サーバー設定（環境変数）

`npm run serve`（自社サーバー方式）で必要・任意の環境変数です。

| 変数名 | 要否 | 用途 |
| --- | --- | --- |
| `SELLPRO_ADMIN_PASSWORD` | 管理画面を使うなら必須 | 管理ページのログインパスワード |
| `ADMIN_PATH` | 推奨 | 管理画面の秘匿パス（例 `/x7k2-manage/`）。設定すると素の `/admin/` は 404 になり外部から見えなくなる |
| `SELLPRO_SMTP_HOST` / `SELLPRO_SMTP_USER` / `SELLPRO_SMTP_PASS` ほか | 任意 | お問い合わせメールを送る場合。詳細は `README.md`「お問い合わせメール（SMTP）」 |
| `PORT` | 任意 | 待ち受けポート（既定 4321） |

> **GitHub 系（`GITHUB_CONTENT_TOKEN` / `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH`）は Vercel 運用時のみ必要**です。自社サーバー（`server.js`）方式では一切使いません。

---

## バナー

`src/data/banner.json`

```json
{
  "enabled": true,
  "image": "banner/banner-docs.webp",
  "alt": "SellPro ご紹介資料 無料ダウンロード",
  "link": "/docs/",
  "newTab": false
}
```

- `enabled`: `true`で表示、`false`で非表示
- `image`: `public/banner/` に置いた画像を `banner/ファイル名` で指定
- `link`: クリック先URL。空文字 `""` にするとリンク無し（クリックしても遷移しない）バナーになる
- `newTab`: `true`で別タブ

---

## 資料

`src/data/docs.json`

```json
[
  {
    "title": "SellPro ご紹介資料",
    "description": "サービス概要・機能・活用事例をまとめた説明資料",
    "file": "docs/sellpro-introduction.pdf",
    "date": "2026-05",
    "available": true
  }
]
```

- PDFは `public/docs/` に置く
- `file` は `docs/ファイル名`
- `date` は空文字 `""` でも可（その場合は日付を表示しない）
- `available: false` にすると「準備中」表示

---

## 導入インタビュー

`src/data/interviews.json`

```json
[
  {
    "sample": true,
    "org": "メーカー業界 営業企画部門",
    "scale": "従業員規模 約7,000名",
    "role": "導入ご担当者",
    "avatar": "product/iv-avatar-maker.webp",
    "qa": [
      { "q": "質問", "a": "回答" }
    ]
  }
]
```

- `sample: true` のカードが1枚でもある場合、サンプル注記を表示
- 実インタビューに差し替えたら `sample: false`
- アバター画像は `public/product/` に置く

---

## ロゴ

`src/data/logos.json`

```json
[
  { "file": "hokuriku.png", "name": "株式会社北陸銀行" },
  { "file": "arara.svg", "name": "アララ" }
]
```

- ロゴ画像は `public/logos/` に置く
- `file` はファイル名だけを書く
- 公開ページではロゴにステータスバッジを表示しない

---

## FAQ

`src/data/faqs.json`

```json
[
  {
    "q": "質問文",
    "a": "回答文"
  }
]
```

トップページのFAQ表示と、検索エンジン向けFAQ構造化データの両方に使われます。

---

## お問い合わせ送信先

`src/data/site.json`（**管理画面では編集できません。ファイルを直接編集します**）

```json
{
  "contact": {
    "email": "geriru0099@gmail.com"
  }
}
```

- `email` … お問い合わせフォームの**届け先メールアドレス**。ここを変えるだけで宛先が変わります。
  **既定値はテスト用アドレスです。公開前に必ず正式な受信用アドレスへ差し替えてください。**
- 送信のしくみ: フォーム → 同じサーバーの `/api/contact`（`server.js`）→ **SMTP でこの宛先へメール送信**。外部サービス（Google等）は使いません。
- **SMTP の有効化はサーバー作業（環境変数の設定＋サーバー再起動）です。** 非エンジニアの方が単独で行う作業ではないため、設置担当・エンジニアに依頼してください（設定値の詳細は `README.md`「お問い合わせメール（SMTP）」）。
- **SMTP 未設定のあいだ**は、送信ボタンで送信者のメールソフトが起動する mailto 方式で動作します（この宛先 `email` 宛）。SMTP を設定した瞬間に自動でメール送信へ切り替わります。
- 非エンジニアの方がこのファイルで確認・変更するのは `contact.email`（届け先）だけで十分です。

---

## ローカルでの確認・反映

**自社サーバー方式（標準）**: 管理画面で保存すれば自動でビルド・反映されます。ファイルを直接編集した場合は、サーバーを再起動するか `npm run build` を実行すれば `dist/` に反映されます。表示確認は次のいずれかで行えます。

```bash
# プロジェクトルートで実行
npm run serve      # 公開ページ＋管理画面を起動して確認（既定 http://localhost:4321）
# または
npm run build && npm run preview   # ビルド結果だけを確認
```

> Vercel で運用している場合のみ、反映は `git push origin main`（→ GitHub Actions → Vercel 本番）になります。本納品の標準は上記の自社サーバー方式です。

---

## 注意

- JSONのカンマ抜け、括弧の閉じ忘れがあると保存やビルドが失敗します。
- 公開サイトと無関係な社名・企業名（制作関係者や本サービスと関係のない他社の名称など）は記載しないでください。誤解や権利・コンプライアンス上の問題を避けるためです。
