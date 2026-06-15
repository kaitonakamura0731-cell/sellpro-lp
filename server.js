// =============================================================================
// SellPro LP — 自社サーバー同梱ランタイム (server.js)
// -----------------------------------------------------------------------------
// 目的:
//   先方の自社サーバー上で「公開LP + 管理画面(/admin/)」を GitHub / Vercel 連携なしで
//   そのまま動かすための、自己完結 Node サーバー。
//
//   - 静的配信: dist/ をそのまま配る（npm run build の成果物）
//   - CMS保存:  管理画面が叩く /api/admin-content・/api/admin-upload を実装し、
//               保存内容を「ローカルの src/data/*.json / public/<folder>/」へ書き込み、
//               npm run build で dist/ を再生成して反映する。
//
// 設計方針:
//   - 依存追加なし（Node 組み込みモジュールのみ: http/fs/path/child_process/crypto）
//   - GitHub 関連の環境変数は一切使わない
//   - ビルドは直列化（同時実行させずキューで1本ずつ）
//
// 環境変数:
//   PORT                    待受ポート（既定 4321）
//   SELLPRO_ADMIN_PASSWORD  管理画面の認証パスワード
//                           未設定なら起動時に警告。保存API群は 503 を返す。
//
// 起動:
//   SELLPRO_ADMIN_PASSWORD=xxx node server.js
//   （dist/ が無ければ起動時に自動で npm run build を実行）
// =============================================================================

// 注: package.json が "type": "module" のため ESM で記述する。
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(ROOT, "dist");
const PUBLIC_DIR = path.join(ROOT, "public");

const PORT = Number(process.env.PORT) || 4321;
const ADMIN_PASSWORD = process.env.SELLPRO_ADMIN_PASSWORD || "";

// 管理画面の編集対象キー → src/data 内のファイル（api/admin-content.js と一致）
const FILES = {
  banner: "src/data/banner.json",
  docs: "src/data/docs.json",
  interviews: "src/data/interviews.json",
  logos: "src/data/logos.json",
  faqs: "src/data/faqs.json",
};

// アップロード先フォルダの許可リスト（api/admin-upload.js と一致）
const FOLDER_ALLOWLIST = new Set(["banner", "logos", "product", "docs"]);

// フォルダごとに許可する拡張子（api/admin-upload.js と一致）
const EXT_ALLOWLIST = {
  banner: new Set(["png", "jpg", "jpeg", "webp", "gif"]),
  logos: new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]),
  product: new Set(["png", "jpg", "jpeg", "webp", "gif"]),
  docs: new Set(["pdf"]),
};

// アップロード上限 8 MB（デコード後）
const MAX_BYTES = 8 * 1024 * 1024;

// 静的配信の拡張子 → Content-Type
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

// =============================================================================
// ビルド直列化
//   保存（JSON 書込 or 画像アップロード）のたびに npm run build を走らせるが、
//   同時に複数のビルドが走ると dist/ が壊れるため 1 本ずつ順番に実行する。
// =============================================================================
let buildChain = Promise.resolve();

/**
 * npm run build を直列にキューイングして実行する。
 * 直前のビルドが終わってから次を開始する。
 * @returns {Promise<void>} ビルド成功で resolve、失敗で reject(Error)
 */
function queueBuild() {
  const run = () =>
    new Promise((resolve, reject) => {
      console.log("[server] npm run build を実行中…");
      const child = spawn("npm", ["run", "build"], {
        cwd: ROOT,
        stdio: "inherit",
        // Windows でも npm を起動できるようにシェル経由にする
        shell: process.platform === "win32",
      });
      child.on("error", (err) => reject(err));
      child.on("close", (code) => {
        if (code === 0) {
          console.log("[server] ビルド完了。");
          resolve();
        } else {
          reject(new Error(`ビルドに失敗しました (exit code ${code})。`));
        }
      });
    });

  // 直前のビルドの成否に関わらず次を実行できるよう、catch でチェーンを継続させる
  const next = buildChain.then(run, run);
  // チェーン本体は常に resolve させ、呼び出し側には実際の結果を返す
  buildChain = next.catch(() => {});
  return next;
}

// =============================================================================
// 共通ユーティリティ
// =============================================================================

/** JSON レスポンスを返す（no-store） */
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

