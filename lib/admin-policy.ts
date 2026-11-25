export async function resolveAdminPermission(
  identity: { id: string; emailVerified?: boolean } | null | undefined,
  lookup: (
    userId: string,
  ) => Promise<
    { role: string; revokedAt: Date | null; emailVerified: boolean } | undefined
  >,
) {
  if (!identity?.id || !identity.emailVerified) return false;
  const access = await lookup(identity.id);
  return Boolean(
    access?.emailVerified &&
    access.role === "admin" &&
    access.revokedAt === null,
  );
}

export const SHIPPING_LABELS: Record<string, string> = {
  unfulfilled: "Por preparar",
  preparing: "En preparación",
  shipped: "En camino",
  delivered: "Entregado",
};

export function canChangeShipment(
  paymentStatus: string,
  previous: string,
  next: string,
) {
  if (paymentStatus !== "paid") return false;
  const steps = Object.keys(SHIPPING_LABELS);
  return (
    steps.includes(previous) && steps.includes(next) &&
    (next === previous || steps.indexOf(next) === steps.indexOf(previous) + 1)
  );
}
