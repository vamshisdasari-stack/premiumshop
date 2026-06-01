// In-memory rate limiter with sliding window.
// For production with multiple instances, replace the store with Redis.
import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Key prefix for namespacing */
  prefix?: string;
}

export function getRateLimitKey(req: NextRequest, prefix: string = "rl"): string {
  const ip =
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// Middleware-style rate limiter for route handlers
export function rateLimitResponse(
  req: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const key = getRateLimitKey(req, config.prefix);
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  return null;
}

// Preset configs
export const AUTH_RATE_LIMIT: RateLimitConfig = { limit: 5, windowMs: 15 * 60 * 1000, prefix: "auth" };
export const OTP_RATE_LIMIT: RateLimitConfig = { limit: 3, windowMs: 10 * 60 * 1000, prefix: "otp" };
export const API_RATE_LIMIT: RateLimitConfig = { limit: 60, windowMs: 60 * 1000, prefix: "api" };
export const SEARCH_RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60 * 1000, prefix: "search" };
export const REVIEW_RATE_LIMIT: RateLimitConfig = { limit: 5, windowMs: 60 * 60 * 1000, prefix: "review" };
