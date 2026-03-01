import type { APIRoute } from "astro";
import { completeCheckout, CheckoutError } from "../../../services/checkout.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (ctx) => {
  try {
    const raw = await ctx.request.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const body = (parsed ?? {}) as {
      holdId?: string;
      customerEmail?: string;
      customerName?: string;
      method?: "card" | "promptpay" | "paypal";
      amount?: number;
    };

    if (
      !body.holdId?.trim() ||
      !body.customerEmail?.trim() ||
      !body.customerName?.trim() ||
      !body.method ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return json({ error: "INVALID_INPUT" }, 400);
    }

    const result = await completeCheckout({
      holdId: body.holdId,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      method: body.method,
      amount: body.amount,
    });

    return json({ ok: true, data: result }, 201);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return json({ error: error.code }, error.statusCode);
    }
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};
