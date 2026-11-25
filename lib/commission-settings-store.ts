import { eq } from "drizzle-orm";
import type { db } from "./db";
import { commissionSettings, adminEvents } from "./db/schema";
import { validateCommissionRule } from "./commission";

export async function updateCommissionSettings(
  database: Pick<typeof db, "transaction">,
  values: { percent: string; fixed: string; revision: number },
  actor: string,
) {
  const normalized = validateCommissionRule(
    values.percent.trim(),
    values.fixed.trim(),
  );
  if (!Number.isSafeInteger(values.revision) || values.revision < 1)
    throw new Error("Versión de configuración inválida");
  return database.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(commissionSettings)
      .where(eq(commissionSettings.id, 1))
      .for("update");
    if (!current)
      throw new Error("Falta preparar la configuración de comisiones");
    if (current.revision !== values.revision)
      throw new Error(
        "La tarifa cambió en otra sesión. Recarga la página antes de guardar",
      );
    if (
      current.percent === normalized.percent &&
      current.fixed === normalized.fixed
    )
      return;
    await tx
      .update(commissionSettings)
      .set({
        ...normalized,
        revision: current.revision + 1,
        updatedAt: new Date(),
        updatedBy: actor,
      })
      .where(eq(commissionSettings.id, 1));
    await tx
      .insert(adminEvents)
      .values({
        entityType: "setting",
        entityId: 1,
        actor,
        action: "commission_settings",
        detail: JSON.stringify({
          before: { percent: current.percent, fixed: current.fixed },
          after: normalized,
          revision: current.revision + 1,
        }),
      });
  });
}
