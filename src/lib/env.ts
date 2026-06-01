// Validate all required environment variables at startup.
// The app will throw immediately if any required var is missing.
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  OTP_PEPPER: z.string().min(16, "OTP_PEPPER must be at least 16 chars"),
  OTP_EXPIRY_MINUTES: z.coerce.number().min(1).max(60).default(10),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email"),
  RESEND_FROM_NAME: z.string().default("PremiumShop"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, "RAZORPAY_WEBHOOK_SECRET is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  CSRF_SECRET: z.string().min(16, "CSRF_SECRET must be at least 16 chars"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Validate on first import — throws with a clear message if anything is missing.
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const missing = _env.error.errors.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`\n❌ Invalid/missing environment variables:\n${missing}\n\nSee .env.example for the full list.\n`);
}

export const env = _env.data;
