import crypto from "crypto";

const TOKEN_NAME = "app_token";
const SECRET =
  process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-secret";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

export type SessionUser = {
  id: string;
  nombre?: string;
  email?: string;
  tipo_usuario?: string; // 'organizador'|'asistente'|'admin' etc
};

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hmacSha256(input: string, key: string) {
  return crypto.createHmac("sha256", key).update(input).digest();
}

export function signToken(payload: SessionUser) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + MAX_AGE } as any;
  const encoded = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(body)
  )}`;
  const sig = hmacSha256(encoded, SECRET);
  return `${encoded}.${base64url(sig)}`;
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encHeader, encBody, encSig] = parts;
    const unsigned = `${encHeader}.${encBody}`;
    const expectedSig = base64url(hmacSha256(unsigned, SECRET));
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(encSig)))
      return null;
    const bodyJson = Buffer.from(encBody, "base64").toString("utf8");
    const obj = JSON.parse(bodyJson);
    const now = Math.floor(Date.now() / 1000);
    if (obj.exp && typeof obj.exp === "number" && obj.exp < now) return null;
    // remove iat/exp before returning
    delete obj.iat;
    delete obj.exp;
    return obj as SessionUser;
  } catch (e) {
    return null;
  }
}

export function serializeTokenCookie(token: string) {
  const secure = process.env.NODE_ENV === "production";
  const httpOnly = process.env.NODE_ENV === "production" ? "; HttpOnly" : "";
  return `${TOKEN_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${httpOnly}${
    secure ? "; Secure" : ""
  }`;
}

export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  const obj: Record<string, string> = {};
  if (!cookieHeader) return obj;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    obj[k] = decodeURIComponent(v);
  }
  return obj;
}

export function getUserFromRequest(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    const token = cookies[TOKEN_NAME];
    if (!token) return null;
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}
