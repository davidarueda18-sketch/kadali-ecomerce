"use client";
import { useCart } from "@/lib/cart";
export default function CartNotice() {
  const { quote, quoteError } = useCart();
  return (
    <div aria-live="polite" className="my-4 space-y-2 text-sm">
      {quoteError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">
          {quoteError}
        </p>
      )}
      {quote?.preparationRequired && (
        <p className="rounded-xl border border-line bg-surface p-3">
          {quote.preparationMessage}
        </p>
      )}
    </div>
  );
}
