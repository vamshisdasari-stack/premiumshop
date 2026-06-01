export const dynamic = 'force-dynamic'
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  validatePasswordStrength,
  hashOtp,
  generateOtpCode,
  auditLog,
} from "@/lib/auth";
import { sendOtpEmail, sendEmailSafe } from "@/lib/resend";
import { rateLimitResponse, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { ok, badRequest, conflict, serverError, validationError } from "@/lib/api-response";
import { env } from "@/lib/env";
import { OtpPurpose } from "@prisma/client";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = rateLimitResponse(req, AUTH_RATE_LIMIT);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { name, email, password } = parsed.data;

  // Strong password check
  const pwError = validatePasswordStrength(password);
  if (pwError) return badRequest(pwError, "WEAK_PASSWORD");

  try {
    // Check for existing user — but return a GENERIC message to prevent enumeration
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Same success response regardless — anti-enumeration
      return ok({ email }, "If this email is new, a verification code has been sent.");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, emailVerified: false },
    });

    // Generate and hash OTP
    const otpCode = generateOtpCode();
    const otpHash = await hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otp.create({
      data: {
        userId: user.id,
        otpHash,
        purpose: OtpPurpose.REGISTRATION,
        expiresAt,
      },
    });

    // Send email (fire-and-forget — never block registration on email)
    sendEmailSafe(() => sendOtpEmail({ to: email, name, otp: otpCode, purpose: "registration" }));

    await auditLog({ userId: user.id, action: "USER_REGISTERED", entity: "User", entityId: user.id, req });

    return ok({ email }, "Verification code sent to your email.");
  } catch (err) {
    console.error("[Register]", err);
    return serverError();
  }
}

