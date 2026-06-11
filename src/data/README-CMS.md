# SellPro LP コンテンツ編集ガイド（CMS）

## かんたん編集（推奨）

**ブラウザだけで編集できます。**

1. <https://sellpro-lp.vercel.app/admin/> を開く
2. アクセストークン（PAT）を入力して「接続」（初回のみ。作り方は画面内の折りたたみに記載）
3. タブで「バナー / 資料一覧 / インタビュー / ロゴ / FAQ」を編集 → 各セクションの「保存」を押す
4. **保存すると自動でサイトに反映されます（1〜2分）**。ビルドやデプロイの操作は不要です。

画像・PDFの差し替えもこの画面からアップロードできます。
JSONやコマンドを触る必要はありません。困ったら下の「上級者向け」を参照してください。

---

## 上級者向け（JSON直接編集）

ここから先は、`src/data/` 内のJSONファイルを直接編集してビルド・デプロイする従来の方法です。
通常は上の「かんたん編集」で十分です。

**`src/data/` 内のJSONファイルを編集 → ビルド → デプロイ** で内容を更新します。

編集できるのは次の5つです。

| 対象 | 編集ファイル | 画像/ファイルの置き場所 |
| --- | --- | --- |
| 導入インタビュー | `src/data/interviews.json` | `public/product/`（アバター画像） |
| 常時表示バナー | `src/data/banner.json` | `public/banner/` |
| 資料一覧ページ | `src/data/docs.json` | `public/docs/`（PDF等） |
| 導入企業ロゴ一覧 | `src/data/logos.json` | `public/logos/` |
| FAQ | `src/data/faqs.json` | ― |

---

## 編集 → 反映の流れ

```bash
# 1. JSONや画像/PDFを編集・差し替え
# 2. ビルド
npm run build
# 3. dist/ をデプロイ（Vercel等。普段のデプロイ手順と同じ）
```

JSONを書き換えたら **必ず `npm run build` が成功すること** を確認してください。
JSONの書式が壊れている（カンマ抜け・括弧の閉じ忘れ等）とビルドが失敗します。

---

## 1. 導入インタビュー — `src/data/interviews.json`

インタビューカードの一覧です。配列の各要素が1枚のカードになります。

```json
[
  {
    "sample": true,
    "org": "メーカー業界 営業企画部門",
    "scale": "従業員規模 約7,000名",
    "role": "導入ご担当者",
    "avatar": "product/iv-avatar-maker.webp",
    "qa": [
      { "q": "質問1", "a": "回答1" },
      { "q": "質問2", "a": "回答2" }
    ]
  }
]
```

### 項目の意味

| 項目 | 説明 |
| --- | --- |
| `sample` | `true` のときだけ、そのカードに金色の「SAMPLE」チップが付きます。実際のインタビューに差し替えたら `false` にしてください。|
| `org` | 業界・部門（社名は出さない運用）|
| `scale` | 従業員規模など |
| `role` | 立場（例: 導入ご担当者）|
| `avatar` | アバター画像のパス。`public/` からの相対パスで書きます（例: `product/iv-avatar-maker.webp`）。画像は `public/product/` に置いてください。|
| `qa` | Q&Aの配列。`q`=質問、`a`=回答。何問でも増やせます。|

### サンプル注記の自動表示について

セクション上部の「**※ インタビュー内容はサンプルです**」という帯は、
**`sample: true` のカードが1枚でもある場合だけ** 自動で表示されます。
すべてのカードを `sample: false`（実物）にすると、帯もSAMPLEチップも自動で消えます。
手動で消す必要はありません。

### インタビューを1件追加する例

配列の末尾に `,` で区切って要素を足します。

```json
[
  { "...既存のカード...": "..." },
  {
    "sample": false,
    "org": "製造業 情報システム部門",
    "scale": "従業員規模 約1,200名",
    "role": "導入ご担当者",
    "avatar": "product/iv-avatar-maker.webp",
    "qa": [
      { "q": "導入前の課題は？", "a": "資料作成に時間がかかっていました。" },
      { "q": "導入後の効果は？", "a": "作成時間が大きく減りました。" }
    ]
  }
]
```

> アバター画像を新しく用意する場合は、正方形の画像を `public/product/` に置き、
> `avatar` にそのファイル名を指定してください（例: `"avatar": "product/iv-avatar-new.webp"`）。

---

## 2. 常時表示バナー — `src/data/banner.json`

画面右下に固定表示される告知カードです。

```json
{
  "enabled": true,
  "image": "banner/sample-banner.webp",
  "alt": "ウェビナー告知バナー（サンプル）",
  "link": "https://onesteps.co.jp/",
  "newTab": true
}
```

| 項目 | 説明 |
| --- | --- |
| `enabled` | `true` で表示、`false` で非表示。一時的に消したいときは `false` にするだけです。|
| `image` | カバー画像のパス。画像は `public/banner/` に置き、`banner/ファイル名` で指定します。|
| `alt` | 画像の代替テキスト（読み上げ・画像が出ないときの説明文）。|
| `link` | クリック時の遷移先URL。|
| `newTab` | `true` で別タブ、`false` で同じタブで開きます。|

### バナー画像を差し替える手順

