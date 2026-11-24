import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveAdminPermission } from "./admin-policy";
import { db } from "./db";
import { adminAccess, user } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getAdminPermission(
  identity: { id: string; emailVerified?: boolean } | null | undefined,
) {
  return resolveAdminPermission(identity, async (userId) => {
    const [access] = await db
      .select({
        role: adminAccess.role,
        revokedAt: adminAccess.revokedAt,
        emailVerified: user.emailVerified,
      })
      .from(adminAccess)
      .innerJoin(user, eq(user.id, adminAccess.userId))
      .where(eq(adminAccess.userId, userId))
      .limit(1);
    return access;
  });
}

export async function getPermissionSession() {
  // Never authorize from a potentially stale session cookie cache.
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

export async function requireAdmin() {
  const session = await getPermissionSession();
  if (!session) redirect("/acceso?next=/admin");
  if (!(await getAdminPermission(session.user))) notFound();
  return session.user;
}
