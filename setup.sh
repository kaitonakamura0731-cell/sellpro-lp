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
echo "     ADMIN_PATH=/秘匿パス/ SELLPRO_ADMIN_PASSWORD=好きなパスワード npm run serve"
echo ""
echo "   → http://localhost:4321          （公開ページ）"
echo "   → http://localhost:4321/秘匿パス/ （管理画面 / 上のパスワードでログイン）"
echo "   ※ ADMIN_PATH は管理画面の秘匿URL。本番では必ず設定を推奨（素の /admin/ は 404 になり外部から隠せる）。"
echo "     省略すると /admin/ で配信されます（開発用）。ポート変更は PORT=8080 を頭に付ける。"
echo ""
echo " ● お問い合わせメールも送る場合（SMTP）: 上の起動コマンドに SMTP 設定を足します。"
echo ""
echo "     ADMIN_PATH=/秘匿パス/ SELLPRO_ADMIN_PASSWORD=好きなパスワード \\"
echo "       SELLPRO_SMTP_HOST=smtp.example.com SELLPRO_SMTP_USER=送信メール SELLPRO_SMTP_PASS=パスワード \\"
echo "       npm run serve"
echo ""
echo "   ※ 届け先は src/data/site.json の contact.email（公開前に正式アドレスへ要変更）。"
echo "     SMTP 未設定なら、送信ボタンでメールソフトが開く mailto 方式で動作します。"
echo "     Gmail/Workspace は『アプリパスワード』が必要（詳細は README.md「お問い合わせメール（SMTP）」）。"
echo ""
echo " ● 公開ページだけを静的配信する場合（Node不要）:"
echo "     dist/ の中身を nginx / Apache 等のWebサーバーに置くだけ。"
echo "     （この方式では管理画面とメール送信は使えず、問い合わせは mailto になります）"
echo ""
echo " 詳細は README.md（特に「お問い合わせメール（SMTP）」）と DELIVERY.md を参照してください。"
echo "------------------------------------------------------------"
