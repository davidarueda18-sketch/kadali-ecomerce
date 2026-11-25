"use client";
import { useActionState, useRef } from "react";
export type ActionState = { error?: string; success?: string };
export default function ActionForm({
  action,
  children,
  label = "Guardar cambios",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  label?: string;
}) {
  const lastResult = useRef<ActionState>({});
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, data: FormData) => {
      const result = await action(previous, data);
      lastResult.current = result;
      return result;
    },
    {},
  );
  return (
    <form
      action={formAction}
      onReset={(event) => {
        if (lastResult.current.error) event.preventDefault();
      }}
      className="space-y-4"
    >
      {children}
      <div aria-live="polite">
        {state.error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {state.success}
          </p>
        )}
      </div>
      <button
        disabled={pending}
        className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : label}
      </button>
    </form>
  );
}
