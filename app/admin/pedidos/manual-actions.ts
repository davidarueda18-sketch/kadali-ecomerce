"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { saveManualSale } from "@/lib/manual-sale-store";
import { scheduleEmails } from "@/lib/schedule-emails";
import type { ManualSaleInput } from "@/lib/manual-sale";
import type { ActionState } from "@/ui/admin/action-form";

export async function saveManualSaleAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  const value = (name: string) => String(form.get(name) ?? "");
  let orderId: number;
  try {
    const itemsText = value("items");
    if (itemsText.length > 50000)
      throw new Error("El formulario contiene demasiados datos");
    const input: ManualSaleInput = {
      entryKey: value("entryKey"),
      id: value("id") ? Number(value("id")) : undefined,
      revision: value("id") ? Number(value("revision")) : undefined,
      reason: value("reason"),
      paymentMethod: value("paymentMethod"),
      saleDate: value("saleDate"),
      customerName: value("customerName"),
      customerEmail: value("customerEmail"),
      customerPhone: value("customerPhone"),
      shippingRequired: value("shippingRequired") === "on",
      address: value("address"),
      city: value("city"),
      zipCode: value("zipCode"),
      shippingCost: value("shippingCost"),
      notes: value("notes"),
      items: JSON.parse(itemsText),
    };
    const result = await saveManualSale(db, input, actor.email);
    orderId = result.id;
  } catch (error) {
    return {
      error:
        error instanceof SyntaxError
          ? "Revisa los productos de la venta"
          : error instanceof Error && !("cause" in error) && !("code" in error)
            ? error.message
            : "No pudimos guardar la venta. Revisa los datos e inténtalo nuevamente.",
    };
  }
  revalidatePath("/admin", "layout");
  scheduleEmails();
  revalidatePath("/productos", "layout");
  revalidatePath("/cuenta/pedidos");
  revalidatePath("/");
  redirect(`/admin/pedidos/${orderId}`);
}
