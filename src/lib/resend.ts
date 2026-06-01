import { Resend } from "resend";
import { env } from "./env";

export const resend = new Resend(env.RESEND_API_KEY);

const FROM = `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`;

// ── Email templates (inline HTML — no JSX dependency for server lib) ──────────

function baseTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;color:#111827;}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);}
    .header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;text-align:center;}
    .header h1{color:#f5c542;margin:0;font-size:22px;font-weight:800;letter-spacing:1px;}
    .body{padding:36px 40px;}
    .body p{font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px;}
    .btn{display:inline-block;padding:14px 28px;background:#f5c542;color:#1a1a2e;font-weight:700;border-radius:8px;text-decoration:none;font-size:15px;margin:12px 0;}
    .otp-box{background:#f9fafb;border:2px dashed #f5c542;border-radius:10px;text-align:center;padding:20px;margin:20px 0;}
    .otp{font-size:36px;font-weight:900;letter-spacing:8px;color:#1a1a2e;}
    .footer{background:#f9fafb;padding:20px 40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;}
    table.items{width:100%;border-collapse:collapse;margin:16px 0;}
    table.items th{background:#f9fafb;text-align:left;padding:10px;font-size:13px;color:#6b7280;}
    table.items td{padding:10px;font-size:14px;border-bottom:1px solid #f3f4f6;}
    .total-row td{font-weight:700;border-top:2px solid #e5e7eb;font-size:15px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><h1>✦ PremiumShop</h1></div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} PremiumShop. All rights reserved.<br>
      This is a transactional email — please do not reply.</p>
    </div>
  </div>
</body></html>`;
}

export async function sendOtpEmail(opts: {
  to: string;
  name: string;
  otp: string;
  purpose: "registration" | "login" | "password_reset";
}): Promise<void> {
  const purposeLabel = opts.purpose === "registration" ? "verify your email" : opts.purpose === "login" ? "log in" : "reset your password";
  const html = baseTemplate("Your OTP Code", `
    <p>Hello <strong>${opts.name}</strong>,</p>
    <p>Use the code below to ${purposeLabel}. It expires in <strong>${env.OTP_EXPIRY_MINUTES} minutes</strong>.</p>
    <div class="otp-box"><div class="otp">${opts.otp}</div></div>
    <p style="font-size:13px;color:#9ca3af;">If you did not request this, please ignore this email and your account will remain secure.</p>
  `);

  await resend.emails.send({ from: FROM, to: opts.to, subject: `Your OTP: ${opts.otp} — PremiumShop`, html });
}

export async function sendWelcomeEmail(opts: { to: string; name: string }): Promise<void> {
  const html = baseTemplate("Welcome to PremiumShop", `
    <p>Hello <strong>${opts.name}</strong>,</p>
    <p>Welcome to <strong>PremiumShop</strong> — your destination for premium daily essentials. Your account is now active.</p>
    <p><a href="${env.NEXT_PUBLIC_APP_URL}/products" class="btn">Start Shopping</a></p>
    <p style="font-size:13px;color:#9ca3af;">Need help? Reply to this email or contact our support team.</p>
  `);
  await resend.emails.send({ from: FROM, to: opts.to, subject: "Welcome to PremiumShop!", html });
}

export interface OrderEmailItem {
  name: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
}

export async function sendOrderConfirmationEmail(opts: {
  to: string;
  name: string;
  orderNumber: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
}): Promise<void> {
  const rows = opts.items
    .map(
      (i) =>
        `<tr><td>${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${(i.unitPrice * i.quantity).toFixed(2)}</td></tr>`
    )
    .join("");

  const html = baseTemplate(`Order ${opts.orderNumber} Confirmed`, `
    <p>Hello <strong>${opts.name}</strong>,</p>
    <p>Your order has been confirmed! Here's your summary:</p>
    <p><strong>Order #${opts.orderNumber}</strong></p>
    <table class="items">
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${rows}
      <tr><td>Subtotal</td><td></td><td style="text-align:right">₹${opts.subtotal.toFixed(2)}</td></tr>
      <tr><td>Shipping</td><td></td><td style="text-align:right">₹${opts.shippingCost.toFixed(2)}</td></tr>
      <tr><td>Tax</td><td></td><td style="text-align:right">₹${opts.taxAmount.toFixed(2)}</td></tr>
      <tr class="total-row"><td>Total</td><td></td><td style="text-align:right">₹${opts.total.toFixed(2)}</td></tr>
      </tbody>
    </table>
    <p><a href="${env.NEXT_PUBLIC_APP_URL}/orders/${opts.orderNumber}" class="btn">View Order</a></p>
  `);

  await resend.emails.send({ from: FROM, to: opts.to, subject: `Order ${opts.orderNumber} Confirmed — PremiumShop`, html });
}

export async function sendOrderShippedEmail(opts: {
  to: string;
  name: string;
  orderNumber: string;
}): Promise<void> {
  const html = baseTemplate(`Order ${opts.orderNumber} Shipped`, `
    <p>Hello <strong>${opts.name}</strong>,</p>
    <p>Great news! Your order <strong>#${opts.orderNumber}</strong> has been shipped and is on its way to you.</p>
    <p><a href="${env.NEXT_PUBLIC_APP_URL}/orders/${opts.orderNumber}" class="btn">Track Order</a></p>
  `);
  await resend.emails.send({ from: FROM, to: opts.to, subject: `Your order #${opts.orderNumber} is on the way! — PremiumShop`, html });
}

// Fire-and-forget wrapper — never let email failure crash the main flow
export async function sendEmailSafe(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
  }
}
