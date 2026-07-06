// セッションクッキーの署名・検証（Web Crypto ベース — Edge / Node 両対応）

export const SESSION_COOKIE = "satei_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7日

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

async function hmacHex(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** `userId.expiresEpochSec.signature` 形式のトークンを発行 */
export async function createSessionToken(userId: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const payload = `${encodeURIComponent(userId)}.${expires}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

/** 検証OKなら userId を、NGなら null を返す */
export async function verifySessionToken(
  token: string | undefined
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdEnc, expiresStr, sig] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return null;
  const expected = await hmacHex(`${userIdEnc}.${expiresStr}`);
  // 長さは同一（hex固定長）。単純比較でタイミング差はごく小さいが一応定数時間比較にする
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return null;
  return decodeURIComponent(userIdEnc);
}
