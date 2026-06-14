const OWNER = process.env.GITHUB_OWNER || "kaitonakamura0731-cell";
const REPO = process.env.GITHUB_REPO || "sellpro-lp";
const BRANCH = process.env.GITHUB_BRANCH || "main";

/** アップロード先フォルダの許可リスト */
const FOLDER_ALLOWLIST = new Set(["banner", "logos", "product", "docs"]);

/** フォルダごとに許可する拡張子 */
const EXT_ALLOWLIST = {
  banner: new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]),
  logos: new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]),
  product: new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]),
  docs: new Set(["pdf"]),
};

/** デコード後の最大サイズ (8 MB) */
const MAX_BYTES = 8 * 1024 * 1024;

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.length ? JSON.parse(req.body.toString("utf8")) : {};
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_CONTENT_TOKEN}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function assertConfigured(req) {
  if (!process.env.GITHUB_CONTENT_TOKEN) {
    return "GITHUB_CONTENT_TOKEN が未設定です。";
  }
  if (!process.env.SELLPRO_ADMIN_PASSWORD) {
    return "SELLPRO_ADMIN_PASSWORD が未設定です。";
  }
  if (req.headers["x-admin-password"] !== process.env.SELLPRO_ADMIN_PASSWORD) {
    return "管理パスワードが違います。";
  }
  return "";
}

/**
 * ファイル名をサニタイズする。
 * パス区切り文字(/ \ ..)を除去し、[A-Za-z0-9._-] 以外を _ に置換する。
 * @returns {string} サニタイズ済みファイル名、問題があれば空文字
 */
function sanitizeFilename(raw) {
  if (!raw || typeof raw !== "string") return "";

  // パストラバーサル系を除去
  let name = raw
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "");

  // 許可文字以外を _ に変換
  name = name.replace(/[^A-Za-z0-9._-]/g, "_");

  return name;
}

/**
 * 既存ファイルの sha を取得する。存在しない場合は null を返す。
 */
async function getExistingSha(path) {
  const url = new URL(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`);
  url.searchParams.set("ref", BRANCH);

  const response = await fetch(url, {
    method: "GET",
    headers: githubHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "GitHub からファイル情報を取得できませんでした。");
  }

  return payload.sha || null;
}

/**
 * GitHub Contents API でバイナリファイルを作成/更新する。
 * contentBase64 は dataプレフィックスなしの base64 文字列をそのまま受け取り、
 * GitHub API の content フィールドに直接渡す(JSON.stringify は不要)。
 */
async function uploadGithubFile(path, contentBase64, message) {
  const sha = await getExistingSha(path);

  const body = {
    branch: BRANCH,
    message: message || `Upload ${path}`,
    content: contentBase64,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "GitHub へ保存できませんでした。");
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "この操作は対応していません。" });
    return;
  }

  const configError = assertConfigured(req);
  if (configError) {
    json(res, configError.includes("パスワード") ? 401 : 500, { error: configError });
    return;
  }

  const folder = new URL(req.url, "https://sellpro-lp.vercel.app").searchParams.get("folder");

  if (!folder || !FOLDER_ALLOWLIST.has(folder)) {
    json(res, 400, { error: "folder パラメータが不正です。banner / logos / product / docs のいずれかを指定してください。" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    // filename バリデーション
    const rawFilename = body.filename;
    const filename = sanitizeFilename(rawFilename);
    if (!filename) {
      json(res, 400, { error: "filename が空または不正です。" });
      return;
    }

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1 || dotIndex === filename.length - 1) {
      json(res, 400, { error: "filename に拡張子がありません。" });
      return;
    }
    const ext = filename.slice(dotIndex + 1).toLowerCase();

    if (!EXT_ALLOWLIST[folder].has(ext)) {
      json(res, 400, {
        error: `フォルダ "${folder}" に拡張子 ".${ext}" はアップロードできません。`,
      });
      return;
    }

    // contentBase64 バリデーション
    const contentBase64 = body.contentBase64;
    if (!contentBase64 || typeof contentBase64 !== "string") {
      json(res, 400, { error: "contentBase64 が空または不正です。" });
      return;
    }

    // base64 文字以外を含まないか確認(dataプレフィックスは受け付けない)
    if (!/^[A-Za-z0-9+/]+=*$/.test(contentBase64)) {
      json(res, 400, { error: "contentBase64 が正しい base64 形式ではありません。data:... プレフィックスは除いて送信してください。" });
      return;
    }

    // サイズ上限チェック(base64 の 3/4 がバイト数)
    const estimatedBytes = Math.floor(contentBase64.length * 0.75);
    if (estimatedBytes > MAX_BYTES) {
      json(res, 413, { error: `ファイルサイズが上限 (8MB) を超えています。` });
      return;
    }

    const githubPath = `public/${folder}/${filename}`;
    const commitMessage = body.message || `Upload ${folder}/${filename}`;

    await uploadGithubFile(githubPath, contentBase64, commitMessage);

    json(res, 200, {
      path: `${folder}/${filename}`,
      rawPath: githubPath,
    });
  } catch (error) {
    json(res, 500, { error: error.message || "処理に失敗しました。" });
  }
}
