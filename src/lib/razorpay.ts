import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "./env";

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order server-side.
 * Amount must be in paise (multiply rupees × 100).
 */
export async function createRazorpayOrder(opts: {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const order = await razorpay.orders.create({
    amount: Math.round(opts.amount),
    currency: opts.currency ?? "INR",
    receipt: opts.receipt,
    notes: opts.notes,
  });
  return { id: order.id as string, amount: order.amount as number, currency: order.currency as string };
}

/**
 * Verify payment signature server-side.
 * NEVER trust the frontend's payment success — always verify here.
 */
export function verifyPaymentSignature(opts: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const body = `${opts.razorpayOrderId}|${opts.razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(opts.razorpaySignature, "hex"));
}

/**
 * Verify webhook signature from Razorpay.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}
