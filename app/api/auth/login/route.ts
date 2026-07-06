import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth";

export const runtime = "nodejs";

// ログイン試行のレート制限（1分間に5回まで／IP単位）。
// サーバーレスではインスタンスごとのメモリだが、総当たり抑止の簡易対策としては十分。
const attempts = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 5;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

// MEMBER_CREDENTIALS: "id1:bcryptハッシュ,id2:bcryptハッシュ" 形式
function parseCredentials(): Map<string, string> {
  const raw = process.env.MEMBER_CREDENTIALS ?? "";
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const idx = pair.indexOf(":");
    if (idx > 0) {
      map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
  return map;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "試行回数が上限を超えました。1分後にもう一度お試しください。" },
      { status: 429 }
    );
  }

  let body: { userId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const { userId, password } = body;
  if (!userId || !password) {
    return NextResponse.json(
      { error: "IDとパスワードを入力してください" },
      { status: 400 }
    );
  }

  const credentials = parseCredentials();
  const hash = credentials.get(userId);
  const ok = hash ? await bcrypt.compare(password, hash) : false;

  if (!ok) {
    return NextResponse.json(
      { error: "IDまたはパスワードが違います" },
      { status: 401 }
    );
  }

  const token = await createSessionToken(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
