import { after } from "next/server";
import { deliverQueuedEmails } from "./email-delivery";
export function scheduleEmails() {
  after(async () => {
    try {
      await deliverQueuedEmails();
    } catch {
      console.error(
        "No se pudo procesar la cola de correos; los eventos permanecen guardados.",
      );
    }
  });
}
