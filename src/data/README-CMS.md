# SellPro LP コンテンツ更新ガイド

## 基本運用

管理ページからデータを更新できます。

- 管理ページ: <https://sellpro-lp.vercel.app/admin/>

管理ページでは GitHub の接続情報やトークンを入力しません。
管理パスワードで開き、保存するとGitHubのJSONファイルへ自動コミットされます。
`main` にコミットされると GitHub Actions 経由でVercel本番へ反映されます。

編集はフォーム入力が基本です。必要な場合だけ、各編集画面の「JSONを確認・直接編集」を開いて細かく調整できます。

---

## 編集対象

| 対象 | 編集ファイル | 画像/ファイルの置き場所 |
| --- | --- | --- |
| 常時表示バナー | `src/data/banner.json` | `public/banner/` |
| 資料一覧ページ | `src/data/docs.json` | `public/docs/` |
| 導入インタビュー | `src/data/interviews.json` | `public/product/` |
| 導入企業ロゴ一覧 | `src/data/logos.json` | `public/logos/` |
| FAQ | `src/data/faqs.json` | なし |

画像やPDFの新規追加は、先にリポジトリへファイルを追加してからJSONで参照します。
既存ファイルを使う更新は管理ページだけで反映できます。

---

## サーバー設定

管理ページの保存機能には、Vercel本番環境変数が必要です。

| 変数名 | 用途 |
| --- | --- |
| `SELLPRO_ADMIN_PASSWORD` | 管理ページのパスワード |
| `GITHUB_CONTENT_TOKEN` | GitHub Contents APIでJSONを更新するサーバー側トークン |
| `GITHUB_OWNER` | 省略可。既定値 `kaitonakamura0731-cell` |
| `GITHUB_REPO` | 省略可。既定値 `sellpro-lp` |
| `GITHUB_BRANCH` | 省略可。既定値 `main` |

`GITHUB_CONTENT_TOKEN` はブラウザには出ません。
権限は対象リポジトリのContents読み書きだけに絞るのが理想です。

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
- `link`: クリック先URL
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

## ローカルでの確認

```bash
# プロジェクトルートで実行
npm run build
git push origin main
```

---

## 注意

- JSONのカンマ抜け、括弧の閉じ忘れがあると保存やビルドが失敗します。
- `atlas` / `Atlas Shift` の表記は入れないでください。制作元の社名であり、SellProの公開サイト上に出すべき情報ではないためです。
- `双日` の表記は入れないでください。本サービスと無関係の企業名であり、誤解や権利上の問題を避けるためです。
