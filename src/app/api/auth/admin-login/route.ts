export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  hashRefreshToken,
  checkAccountLocked,
  recordFailedLogin,
  resetFailedLogin,
  auditLog,
} from "@/lib/auth";
import { rateLimitResponse, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, AUTH_RATE_LIMIT);
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { email, password } = parsed.data;

  try {
    // Admin login only accepts ADMIN/SUPER_ADMIN roles — never trust client-side role
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null, isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });

    if (!user) return badRequest("Invalid credentials.");

    const locked = await checkAccountLocked(user.id);
    if (locked) return badRequest("Account temporarily locked.");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user.id);
      await auditLog({ userId: user.id, action: "ADMIN_LOGIN_FAILED", req });
      return badRequest("Invalid credentials.");
    }

    await resetFailedLogin(user.id);

    const sessionVersion = user.sessionVersion;
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, role: user.role, sessionVersion }),
      signRefreshToken({ sub: user.id, role: user.role, sessionVersion }),
    ]);

    const tokenHash = await hashRefreshToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers.get("user-agent") ?? undefined,
        ipAddress: req.ip ?? undefined,
      },
    });

    await setAuthCookies(accessToken, refreshToken);
    await auditLog({ userId: user.id, action: "ADMIN_LOGIN", req });

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role }, "Admin login successful.");
  } catch (err) {
    console.error("[AdminLogin]", err);
    return serverError();
  }
}