/** リクエストボディを読み JSON としてパースする */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      // ボディ過大を早期に弾く（base64 で 8MB → 約 11MB。余裕をみて 16MB）
      if (size > 16 * 1024 * 1024) {
        reject(new Error("リクエストボディが大きすぎます。"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("リクエストボディの JSON が不正です。"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * 内容から擬似 sha を作る（GitHub の blob sha の代替）。
 * 単一サーバー運用なので衝突検出には使わず、変更検知の目印として返すだけ。
 */
function contentSha(text) {
  return crypto.createHash("sha1").update(text, "utf8").digest("hex");
}

/**
 * 管理パスワードを検証する。
 * @returns {{ ok: boolean, status?: number, error?: string }}
 *   - 未設定: 503（保存・取得とも不可。先方に設定を促す）
 *   - 不一致: 401
 *   - 一致:   ok=true
 */
function checkAuth(req) {
  if (!ADMIN_PASSWORD) {
    return {
      ok: false,
      status: 503,
      error:
        "SELLPRO_ADMIN_PASSWORD が未設定です。環境変数を設定してサーバーを再起動してください。",
    };
  }
  const provided = req.headers["x-admin-password"];
  if (typeof provided !== "string" || !timingSafeEqualStr(provided, ADMIN_PASSWORD)) {
    return { ok: false, status: 401, error: "管理パスワードが違います。" };
  }
  return { ok: true };
}

/** 長さの違いをタイミング攻撃から守りつつ文字列を比較する */
function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  // 長さが違うと timingSafeEqual が throw するため、ハッシュに通して長さを揃える
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * ファイル名サニタイズ（api/admin-upload.js と同じロジック）。
 * パストラバーサル(.. / \)を除去し、許可文字以外を _ に置換する。
 */
function sanitizeFilename(raw) {
  if (!raw || typeof raw !== "string") return "";
  let name = raw.replace(/\.\./g, "").replace(/[/\\]/g, "");
  name = name.replace(/[^A-Za-z0-9._-]/g, "_");
  return name;
}

/** URL の ?key= / ?folder= を取り出す */
function getQueryParam(req, name) {
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get(name);
}

// =============================================================================
// API: /api/admin-content
//   GET  ?key=<banner|docs|interviews|logos|faqs>  → { path, sha, data }
//   POST ?key=...  body { data, sha, message }      → 書込 → build → { path, sha, data }
// =============================================================================
async function handleAdminContent(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const auth = checkAuth(req);
  if (!auth.ok) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  const key = getQueryParam(req, "key");
  const relPath = FILES[key];
  if (!relPath) {
    sendJson(res, 400, { error: "編集対象が不正です。" });
    return;
  }
  const absPath = path.join(ROOT, relPath);

  try {
    if (req.method === "GET") {
      const text = fs.readFileSync(absPath, "utf8");
      sendJson(res, 200, {
        path: relPath,
        sha: contentSha(text),
        data: JSON.parse(text),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body.data === undefined) {
        sendJson(res, 400, { error: "保存するデータがありません。" });
        return;
      }
      if (typeof body.data !== "object" || body.data === null) {
        sendJson(res, 400, { error: "JSONはオブジェクトまたは配列で保存してください。" });
        return;
      }

      // 2スペース整形 + 末尾改行で書き込む（既存 JSON のフォーマットに合わせる）
      const text = JSON.stringify(body.data, null, 2) + "\n";
      fs.writeFileSync(absPath, text, "utf8");

      // 再ビルドして dist/ に反映（直列化）
      await queueBuild();

      // 書き込んだ内容を読み直して新しい sha とともに返す
      const saved = fs.readFileSync(absPath, "utf8");
      sendJson(res, 200, {
        path: relPath,
        sha: contentSha(saved),
        data: JSON.parse(saved),
      });
      return;
    }

    sendJson(res, 405, { error: "この操作は対応していません。" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "処理に失敗しました。" });
  }
}

// =============================================================================
// API: /api/admin-upload
//   POST ?folder=<banner|logos|product|docs>
//   body { filename, contentBase64, message }
//   → public/<folder>/<filename> に書込 → build → { path, rawPath }
// =============================================================================
async function handleAdminUpload(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "この操作は対応していません。" });
    return;
  }

  const auth = checkAuth(req);
  if (!auth.ok) {
    sendJson(res, auth.status, { error: auth.error });
    return;
  }

  const folder = getQueryParam(req, "folder");
  if (!folder || !FOLDER_ALLOWLIST.has(folder)) {
    sendJson(res, 400, {
      error:
        "folder パラメータが不正です。banner / logos / product / docs のいずれかを指定してください。",
    });
    return;
  }

  try {
    const body = await readJsonBody(req);

    // filename バリデーション
    const filename = sanitizeFilename(body.filename);
    if (!filename) {
      sendJson(res, 400, { error: "filename が空または不正です。" });
      return;
    }
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1 || dotIndex === filename.length - 1) {
      sendJson(res, 400, { error: "filename に拡張子がありません。" });
      return;
    }
    const ext = filename.slice(dotIndex + 1).toLowerCase();
    if (!EXT_ALLOWLIST[folder].has(ext)) {
      sendJson(res, 400, {
        error: `フォルダ "${folder}" に拡張子 ".${ext}" はアップロードできません。`,
      });
      return;
    }

    // contentBase64 バリデーション（data: プレフィックスは受け付けない）
    const contentBase64 = body.contentBase64;
    if (!contentBase64 || typeof contentBase64 !== "string") {
      sendJson(res, 400, { error: "contentBase64 が空または不正です。" });
      return;
    }
    if (!/^[A-Za-z0-9+/]+=*$/.test(contentBase64)) {
      sendJson(res, 400, {
        error:
          "contentBase64 が正しい base64 形式ではありません。data:... プレフィックスは除いて送信してください。",
      });
      return;
    }

    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      sendJson(res, 413, { error: "ファイルサイズが上限 (8MB) を超えています。" });
      return;
    }

    // public/<folder>/<filename> に書き込む
    const destDir = path.join(PUBLIC_DIR, folder);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(path.join(destDir, filename), buffer);

    // 再ビルドして dist/ に反映（直列化）
    await queueBuild();

    sendJson(res, 200, {
      path: `${folder}/${filename}`,
      rawPath: `public/${folder}/${filename}`,
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "処理に失敗しました。" });
  }
}

