import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { env } from "./env";

// ── Constants ──────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const ACCESS_COOKIE = "ps_access";
const REFRESH_COOKIE = "ps_refresh";

const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// ── Password hashing ───────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Strong password policy ─────────────────────────────────────
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  return null;
}

// ── OTP ────────────────────────────────────────────────────────
export function generateOtpCode(): string {
  // 6-digit OTP using cryptographically secure random
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, "0");
}

export async function hashOtp(otp: string): Promise<string> {
  // Pepper + hash; never store raw OTP
  const salted = `${env.OTP_PEPPER}:${otp}`;
  return bcrypt.hash(salted, 10);
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  const salted = `${env.OTP_PEPPER}:${otp}`;
  return bcrypt.compare(salted, hash);
}

// ── JWT token pair ─────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // userId
  role: string;
  sessionVersion: number;
  type: "access" | "refresh";
}

export async function signAccessToken(payload: Omit<JwtPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Omit<JwtPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRY)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshTokenJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────
const isProd = env.NODE_ENV === "production";

export function setAuthCookies(accessToken: string, refreshToken: string): void {
  const cookieStore = cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookies(): void {
  const cookieStore = cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export function getAccessTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(ACCESS_COOKIE)?.value ?? null;
}

// ── Session guard (App Router) ─────────────────────────────────
export async function getSessionUser(req: NextRequest) {
  const token = getAccessTokenFromRequest(req);
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  // Verify session version against DB to support forced invalidation
  const user = await prisma.user.findUnique({
    where: { id: payload.sub, deletedAt: null, isActive: true },
    select: { id: true, email: true, name: true, role: true, sessionVersion: true },
  });

  if (!user || user.sessionVersion !== payload.sessionVersion) return null;
  return user;
}

// ── Refresh token rotation ─────────────────────────────────────
export async function hashRefreshToken(token: string): Promise<string> {
  return crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update(token).digest("hex");
}

// ── Lockout helpers ────────────────────────────────────────────
export async function checkAccountLocked(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });
  if (!user?.lockedUntil) return false;
  return user.lockedUntil > new Date();
}

export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginCount: true },
  });
  const count = (user?.failedLoginCount ?? 0) + 1;
  const lockedUntil = count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : undefined;

  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: count, ...(lockedUntil ? { lockedUntil } : {}) },
  });
}

export async function resetFailedLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}

// ── Audit logger ───────────────────────────────────────────────
export async function auditLog(opts: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: opts.metadata as object,
        ipAddress: opts.req?.ip ?? opts.req?.headers.get("x-forwarded-for") ?? undefined,
        userAgent: opts.req?.headers.get("user-agent") ?? undefined,
      },
    });
  } catch {
    // Never let audit logging crash the main flow
  }
}
