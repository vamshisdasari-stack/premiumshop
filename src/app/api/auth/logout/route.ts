export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, clearAuthCookies, hashRefreshToken, auditLog } from "@/lib/auth";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (user) {
      const refreshToken = req.cookies.get("ps_refresh")?.value;
      if (refreshToken) {
        const tokenHash = await hashRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { userId: user.id, tokenHash },
          data: { revokedAt: new Date() },
        });
      }
      await auditLog({ userId: user.id, action: "USER_LOGOUT", req });
    }
    await clearAuthCookies();
    return ok(null, "Logged out successfully.");
  } catch (err) {
    console.error("[Logout]", err);
    return serverError();
  }
}
