#!/usr/bin/env bash
# =============================================================
#  SellPro LP セットアップスクリプト
#  使い方:  bash setup.sh        （Node.js 18 以上が必要）
#  実行内容: Node確認 → npm install → npm run build
# =============================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "============================================="
echo "  SellPro LP セットアップ"
echo "============================================="

# 1) Node.js の確認
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js が見つかりません。Node.js 18 以上をインストールしてから再実行してください。" >&2
  echo "   https://nodejs.org/" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
echo "✔ Node.js $(node -v) を検出"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "⚠ Node.js 18 以上を推奨します（現在 $(node -v)）。ビルドに失敗する場合はアップデートしてください。" >&2
fi

# 2) 依存インストール
echo "▶ 依存パッケージをインストールします (npm install) ..."
npm install

# 3) ビルド
echo "▶ 公開サイトをビルドします (npm run build) ..."
npm run build

echo ""
echo "✅ セットアップ完了しました。"
echo ""
echo "------------------------------------------------------------"
echo " 起動方法"
echo "------------------------------------------------------------"
echo " ● 管理画面つきで起動（保存すると自動で公開LPに反映）:"
echo ""
echo "     SELLPRO_ADMIN_PASSWORD=好きなパスワード npm run serve"
echo ""
echo "   → http://localhost:4321        （公開ページ）"
echo "   → http://localhost:4321/admin/ （管理画面 / 上のパスワードでログイン）"
echo "   ※ ポートを変えるには PORT=8080 を頭に付けてください。"
echo ""
echo " ● 公開ページだけを静的配信する場合（Node不要）:"
echo "     dist/ の中身を nginx / Apache 等のWebサーバーに置くだけ。"
echo ""
echo " 詳細は DELIVERY.md / 納品後セットアップガイド(PDF) を参照してください。"
echo "------------------------------------------------------------"
