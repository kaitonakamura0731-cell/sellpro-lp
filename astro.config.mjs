import { defineConfig } from "astro/config";

// HP単体スタータ — site-build トーナメントが3方向の派生をここから作る
export default defineConfig({
  site: "https://example.com",
  trailingSlash: "ignore",
  compressHTML: true,
  build: {
    // file:// でのスクショ検証でも崩れないよう全CSSをインライン化（dist単体で完結させる）
    inlineStylesheets: "always",
  },
});
