import { db } from "@/lib/db";
import { quoteCart } from "@/lib/pricing-store";
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 20000)
      return Response.json(
        { error: "Carrito demasiado grande" },
        { status: 400 },
      );
    return Response.json(await quoteCart(db, JSON.parse(text).items), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && !("cause" in error)
            ? error.message
            : "No pudimos actualizar el carrito",
      },
      { status: 400 },
    );
  }
}
