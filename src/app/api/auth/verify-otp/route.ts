export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyOtpHash,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  hashRefreshToken,
  auditLog,
} from "@/lib/auth";
import { sendWelcomeEmail, sendEmailSafe } from "@/lib/resend";
import { rateLimitResponse, OTP_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";
import { OtpPurpose } from "@prisma/client";

const verifySchema = z.object({
  email: z.string().email().toLowerCase(),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.REGISTRATION),
});

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, OTP_RATE_LIMIT);
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { email, otp, purpose } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    // Generic error — prevent user enumeration
    if (!user) return badRequest("Invalid or expired code.");

    const otpRecord = await prisma.otp.findFirst({
      where: { userId: user.id, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) return badRequest("Invalid or expired code.");

    // Increment attempt count
    await prisma.otp.update({ where: { id: otpRecord.id }, data: { attempts: { increment: 1 } } });

    // Check max attempts
    if (otpRecord.attempts + 1 >= otpRecord.maxAttempts) {
      await prisma.otp.update({ where: { id: otpRecord.id }, data: { usedAt: new Date() } });
      return badRequest("Too many incorrect attempts. Please request a new code.");
    }

    const valid = await verifyOtpHash(otp, otpRecord.otpHash);
    if (!valid) return badRequest("Invalid or expired code.");

    // Mark OTP as used
    await prisma.otp.update({ where: { id: otpRecord.id }, data: { usedAt: new Date() } });

    // Mark email verified
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

    // Create cart for new user if registering
    if (purpose === OtpPurpose.REGISTRATION) {
      await prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
      sendEmailSafe(() => sendWelcomeEmail({ to: user.email, name: user.name }));
    }

    // Issue tokens
    const sessionVersion = user.sessionVersion;
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ sub: user.id, role: user.role, sessionVersion }),
      signRefreshToken({ sub: user.id, role: user.role, sessionVersion }),
    ]);

    // Store hashed refresh token
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
    await auditLog({ userId: user.id, action: "OTP_VERIFIED", req });

    return ok({ id: user.id, name: user.name, email: user.email, role: user.role }, "Verification successful.");
  } catch (err) {
    console.error("[VerifyOTP]", err);
    return serverError();
  }
}
