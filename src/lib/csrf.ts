// Cryptographically signed CSRF tokens using HMAC-SHA256.
// Tokens are tied to the user's session and expire.
import crypto from "crypto";
import { env } from "./env";

const SEPARATOR = ":";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.CSRF_SECRET).update(payload).digest("hex");
}

export function generateCsrfToken(userId: string): string {
  const expiry = Date.now() + TOKEN_EXPIRY_MS;
  const payload = `${userId}${SEPARATOR}${expiry}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}${SEPARATOR}${signature}`).toString("base64url");
}

export function verifyCsrfToken(token: string, userId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(SEPARATOR);
    if (parts.length !== 3) return false;

    const [tokenUserId, expiryStr, signature] = parts as [string, string, string];
    if (tokenUserId !== userId) return false;

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;

    const expected = sign(`${tokenUserId}${SEPARATOR}${expiryStr}`);
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
