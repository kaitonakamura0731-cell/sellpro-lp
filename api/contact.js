// Vercel Serverless Function: /api/contact
// 自社サーバー(server.js)の handleContact と同じ動作を Vercel 上でも提供するミラー実装。
// 届け先は src/data/site.json の contact.email、SMTP 設定は環境変数（SELLPRO_SMTP_*）。
// SMTP 未設定なら { ok:false, code:"not-configured" } を返し、フォーム側で mailto フォールバックさせる。
import nodemailer from "nodemailer";
import site from "../src/data/site.json";

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
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const clip = (v, n) => (v == null ? "" : String(v)).slice(0, n).trim();

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
    const to = site && site.contact && site.contact.email;
    if (!smtp || !to) {
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
