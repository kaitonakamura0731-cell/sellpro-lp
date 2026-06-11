const OWNER = process.env.GITHUB_OWNER || "kaitonakamura0731-cell";
const REPO = process.env.GITHUB_REPO || "sellpro-lp";
const BRANCH = process.env.GITHUB_BRANCH || "main";

const FILES = {
  banner: "src/data/banner.json",
  docs: "src/data/docs.json",
  interviews: "src/data/interviews.json",
  logos: "src/data/logos.json",
  faqs: "src/data/faqs.json",
};

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

function decodeContent(content) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeContent(content) {
  return Buffer.from(content, "utf8").toString("base64");
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

async function githubContent(path) {
  const url = new URL(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`);
  url.searchParams.set("ref", BRANCH);

  const response = await fetch(url, {
    method: "GET",
    headers: githubHeaders(),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "GitHub から読み込めませんでした。");
  }
  if (!payload.content || !payload.sha) {
    throw new Error("GitHub のレスポンス形式が不正です。");
  }

  return {
    path,
    sha: payload.sha,
    data: JSON.parse(decodeContent(payload.content)),
  };
}

async function updateGithubContent(path, data, sha, message) {
  const current = sha ? { sha } : await githubContent(path);
  const body = {
    branch: BRANCH,
    message: message || `Update ${path}`,
    content: encodeContent(JSON.stringify(data, null, 2) + "\n"),
    sha: current.sha,
  };

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

  return githubContent(path);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const configError = assertConfigured(req);
  if (configError) {
    json(res, configError.includes("パスワード") ? 401 : 500, { error: configError });
    return;
  }

  const key = new URL(req.url, "https://sellpro-lp.vercel.app").searchParams.get("key");
  const path = FILES[key];

  if (!path) {
    json(res, 400, { error: "編集対象が不正です。" });
    return;
  }

  try {
    if (req.method === "GET") {
      json(res, 200, await githubContent(path));
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body.data === undefined) {
        json(res, 400, { error: "保存するデータがありません。" });
        return;
      }
      if (typeof body.data !== "object" || body.data === null) {
        json(res, 400, { error: "JSONはオブジェクトまたは配列で保存してください。" });
        return;
      }

      json(
        res,
        200,
        await updateGithubContent(path, body.data, body.sha, body.message),
      );
      return;
    }

    json(res, 405, { error: "この操作は対応していません。" });
  } catch (error) {
    json(res, 500, { error: error.message || "処理に失敗しました。" });
  }
}
