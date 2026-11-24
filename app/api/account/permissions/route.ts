import { getAdminPermission, getPermissionSession } from "@/lib/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const responseHeaders = {
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
  };
  try {
    const session = await getPermissionSession();
    const canAdminister = await getAdminPermission(session?.user);
    return Response.json(
      { userId: session?.user.id ?? null, canAdminister },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { userId: null, canAdminister: false },
      { status: 503, headers: responseHeaders },
    );
  }
}
