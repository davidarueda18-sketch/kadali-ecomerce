"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { emailJobs } from "@/lib/db/schema";
import {
  savePromotion,
  saveCustomerNotes,
  addOrderNote,
} from "@/lib/admin-management-store";
import { scheduleEmails } from "@/lib/schedule-emails";
import type { ActionState } from "@/ui/admin/action-form";
const value = (form: FormData, name: string) => String(form.get(name) ?? "");
async function execute(work: () => Promise<unknown>): Promise<ActionState> {
  try {
    await work();
    revalidatePath("/admin", "layout");
    revalidatePath("/", "layout");
    return { success: "Cambios guardados" };
  } catch (error) {
    return {
      error:
        error instanceof Error && !("cause" in error) && !("code" in error)
          ? error.message
          : "No pudimos guardar los cambios",
    };
  }
}
export async function savePromotionAction(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(() =>
    savePromotion(
      db,
      {
        id: value(form, "id") ? Number(value(form, "id")) : undefined,
        name: value(form, "name"),
        target: value(form, "target"),
        value: value(form, "value"),
        active: form.get("active") === "on",
        startsAt: value(form, "startsAt"),
        endsAt: value(form, "endsAt"),
      },
      actor.email,
    ),
  );
}
export async function saveCustomerNotesAction(
  _state: ActionState,
  form: FormData,
) {
  const actor = await requireAdmin();
  return execute(() =>
    saveCustomerNotes(
      db,
      value(form, "email"),
      value(form, "notes"),
      actor.email,
    ),
  );
}
export async function addOrderNoteAction(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(() =>
    addOrderNote(
      db,
      Number(value(form, "id")),
      value(form, "note"),
      actor.email,
    ),
  );
}
export async function retryEmailsAction(_state: ActionState, form: FormData) {
  await requireAdmin();
  return execute(async () => {
    const id = Number(value(form, "id"));
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("Correo inválido");
    await db
      .update(emailJobs)
      .set({
        status: "pending",
        attempts: 0,
        availableAt: new Date(),
        lastError: null,
      })
      .where(
        and(
          eq(emailJobs.id, id),
          inArray(emailJobs.status, ["failed", "pending"]),
        ),
      );
    scheduleEmails();
  });
}
