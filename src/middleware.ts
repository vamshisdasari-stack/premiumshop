import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

// Routes that require authentication
const PROTECTED_USER_ROUTES = ["/checkout", "/orders", "/account", "/cart"];
const PROTECTED_ADMIN_ROUTES = ["/admin"];
const ADMIN_API_ROUTES = ["/api/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin API routes ──────────────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("ps_access")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifyAccessToken(token);
    if (!payload || !["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    // Attach user info to request headers for downstream handlers
    const headers = new Headers(req.headers);
    headers.set("x-user-id", payload.sub);
    headers.set("x-user-role", payload.role);
    return NextResponse.next({ request: { headers } });
  }

  // ── Admin UI routes ────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("ps_access")?.value;
    if (!token) return NextResponse.redirect(new URL("/admin/login", req.url));

    const payload = await verifyAccessToken(token);
    if (!payload || !["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.redirect(new URL("/admin/login?error=forbidden", req.url));
    }
  }

  // ── Protected user routes ──────────────────────────────────────
  if (PROTECTED_USER_ROUTES.some((r) => pathname.startsWith(r))) {
    const token = req.cookies.get("ps_access")?.value;
    if (!token) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/account/:path*",
  ],
};
