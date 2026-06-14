import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// SellPro LP（Astro 静的サイト）。本番ドメイン確定後に site を差し替える。
export default defineConfig({
  site: "https://sellpro-lp.vercel.app",
  trailingSlash: "ignore",
  compressHTML: true,
  integrations: [
    // sitemap-index.xml を生成。管理ページ（/admin）はインデックス対象外なので除外する。
    sitemap({
      filter: (page) => !page.includes("/admin"),
    }),
  ],
  build: {
    // 全 CSS をインライン化し、dist 単体で表示が完結するようにする（オフライン/ファイル単体での表示確認に対応）。
    inlineStylesheets: "always",
  },
});