1. 新しい画像（横長・例: 1200×440px 程度、`.webp` か `.png` か `.jpg`）を `public/banner/` に置く
2. `banner.json` の `image` をそのファイル名に変更（例: `"image": "banner/webinar-2026.webp"`）
3. `link` を告知先のURLに変更
4. `npm run build` → デプロイ

> 閉じるボタン（×）でユーザーが消すと、そのブラウザのセッション中は再表示されません
> （タブを閉じて開き直すとまた表示されます）。

---

## 3. 資料一覧ページ — `src/data/docs.json`

`/docs/` ページに並ぶダウンロード資料の一覧です。

```json
[
  {
    "title": "SellPro ご紹介資料",
    "description": "サービス概要・機能・活用事例をまとめた説明資料",
    "file": "docs/sellpro-introduction.pdf",
    "date": "2026-05",
    "available": true
  },
  {
    "title": "導入事例集",
    "description": "業界別の導入事例をまとめた資料",
    "file": "",
    "date": "",
    "available": false
  }
]
```

| 項目 | 説明 |
| --- | --- |
| `title` | 資料名 |
| `description` | 説明文（1〜2行）|
| `file` | ファイルのパス。PDF等を `public/docs/` に置き、`docs/ファイル名` で指定します。|
| `date` | 更新年月など（任意。表示用の文字列。例: `2026-05`）|
| `available` | `true` でダウンロード可能カード（ファイルサイズ＋ダウンロードボタンを表示）。`false` で「準備中」のグレーカードになります。|

> ファイルサイズは `public/docs/` の実ファイルから自動で計算して表示されます。手入力は不要です。

### 「準備中」の資料を公開する手順

1. PDF等を `public/docs/` に置く（例: `public/docs/case-studies.pdf`）
2. 該当エントリの `file` にパスを設定（例: `"file": "docs/case-studies.pdf"`）
3. `available` を `true` に変更
4. `date` を必要なら設定
5. `npm run build` → デプロイ

---

## 4. 導入企業ロゴ一覧 — `src/data/logos.json`

トップページの「導入企業」ロゴウォールに表示されるロゴの一覧です。

```json
[
  { "file": "hokuriku.png", "name": "株式会社北陸銀行" },
  { "file": "arara.svg", "name": "アララ", "pending": true }
]
```

| 項目 | 説明 |
| --- | --- |
| `file` | ロゴ画像のファイル名。画像は `public/logos/` に置き、ファイル名だけ（パスなし）で指定します。|
| `name` | 企業名（alt テキストおよびツールチップ用）。|
| `pending` | `true` にすると「確認中」バッジが付きます。正式ロゴが届いたらこのキーごと削除してください。省略すると通常表示になります。|

### ロゴを追加する手順

1. 画像（`.png` / `.svg` / `.jpg` など）を `public/logos/` に置く
2. 配列の末尾に `,` で区切って要素を追加する
3. `npm run build` → デプロイ

### 「確認中」バッジをまとめて消す方法

`logos.json` 内の `"pending": true` を持つエントリからそのキーを削除するか、
CSS の `[data-pending]::after` ルール（`src/styles/exa.css`）を削除すれば全バッジが一括で消えます。

---

## 5. FAQ — `src/data/faqs.json`

トップページの「よくあるご質問」セクションと、検索エンジン向けの JSON-LD（FAQPage）に使われます。
**両方に同じデータが使われる**ため、このファイルを編集するだけで双方が更新されます。

```json
[
  {
    "q": "質問文",
    "a": "回答文"
  }
]
```

| 項目 | 説明 |
| --- | --- |
| `q` | 質問文（表示とJSON-LDの両方に使われます）|
| `a` | 回答文（同上）|

### FAQ を追加・編集する例

配列の末尾に `,` で区切って要素を足します。順序は配列の順番通りに表示されます。

```json
[
  { "...既存の質問...": "..." },
  {
    "q": "導入に必要な環境を教えてください。",
    "a": "Webブラウザが使える環境であれば、追加のインストールは不要です。"
  }
]
```

---

## その他の差し替えポイント

コンテンツファイル（JSON）ではなくソースコードを直接編集が必要な箇所です。

| 差し替え内容 | 場所 |
| --- | --- |
| 問い合わせ先メールアドレス | `src/pages/contact.astro` の 67行・140行・177行付近（`geriru0099@gmail.com`）|
| 資料 PDF の置き場 | `public/docs/`（`src/data/docs.json` の `file` フィールドと対応）|
| バナー画像の置き場 | `public/banner/`（`src/data/banner.json` の `image` フィールドと対応）|

---

## 反映方法

```bash
# 1. JSON・画像・PDF を編集・追加
# 2. ビルド
npm run build
# 3. Vercel にデプロイ（scope オプションは案件のプロジェクト名に合わせる）
vercel deploy --prod --yes
```

JSONを書き換えたら **必ず `npm run build` が成功すること** を確認してから、デプロイしてください。

---

## 困ったとき

- **ビルドが失敗する** → JSONのカンマ・括弧・ダブルクォートの閉じ忘れがほぼ原因です。
  エラーメッセージにファイル名と行が出るので、その付近を確認してください。
- **画像/PDFが表示されない** → `public/` 配下にファイルがあるか、JSONの `image`/`file`/`avatar` のパスが
  `public/` からの相対（先頭にスラッシュなし、例: `banner/foo.webp`）になっているか確認してください。
