import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtp, auditLog } from "@/lib/auth";
import { sendOtpEmail, sendEmailSafe } from "@/lib/resend";
import { rateLimitResponse, OTP_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, badRequest, serverError, validationError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { OtpPurpose } from "@prisma/client";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.REGISTRATION),
});

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse(req, OTP_RATE_LIMIT);
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);

  const { email, purpose } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    // Generic success to prevent enumeration
    if (!user) return ok(null, "If your email is registered, a new code has been sent.");

    // Invalidate old OTPs
    await prisma.otp.updateMany({
      where: { userId: user.id, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    const otpCode = generateOtpCode();
    const otpHash = await hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otp.create({
      data: { userId: user.id, otpHash, purpose, expiresAt },
    });

    sendEmailSafe(() =>
      sendOtpEmail({
        to: email,
        name: user.name,
        otp: otpCode,
        purpose: purpose === OtpPurpose.REGISTRATION ? "registration" : purpose === OtpPurpose.LOGIN ? "login" : "password_reset",
      })
    );

    await auditLog({ userId: user.id, action: "OTP_RESENT", req });
    return ok(null, "If your email is registered, a new code has been sent.");
  } catch (err) {
    console.error("[ResendOTP]", err);
    return serverError();
  }
}