// =============================================================================
// 静的配信（dist/）
// =============================================================================

/**
 * URL パスを dist/ 内の実ファイルへ解決する。
 * - 末尾スラッシュ / 拡張子なし → そのディレクトリの index.html にフォールバック
 * - パストラバーサルは dist/ の外に出ないよう防止
 * @returns {string|null} 配信するファイルの絶対パス。見つからなければ null。
 */
function resolveStaticFile(urlPath) {
  // クエリは getQueryParam 側で扱うのでここではパスだけ
  let pathname = decodeURIComponent(urlPath.split("?")[0]);
  if (pathname === "/") pathname = "/index.html";

  // dist/ 配下に正規化してトラバーサルを防ぐ
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let target = path.join(DIST_DIR, safe);
  if (!target.startsWith(DIST_DIR)) return null;

  // 1) そのまま存在するファイル
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return target;
  }

  // 2) ディレクトリ or 拡張子なし → index.html フォールバック
  //    例: /admin/ や /docs や /admin → <dir>/index.html
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const indexFile = path.join(target, "index.html");
    if (fs.existsSync(indexFile)) return indexFile;
  }
  if (!path.extname(target)) {
    const indexFile = path.join(target, "index.html");
    if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
      return indexFile;
    }
  }

  return null;
}

function serveStatic(req, res) {
  const filePath = resolveStaticFile(req.url);

  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("Content-Type", type);
    // JSON 以外の静的アセットはブラウザ既定のキャッシュに任せる
    if (ext === ".json") res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(filePath)
      .on("error", () => {
        res.statusCode = 500;
        res.end("Internal Server Error");
      })
      .pipe(res);
    return;
  }

  // 404: dist/404.html があれば返す
  const notFound = path.join(DIST_DIR, "404.html");
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (fs.existsSync(notFound)) {
    res.end(fs.readFileSync(notFound));
  } else {
    res.end("<!doctype html><meta charset=utf-8><title>404</title><h1>404 Not Found</h1>");
  }
}

// =============================================================================
// ルーティング
// =============================================================================
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (pathname === "/api/admin-content") {
    handleAdminContent(req, res);
    return;
  }
  if (pathname === "/api/admin-upload") {
    handleAdminUpload(req, res);
    return;
  }

  // それ以外は静的配信（GET/HEAD 想定）
  serveStatic(req, res);
});

// =============================================================================
// 起動: dist/ が無ければ先にビルドしてから listen
// =============================================================================
async function start() {
  if (!ADMIN_PASSWORD) {
    console.warn(
      "[server] 警告: SELLPRO_ADMIN_PASSWORD が未設定です。" +
        "管理画面の保存・取得API は 503 を返します（公開LPの閲覧は可能）。",
    );
  }

  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    console.log("[server] dist/ が見つかりません。初回ビルドを実行します…");
    try {
      await queueBuild();
    } catch (err) {
      console.error("[server] 初回ビルドに失敗しました:", err.message);
      process.exit(1);
    }
  }

  server.listen(PORT, () => {
    console.log(`[server] SellPro LP を起動しました → http://localhost:${PORT}`);
    console.log(`[server]   公開LP   : http://localhost:${PORT}/`);
    console.log(`[server]   管理画面 : http://localhost:${PORT}/admin/`);
  });
}

start();
