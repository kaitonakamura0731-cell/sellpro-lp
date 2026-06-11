# SellPro LP コンテンツ更新ガイド

## 基本運用

ブラウザ上で直接保存するCMSは使いません。

更新したい内容は、次のページからメールで送ります。

- 更新依頼ページ: <https://sellpro-lp.vercel.app/admin/>

このページはサイトを直接書き換えません。
依頼内容を確認してから、ローカルでJSONや画像を更新し、通常のデプロイ手順で反映します。

---

## 反映手順

```bash
cd ~/projects/clients/sellpro/site
npm run build
git add src/data public
git commit -m "Update SellPro content"
git push origin main
```

`main` にpushすると GitHub Actions 経由でVercel本番へ反映されます。

---

## 編集対象

| 対象 | 編集ファイル | 画像/ファイルの置き場所 |
| --- | --- | --- |
| 常時表示バナー | `src/data/banner.json` | `public/banner/` |
| 資料一覧ページ | `src/data/docs.json` | `public/docs/` |
| 導入インタビュー | `src/data/interviews.json` | `public/product/` |
| 導入企業ロゴ一覧 | `src/data/logos.json` | `public/logos/` |
| FAQ | `src/data/faqs.json` | なし |

---

## バナー

`src/data/banner.json`

```json
{
  "enabled": true,
  "image": "banner/sample-banner.webp",
  "alt": "ウェビナー告知バナー（サンプル）",
  "link": "https://onesteps.co.jp/",
  "newTab": true
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
  { "file": "arara.svg", "name": "アララ", "pending": true }
]
```

- ロゴ画像は `public/logos/` に置く
- `file` はファイル名だけを書く
- `pending: true` で「確認中」バッジを表示
- 正式確認後は `pending` を削除

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

## 注意

- JSONのカンマ抜け、括弧の閉じ忘れがあるとビルドが失敗します。
- 編集後は必ず `npm run build` を実行します。
- `ATLAS` や `双日` の表記は入れないでください。
