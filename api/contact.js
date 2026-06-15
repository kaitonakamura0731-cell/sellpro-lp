// Vercel Serverless Function: /api/contact
// 自社サーバー(server.js)の handleContact と同じ動作を Vercel 上でも提供するミラー実装。
// 既存 api/*.js に倣い「トップレベルの重い import を避ける」: JSON は静的 import せず実行時に読み、
// nodemailer は遅延 import する。これにより初期化時クラッシュ(FUNCTION_INVOCATION_FAILED)を回避する。
// 届け先: 環境変数 SELLPRO_CONTACT_EMAIL → src/data/site.json の contact.email の順。
// SMTP: SELLPRO_SMTP_HOST/USER/PASS(+PORT/SECURE/FROM)。未設定/読めない場合は
//        { ok:false, code:"not-configured" } を返し、フォーム側で mailto フォールバックさせる。
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.length ? JSON.parse(req.body.toString("utf8")) : {};
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const clip = (v, n) => (v == null ? "" : String(v)).slice(0, n).trim();

// 届け先メールアドレス: 環境変数を最優先し、無ければ src/data/site.json を実行時に読む。
function getContactEmail() {
  if (process.env.SELLPRO_CONTACT_EMAIL) return process.env.SELLPRO_CONTACT_EMAIL.trim();
  const candidates = [
    path.join(process.cwd(), "src/data/site.json"),
    fileURLToPath(new URL("../src/data/site.json", import.meta.url)),
  ];
  for (const p of candidates) {
    try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j && j.contact && j.contact.email) return String(j.contact.email).trim();
    } catch {}
  }
  return "";
}

function getSmtpConfig() {
  const host = process.env.SELLPRO_SMTP_HOST;
  const user = process.env.SELLPRO_SMTP_USER;
  const pass = process.env.SELLPRO_SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SELLPRO_SMTP_PORT) || 465;
  const secure = process.env.SELLPRO_SMTP_SECURE
    ? process.env.SELLPRO_SMTP_SECURE !== "false"
    : port === 465;
  return { host, port, secure, auth: { user, pass }, from: process.env.SELLPRO_SMTP_FROM || user };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { ok: false, error: "この操作は対応していません。" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    // スパム対策: ハニーポットに値 → bot とみなし成功を装って破棄
    if (clip(body._gotcha, 100)) {
      json(res, 200, { ok: true });
      return;
    }

    const d = {
      name: clip(body.name, 200),
      company: clip(body.company, 200),
      email: clip(body.email, 200),
      type: clip(body.type, 100),
      body: clip(body.body, 5000),
      page: clip(body.page, 500),
    };

    if (!d.name || !d.company || !d.email) {
      json(res, 400, { ok: false, error: "お名前・会社名・メールアドレスをご入力ください。" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      json(res, 400, { ok: false, error: "メールアドレスの形式をご確認ください。" });
      return;
    }

    const smtp = getSmtpConfig();
    const to = getContactEmail();
    if (!smtp || !to) {
      json(res, 200, { ok: false, code: "not-configured" });
      return;
    }

    let nodemailer;
    try {
      nodemailer = (await import("nodemailer")).default;
    } catch {
      json(res, 200, { ok: false, code: "not-configured" });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });
    const subject = `【SellPro お問い合わせ】${d.type || "お問い合わせ"}（${d.name} 様）`;
    const text = [
      "■ SellPro LP お問い合わせ",
      "",
      `お名前　： ${d.name}`,
      `会社名　： ${d.company}`,
      `メール　： ${d.email}`,
      `種別　　： ${d.type || "（未選択）"}`,
      "",
      "本文：",
      d.body || "（未記入）",
      "",
      "---",
      `送信元　： ${d.page || "不明"}`,
      `受信日時： ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    ].join("\n");

    await transporter.sendMail({ from: smtp.from, to, replyTo: d.email, subject, text });
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, { ok: false, error: "送信処理に失敗しました。" });
  }
}
