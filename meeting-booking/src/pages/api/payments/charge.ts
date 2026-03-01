import type { APIRoute } from "astro";
import { chargePayment, PaymentError } from "../../../services/payment.service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const raw = await request.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    const body = (parsed ?? {}) as {
      amount?: number;
      currency?: "THB";
      method?: "card" | "promptpay" | "paypal";
      description?: string;
    };

    if (!body.amount || !body.currency || !body.method) {
      return json({ error: "INVALID_INPUT" }, 400);
    }

    const result = await chargePayment({
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      description: body.description,
    });

    return json({ ok: true, data: result }, 201);
  } catch (error) {
    if (error instanceof PaymentError) {
      return json({ error: error.code }, error.statusCode);
    }
    console.error(error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
};

